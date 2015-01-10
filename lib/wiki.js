var request = require('request')
  , Cache = require('async-cache')
  , debug = require('debug')('WikiBattle:wiki-api')
  , cheerio = require('cheerio')

var HINT_LENGTH = 200 // characters
  , BACKLINKS_LIMIT = 25 // amount of backlinks to retrieve

var wikiBattleHeaders = { 'user-agent': 'WikiBattle/1.0 (http://wikibattle.me/, rene@kooi.me)' }

function WikiPage(title, content, links) {
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
  }
  catch (e) {
    return '(Could not load hint: [' + e.message + '])'
  }
}

WikiPage.prototype.getBacklinks = function (cb) {
  request({
    uri: 'https://en.wikipedia.org/w/api.php'
  , qs: { action: 'query'
        , format: 'json'
        , list: 'backlinks'
        , bltitle: this.title
        , blfilterredir: 'all'
        , blnamespace: 0
        , bllimit: BACKLINKS_LIMIT }
  , headers: wikiBattleHeaders
  }, function (err, _, body) {
    if (err) return cb(err)
    body = JSON.parse(body)
    cb(null, body.query.backlinks.map(function (l) { return l.title }))
  })
}

var wiki = new Cache({
  // hardcoded because ez
  max: 1024 * 1024 * 200 // 200MB should be enough for quite a few articles (several thousand…)
, maxAge: 1000 * 60 * 60 * 24 * 3 // 3 days because idk why
, load: function (title, cb) {
    debug('loading', title)
    request({
      uri: 'https://en.wikipedia.org/w/api.php'
    , qs: { action: 'parse', format: 'json', page: title.replace(/ /g, '_') }
    , headers: wikiBattleHeaders
    }, function (err, _, body) {
      if (err) return cb(err)
      debug('loaded', title)
      try {
        body = JSON.parse(body)
        cb(null, WikiPage(title, body.parse.text['*'], body.parse.links))
      }
      catch (err) { cb(err) }
    })
  }
, length: function (articleBody) { return articleBody.length }
})

wiki.WikiPage = WikiPage

module.exports = wiki