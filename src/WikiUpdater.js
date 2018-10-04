const fs = require('fs').promises
const qs = require('querystring')
const cheerio = require('cheerio')
const fetch = require('make-fetch-happen')
const newless = require('newless')
const debug = require('debug')('WikiBattle:updater')

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

module.exports = newless(class WikiUpdater {
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

    const response = await fetch(`https://no.wikipedia.org/w/load.php?${query}`)
    return response.text()
  }

  /**
   * Load names of the current top 5000 most popular pages on Wikipedia.
   */

  async loadPages () {
    debug('loading top wikipedia articles')
/*
    const response = await fetch('https://en.wikipedia.org/wiki/Wikipedia:Top_5000_pages')
    const body = await response.text()
    const $ = cheerio.load(body)



    const pageNames = $('.wikitable td:nth-child(2) a')
      .toArray()
      .filter(isWikiPageLink)
      .map((el) => getTextContent($(el)))
*/
    const pageNames = [
      'Minecraft',
      'League of Legends',
      'PlayerUnknown\'s Battlegrounds',
      'Overwatch (video game)',
      'Super Mario',
      'Pokémon',
      'Fortnite',
      'Tetris',
      'SingStar',
      'The Sims',
      'World of Warcraft',
      'Counter-Strike: Global Offensive',
      'Grand Theft Auto',
      'Mario Kart',
      'The Elder Scrolls V: Skyrim',
      'FIFA (video game series)',
      'Nintendogs',
      'Tamagotchi',
      'Spider-Man (2018 video game)',
      'Portal (video game)',
      'Super Smash Bros.',
      'Kirby (series)',
      'Civilization (series)',
      'Star Fox',
      'Metal Gear Solid',
      'Cuphead',
      'Undertale',
      'Horizon Zero Dawn',
      'Sonic the Hedgehog',
      'Assassin\'s Creed',
      'Splatoon',
      'Shovel Knight',
      'No Man\'s Sky',
      'Call of Duty',
      'Candy Crush Saga',
      'Stardew Valley',
      'Paper Mario',
      'Life Is Strange',
      'Rocket League',
      'Dance Dance Revolution',
      'Animal Crossing',
      'Hearthstone',
      'Five Nights at Freddy\'s',
      'Donkey Kong',
      'Rayman',
      'Pac-Man',
      'The Legend of Zelda',
      'Final Fantasy',
      'Doom (franchise)',
      'Duke Nukem'
    ];
//    console.log(pageNames)
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
})
