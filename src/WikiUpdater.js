const fs = require('fs')
const qs = require('querystring')
const after = require('after')
const cheerio = require('cheerio')
const fetch = require('make-fetch-happen')
const newless = require('newless')
const debug = require('debug')('WikiBattle:updater')

module.exports = (opts) => new WikiUpdater(opts)

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

const WikiUpdater = newless(class WikiUpdater {
  constructor (opts) {
    this.cssPath = opts.cssPath
    this.pagesPath = opts.pagesPath
  }

  /**
   * Load CSS source from Wikipedia servers.
   */

  loadCss (cb) {
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

    fetch(`https://en.wikipedia.org/w/load.php?${query}`)
      .then((response) => response.text())
      .then((body) => {
        cb(null, body)
      })
      .catch(cb)
  }

  /**
   * Load names of the current top 5000 most popular pages on Wikipedia.
   */

  loadPages (cb) {
    debug('loading top wikipedia articles')

    fetch('https://en.wikipedia.org/wiki/Wikipedia:Top_5000_pages')
      .then((response) => response.text())
      .then((body) => {
        const $ = cheerio.load(body)

        const pageNames = $('.wikitable td:nth-child(2) a')
          .toArray()
          .filter(isWikiPageLink)
          .map((el) => getTextContent($(el)))

        cb(null, pageNames)
      })
      .catch(cb)
  }

  /**
   * Load and sync the WikiBattle CSS file with Wikipedia.
   */

  updateCss (cb = noop) {
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

  updatePages (cb = noop) {
    this.loadPages((err, pageNames) => {
      if (err) return cb(err)

      debug('saving pages')
      fs.writeFile(this.pagesPath, JSON.stringify(pageNames), 'utf8', cb)
    })
  }

  /**
   * Sync CSS and articles from Wikipedia.
   */

  update (cb = noop) {
    cb = after(2, cb)

    this.updateCss(cb)
    this.updatePages(cb)
  }
})
