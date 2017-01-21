const fs = require('fs')
const after = require('after')
const cheerio = require('cheerio')
const request = require('request')
const debug = require('debug')('WikiBattle:updater')

module.exports = WikiUpdater

const noop = () => {}

/**
 * Check if a cheerio element is a link to a Wikipedia article.
 */

function isWikiPageLink (el) {
  const href = el.attribs.href
  return href !== '/wiki/Main_Page' && /^\/wiki\//.test(href)
}

/**
 * Get the text content from a cheerio element.
 */

const getTextContent = (el) =>
  el.text().trim()

/**
 * Synchronizes data from Wikipedia.
 */

function WikiUpdater (opts) {
  if (!(this instanceof WikiUpdater)) return new WikiUpdater(opts)

  this.cssPath = opts.cssPath
  this.pagesPath = opts.pagesPath
  this.request = request.defaults({ baseUrl: 'https://en.wikipedia.org/' })
}

/**
 * Load CSS source from Wikipedia servers.
 */

WikiUpdater.prototype.loadCss = function (cb) {
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
  const qs = {
    debug: false,
    lang: 'en',
    modules,
    only: 'styles',
    skin: 'minerva'
  }

  this.request('/w/load.php', { qs }, (err, res, body) => {
    cb(err, body)
  })
}

/**
 * Load names of the current top 5000 most popular pages on Wikipedia.
 */

WikiUpdater.prototype.loadPages = function (cb) {
  debug('loading top wikipedia articles')

  this.request('/wiki/Wikipedia:Top_5000_pages', (err, res, body) => {
    if (err) return cb(err)

    const $ = cheerio.load(body)

    const pageNames = $('.wikitable td:nth-child(2) a')
      .toArray()
      .filter(isWikiPageLink)
      .map((el) => getTextContent($(el)))

    cb(null, pageNames)
  })
}

/**
 * Load and sync the WikiBattle CSS file with Wikipedia.
 */

WikiUpdater.prototype.updateCss = function (cb = noop) {
  this.loadCss((err, contents) => {
    if (err) return cb(err)

    debug('saving css')
    fs.writeFile(this.cssPath, contents, 'utf8', cb)
  })
}

/**
 * Load and sync the WikiBattle start/end pages pool with the top 5000 most
 * popular Wikipedia pages from the past week.
 */

WikiUpdater.prototype.updatePages = function (cb = noop) {
  this.loadPages((err, pageNames) => {
    if (err) return cb(err)

    debug('saving pages')
    fs.writeFile(this.pagesPath, JSON.stringify(pageNames), 'utf8', cb)
  })
}

/**
 * Sync CSS and articles from Wikipedia.
 */

WikiUpdater.prototype.update = function (cb = noop) {
  cb = after(2, cb)

  this.updateCss(cb)
  this.updatePages(cb)
}
