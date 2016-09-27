console.log('updating wiki assets & pages list')

var cheerio = require('cheerio')
var request = require('request')
var fs = require('fs')
var path = require('path')

var cssUrl = 'https://en.wikipedia.org/w/load.php?debug=false&lang=en&modules=site|ext.cite.styles|ext.gadget.DRN-wizard,ReferenceTooltips,charinsert,featured-articles-links,refToolbar,switcher,teahouse|ext.tmh.thumbnail.styles|ext.visualEditor.desktopArticleTarget.noscript|ext.wikimediaBadges|mediawiki.page.gallery.styles|mediawiki.ui.button,icon|skins.minerva.base.reset,styles|skins.minerva.content.styles|skins.minerva.icons.images|skins.minerva.tablet.styles|wikibase.client.init&only=styles&only=styles&skin=minerva'

dlCss()

function dlCss () {
  console.log('downloading css')
  request(cssUrl, function (e, _, body) {
    if (e) throw e
    fs.writeFile(path.join(__dirname, 'public/stylesheets/wiki.css'), body, function (e) {
      if (e) throw e
      console.log('downloaded css')
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
