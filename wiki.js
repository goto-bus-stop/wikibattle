var request = require('request')
  , AsyncCache = require('async-cache')
  , debug = require('debug')('WikiBattle:wiki-api')

var wiki = new AsyncCache({
  // hardcoded because ez
  max: 1024 * 1024 * 200 // 200MB, probably enough for all 5k articles (~40k per article should be enough for anybody!)
, maxAge: 1000 * 60 * 60 * 24 * 3 // 3 days because idk why
, load: function (title, cb) {
    debug('loading', title)
    request({
      uri: 'https://en.wikipedia.org/w/api.php'
    , qs: { action: 'parse', format: 'json', page: title.replace(/ /g, '_') }
    , headers: { "user-agent": 'WikiBattle/1.0 (http://rene.kooi.me/WikiBattle, rene@kooi.me)' }
    }, function (err, _, body) {
      if (err) return cb(err)
      debug('loaded', title)
      body = JSON.parse(body)
      cb(null, body.parse.text['*'])
    })
  }
})

/**
 * @param {string} page
 * @param {function()} cb
 */
wiki.getHint = function (page, cb) {
  wiki.get(page, function (err, body) {
    if (err) return cb(err)
    var firstPara = body.match(/<p>(.*?)<\/p>/)
      , sanePara
    if (!firstPara) return cb('could not detect first paragraph')
    sanePara = firstPara[0].replace(/<(?:.|\n)*?>/gm, '')
    cb(null, sanePara.length > 200 ? sanePara.substr(0, 200) + '&hellip;' : sanePara)
  })
}

module.exports = wiki