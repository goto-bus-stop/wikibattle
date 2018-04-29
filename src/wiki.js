const qs = require('querystring')
const makeFetch = require('make-fetch-happen')
const debug = require('debug')('WikiBattle:wiki-api')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const newless = require('newless')
const JSONStream = require('JSONStream')
const map = require('map-async')
const each = require('each-async')
const pkg = require('../package.json')

const HINT_LENGTH = 200 // characters
const BACKLINKS_LIMIT = 25 // amount of backlinks to retrieve
const CACHE_LOCATION = '/tmp/WikiBattle/'

const fetch = makeFetch.defaults({
  cacheManager: CACHE_LOCATION,
  headers: {
    'user-agent': `${pkg.name}/${pkg.version} (http://wikibattle.me/, renee@kooi.me)`
  }
})

/**
 * Represents a wikipedia article page.
 */

const WikiPage = newless(class WikiPage {
  constructor (title, content, links) {
    this.title = title
    this.content = content
    this.links = links
  }

  /**
   * Get a list of articles that are linked from this one.
   */

  getLinks () {
    return this.links
      .filter((link) => link['ns'] === 0 && 'exists' in link)
      .map((link) => link['*'])
  }

  /**
   * Check if this article links to a given target article.
   */

  linksTo (target) {
    target = target.replace(/\s/g, '_')
    return this.getLinks()
      .some((link) => link.replace(/\s/g, '_') === target)
  }

  /**
   * Extract a short hint text from the article content.
   */

  getHint () {
    try {
      const hint = cheerio('p', this.content).first().text()
      return hint.length > HINT_LENGTH
        ? `${hint.substr(0, HINT_LENGTH)}…`
        : hint
    } catch (e) {
      return `(Could not load hint: [${e.message}])`
    }
  }

  /**
   * Load article titles that link to this article.
   */

  async getBacklinks () {
    const query = qs.stringify({
      action: 'query',
      format: 'json',
      list: 'backlinks',
      bltitle: this.title,
      blfilterredir: 'all',
      blnamespace: 0,
      bllimit: BACKLINKS_LIMIT
    })

    const response = await fetch(`https://en.wikipedia.org/w/api.php?${query}`)
    const body = await response.json()
    return body.query.backlinks.map((l) => l.title)
  }
})

const pageRequests = new Map()

/**
 * Load a wikipedia page with metadata.
 */

async function getPage (title, cb) {
  // if we're already fetching this page, don't start a new request
  if (pageRequests.has(title)) return pageRequests.get(title)

  const promise = load()
  pageRequests.set(title, promise)

  try {
    return await promise
  } finally {
    pageRequests.delete(title)
  }

  async function load () {
    const query = qs.stringify({ action: 'parse', format: 'json', page: title.replace(/ /g, '_') })
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${query}`)
    const data = await response.json()
    return WikiPage(title, data.parse.text['*'], data.parse.links)
  }
}

exports.get = getPage
exports.WikiPage = WikiPage
