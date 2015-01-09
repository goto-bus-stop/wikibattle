var request = require('request')
  , Cache = require('async-cache')
  , debug = require('debug')('WikiBattle:wiki-api')

var HINT_LENGTH = 200 // characters
  , BACKLINKS_LIMIT = 25 // amount of backlinks to retrieve

var wikiBattleHeaders = { 'user-agent': 'WikiBattle/1.0 (http://wikibattle.me/, rene@kooi.me)' }

function WikiPage(content, links) {
  if (!(this instanceof WikiPage)) return new WikiPage(content, links)
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
  return this.getLinks().some(function (link) {
    return link.replace(/\s/g, '_') === target
  })
}

WikiPage.prototype.getHint = function () {
  var idx = 0
    , depth = 0
    , body = this.content
    , size = body.length
  if (body.substr(0, 3) !== '<p>') {
    idx = -1
    while (idx < size) {
      idx = body.indexOf('<', idx + 1)
      if (depth === 0 && body.substr(idx, 3) === '<p>') {
        break
      }
      if (body.substr(idx + 1, 3) === 'img' ||
          body.substr(idx + 1, 2) === 'br' ||
          body.substr(idx + 1, 2) === 'hr') {
        // ignore
      }
      else if (body[idx + 1] === '/') depth--
      else depth++
    }
  }
  var end = body.indexOf('</p>', idx)
  var hint = body.substr(idx + 3, end - idx - 3)
  // remove tags
  hint = hint.replace(/<(?:.|\n)*?>/gm, '')
  return hint.length > HINT_LENGTH ? hint.substr(0, HINT_LENGTH) + '&hellip;' : hint
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
      body = JSON.parse(body)
      cb(null, WikiPage(body.parse.text['*'], body.parse.links))
    })
  }
, length: function (articleBody) {
    return articleBody.length
  }
})

wiki.getBacklinks = function (page, cb) {
  request({
    uri: 'https://en.wikipedia.org/w/api.php'
  , qs: { action: 'query'
        , format: 'json'
        , list: 'backlinks'
        , bltitle: page
        , blfilterredir: 'all'
        , blnamespace: 0
        , bllimit: BACKLINKS_LIMIT }
  , headers: wikiBattleHeaders
  }, function (err, _, body) {
    if (err) return cb(err)
    console.log(body)
    body = JSON.parse(body)
    cb(null, body.query.backlinks.map(function (l) { return l.title }))
  })
}

wiki.WikiPage = WikiPage

module.exports = wiki