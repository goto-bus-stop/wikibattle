const request = require('request')
const debug = require('debug')('WikiBattle:wiki-api')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')
const JSONStream = require('JSONStream')
const map = require('map-async')
const each = require('each-async')
const inflight = require('inflight')

const HINT_LENGTH = 200 // characters
const BACKLINKS_LIMIT = 25 // amount of backlinks to retrieve
const CACHE_LOCATION = '/tmp/WikiBattle/'
const CACHE_MAX = 1000 // articles

const wikiBattleHeaders = { 'user-agent': 'WikiBattle/1.0 (http://wikibattle.me/, rene@kooi.me)' }

function WikiPage (title, content, links) {
  if (!(this instanceof WikiPage)) return new WikiPage(title, content, links)
  this.title = title
  this.content = content
  this.links = links
}

WikiPage.prototype.getLinks = function () {
  return this.links
    .filter((link) => link['ns'] === 0 && 'exists' in link)
    .map((link) => link['*'])
}

WikiPage.prototype.linksTo = function (target) {
  target = target.replace(/\s/g, '_')
  return this.getLinks()
    .some((link) => link.replace(/\s/g, '_') === target)
}

WikiPage.prototype.getHint = function () {
  try {
    const hint = cheerio(this.content).filter('p').first().text()
    return hint.length > HINT_LENGTH ? `${hint.substr(0, HINT_LENGTH)}…`
                                     : hint
  } catch (e) {
    return `(Could not load hint: [${e.message}])`
  }
}

WikiPage.prototype.getBacklinks = function (cb) {
  request({
    uri: 'https://en.wikipedia.org/w/api.php',
    qs: {
      action: 'query',
      format: 'json',
      list: 'backlinks',
      bltitle: this.title,
      blfilterredir: 'all',
      blnamespace: 0,
      bllimit: BACKLINKS_LIMIT
    },
    headers: wikiBattleHeaders
  }, (err, _, body) => {
    if (err) return cb(err)
    body = JSON.parse(body)
    cb(null, body.query.backlinks.map((l) => l.title))
  })
}

fs.mkdir(CACHE_LOCATION, (e) => { /* ignore error, badass! */ })

function getPage (title, realCb) {
  // if we're already fetching this page, don't start a new request
  var cb = inflight(title, realCb)
  if (!cb) return

  // check if this page is in the cache
  const basename = encodeURIComponent(title.toLowerCase().replace(/ /g, '_'))
  const cacheFile = `${CACHE_LOCATION}${basename}.html`
  fs.stat(cacheFile, (e, stat) => {
    if (e) return fetch()
    fs.readFile(cacheFile, { encoding: 'utf8' }, (e, content) => {
      if (e) return fetch()
      const eol = content.indexOf('\n')
      const firstLine = content.substr(0, eol)
      const body = content.substr(eol)
      cb(null, WikiPage(title, body, JSON.parse(firstLine).links))
    })
  })

  // actually fetch the page, for real
  function fetch () {
    request({
      uri: 'https://en.wikipedia.org/w/api.php',
      qs: { action: 'parse', format: 'json', page: title.replace(/ /g, '_') },
      headers: wikiBattleHeaders
    })
      .pipe(JSONStream.parse('parse'))
      .on('data', (parse) => {
        fs.writeFile(cacheFile,
                     JSON.stringify({ links: parse.links }) + '\n' + parse.text['*'],
                     () => { debug('cached', title) })
        cb(null, WikiPage(title, parse.text['*'], parse.links))
      })
  }

  cleanCache()
}

function cleanCache () {
  fs.readdir(CACHE_LOCATION, (e, files) => {
    if (files.length < CACHE_MAX) {
      return
    }
    map(files, (file, i, next) => {
      file = path.join(CACHE_LOCATION, file)
      fs.stat(file, (e, stat) => {
        next(e, stat ? { file: file, atime: stat.atime } : null)
      })
    }, (e, stats) => {
      stats.sort((a, b) => b.atime - a.atime)
      const removals = stats.slice(Math.floor(CACHE_MAX * 0.75))
      each(removals, (file, i, next) => {
        fs.unlink(file.file, () => { next() })
      })
    })
  })
}

exports.get = getPage
exports.WikiPage = WikiPage
