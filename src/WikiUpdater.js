const fs = require('fs').promises
const qs = require('querystring')
const cheerio = require('cheerio')
const fetch = require('make-fetch-happen')
const debug = require('debug')('WikiBattle:updater')

/**
 * Check if a cheerio element is a link to a Wikipedia article.
 */

function isWikiPageLink (el) {
  const href = el.attribs.href.toLowerCase()
  return href !== '/wiki/main_page' && /^\/wiki\//.test(href)
}

/**
 * Check if a page name is "fun", and not likely to be offensive or triggering.
 *
 * This implementation just checks against a list of un-fun words so it's not very reliable, but hopefully picks out the most common cases.
 */

function isFunPageName (name) {
  const notFunWords = [
    'ethnic slur',
    'death',
    'murder',
    'chronic',
    // grape is ok
    '\\brape\\b'
  ]

  let pattern = '(?:'
  for (const word in notFunWords) {
    pattern += word + '|'
  }
  pattern = pattern.substr(0, pattern.length - 1) + ')'

  return !new RegExp(pattern, 'i').test(name)
}

/**
 * Get the text content from a cheerio element.
 */

const getTextContent = (el) =>
  el.text().trim()

/**
 * Synchronizes data from Wikipedia.
 */

module.exports = class WikiUpdater {
  constructor (opts) {
    this.cssPath = opts.cssPath
    this.pagesPath = opts.pagesPath
  }

  /**
   * Load CSS source from Wikipedia servers.
   */

  async loadCss () {
    debug('loading wikipedia css')

    const modules = [
      'site',
      'ext.cite.styles',
      'ext.gadget.DRN-wizard,ReferenceTooltips,charinsert,featured-articles-links,refToolbar,switcher,teahouse',
      'ext.tmh.thumbnail.styles',
      'ext.visualEditor.desktopArticleTarget.noscript',
      'ext.wikimediaBadges',
      'mediawiki.page.gallery.styles',
      'mediawiki.ui.button,icon',
      'skins.minerva.base.reset,styles',
      'skins.minerva.content.styles',
      'skins.minerva.icons.images',
      'skins.minerva.tablet.styles',
      'wikibase.client.init'
    ].join('|')
    const query = qs.stringify({
      debug: false,
      lang: 'en',
      modules,
      only: 'styles',
      skin: 'minerva'
    })

    const response = await fetch(`https://en.wikipedia.org/w/load.php?${query}`)
    return response.text()
  }

  /**
   * Load names of the current top 5000 most popular pages on Wikipedia.
   */

  async loadPages () {
    debug('loading top wikipedia articles')

    const response = await fetch('https://en.wikipedia.org/wiki/Wikipedia:Top_5000_pages')
    const body = await response.text()
    const $ = cheerio.load(body)

    const pageNames = $('.wikitable td:nth-child(2) a')
      .toArray()
      .filter(isWikiPageLink)
      .map((el) => getTextContent($(el)))
      .filter(isFunPageName)

    return pageNames
  }

  /**
   * Load and sync the WikiBattle CSS file with Wikipedia.
   */

  async updateCss () {
    const contents = await this.loadCss()

    debug('saving css')
    await fs.writeFile(this.cssPath, contents, 'utf8')
  }

  /**
   * Load and sync the WikiBattle start/end pages pool with the top 5000 most
   * popular Wikipedia pages from the past week.
   */

  async updatePages () {
    const pageNames = await this.loadPages()

    debug('saving pages')
    await fs.writeFile(this.pagesPath, JSON.stringify(pageNames), 'utf8')
  }

  /**
   * Sync CSS and articles from Wikipedia.
   */

  update () {
    return Promise.all([
      this.updateCss(),
      this.updatePages()
    ])
  }
}
