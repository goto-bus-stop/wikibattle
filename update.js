console.log('updating wiki assets & pages list')

var cheerio = require('cheerio')
var request = require('request')
var fs = require('fs')
var path = require('path')

var cssUrl = 'https://bits.wikimedia.org/en.wikipedia.org/load.php?debug=false&lang=en&modules=ext.gadget.DRN-wizard,ReferenceTooltips,charinsert,featured-articles-links,refToolbar,teahouse|ext.rtlcite,wikihiero|ext.uls.nojs|mediawiki.skinning.interface|mediawiki.ui.button|skins.vector.styles&only=styles&skin=vector&*'
var cssUrl2 = 'https://bits.wikimedia.org/en.wikipedia.org/load.php?debug=false&lang=en&modules=site&only=styles&skin=vector&*'

dlCss()

function dlCss () {
  console.log('downloading css 1/2')
  request(cssUrl, function (e, _, body) {
    if (e) throw e
    fs.writeFile(path.join(__dirname, 'public/stylesheets/wiki1.css'), body, function (e) {
      if (e) throw e
      console.log('downloaded css 1/2')
      dlCss2()
    })
  })
}
function dlCss2 () {
  console.log('downloading css 2/2')
  request(cssUrl2, function (e, _, body) {
    if (e) throw e
    fs.writeFile(path.join(__dirname, 'public/stylesheets/wiki2.css'), body, function (e) {
      if (e) throw e
      console.log('downloaded css 2/2')
      updatePages()
    })
  })
}

function updatePages () {
  console.log('updating pages')
  request('https://en.wikipedia.org/wiki/Wikipedia:Top_5000_pages', function (e, _, body) {
    if (e) throw e
    var $ = cheerio.load(body)

    var json = $('.wikitable td:nth-child(2) a')
      .toArray()
      .filter(function (e) {
        var href = e.attribs.href
        return href !== '/wiki/Main_Page' && /^\/wiki\//.test(href)
      })
      .map(function (e) { return $(e).text().trim() })

    fs.writeFile(path.join(__dirname, 'pages.json'), JSON.stringify(json), function (e) {
      if (e) throw e
      console.log('done')
    })
  })
}
