var request = require('request')
var debug = require('debug')('WikiBattle:wiki-api')
var cheerio = require('cheerio')
var fs = require('fs')
var path = require('path')
var JSONStream = require('JSONStream')
var map = require('map-async')
var each = require('each-async')

var HINT_LENGTH = 200 // characters
var BACKLINKS_LIMIT = 25 // amount of backlinks to retrieve
var CACHE_LOCATION = '/tmp/WikiBattle/'
var CACHE_MAX = 1000 // articles

var wikiBattleHeaders = { 'user-agent': 'WikiBattle/1.0 (http://wikibattle.me/, rene@kooi.me)' }

function WikiPage (title, content, links) {
  if (!(this instanceof WikiPage)) return new WikiPage(title, content, links)
  this.title = title
  this.content = content
  this.links = links
}

WikiPage.prototype.getLinks = function () {
  return this.links
    .filter(function (link) { return link['ns'] === 0 && 'exists' in link })
    .map(function (link) { return link['*'] })
}

WikiPage.prototype.linksTo = function (target) {
  target = target.replace(/\s/g, '_')
  return this.getLinks()
    .some(function (link) { return link.replace(/\s/g, '_') === target })
}

WikiPage.prototype.getHint = function () {
  try {
    var hint = cheerio(this.content).filter('p').first().text()
    return hint.length > HINT_LENGTH ? hint.substr(0, HINT_LENGTH) + '&hellip;'
                                     : hint
  } catch (e) {
    return '(Could not load hint: [' + e.message + '])'
  }
}

WikiPage.prototype.getBacklinks = function (cb) {
  request({
    uri: 'https://en.wikipedia.org/w/api.php',
    qs: { action: 'query',
          format: 'json',
          list: 'backlinks',
          bltitle: this.title,
          blfilterredir: 'all',
          blnamespace: 0,
          bllimit: BACKLINKS_LIMIT },
    headers: wikiBattleHeaders
  }, function (err, _, body) {
    if (err) return cb(err)
    body = JSON.parse(body)
    cb(null, body.query.backlinks.map(function (l) { return l.title }))
  })
}

fs.mkdir(CACHE_LOCATION, function (e) { /* ignore error, badass! */ })
var _waiting = {}
function getPage (title, realCb) {
  // if we're already fetching this page, don't start a new request
  if (_waiting[title]) {
    _waiting[title].push(realCb)
    return
  }
  _waiting[title] = [ realCb ]
  var cb = function (e, page) {
    _waiting[title].forEach(function (cb) { cb(e, page) })
    delete _waiting[title]
  }

  // check if this page is in the cache
  var cacheFile = CACHE_LOCATION + encodeURIComponent(title.toLowerCase().replace(/ /g, '_')) + '.html'
  fs.stat(cacheFile, function (e, stat) {
    if (e) return fetch()
    fs.readFile(cacheFile, { encoding: 'utf8' }, function (e, content) {
      if (e) return fetch()
      var eol = content.indexOf('\n')
      var firstLine = content.substr(0, eol)
      var body = content.substr(eol)
      cb(null, WikiPage(title, body, JSON.parse(firstLine)))
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
      .on('data', function (parse) {
        fs.writeFile(cacheFile,
                     JSON.stringify({ links: parse.links }) + '\n' + parse.text['*'],
                     function () { debug('cached', title) })
        cb(null, WikiPage(title, parse.text['*'], parse.links))
      })
  }

  // TODO clean cache sometimes
  cleanCache()
}

function cleanCache () {
  fs.readdir(CACHE_LOCATION, function (e, files) {
    if (files.length < CACHE_MAX) {
      return
    }
    map(files, function (file, i, next) {
      file = path.join(CACHE_LOCATION, file)
      fs.stat(file, function (e, stat) {
        next(e, stat ? { file: file, atime: stat.atime } : null)
      })
    }, function (e, stats) {
      stats.sort(function (a, b) { return b.atime - a.atime })
      var removals = stats.slice(Math.floor(CACHE_MAX * 0.75))
      each(removals, function (file, i, next) {
        fs.unlink(file.file, function () { next() })
      })
    })
  })
}

exports.get = getPage
exports.WikiPage = WikiPage
