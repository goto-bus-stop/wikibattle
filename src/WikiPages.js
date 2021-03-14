const fs = require('fs')
const EventEmitter = require('events')
const event = require('p-event')
const ms = require('ms')
const getRandom = require('random-item')
const debug = require('debug')('WikiBattle:pages')
const qs = require('querystring')
const fetch = require('make-fetch-happen')

/**
 * Possible starting and goal wikipedia articles manager.
 */

module.exports = class WikiPages extends EventEmitter {
  constructor (filename) {
    super()

    this.pages = null
    this.filename = filename

    try { this.load() } catch (err) {
      const fd = fs.openSync(this.filename, 'a')
      fs.closeSync(fd)
    }
    this.startWatching()
  }

  /**
   * Load article titles from the pages file.
   */

  load () {
    debug('Loading pages')
    const json = fs.readFileSync(this.filename, 'utf8')
    this.pages = JSON.parse(json)
    this.emit('loaded')
  }

  /**
   * Begin watching the pages file, and reload when it changes.
   */

  startWatching () {
    fs.watch(this.filename, () => {
      setTimeout(() => {
        debug('Reloading pages')
        this.load()
      }, ms('2 seconds'))
    })
  }

  /**
   * Get a random article name.
   */

  random () {
    return getRandom(this.pages)
  }

  async translate (article, language) {
    if (language === 'en') return article

    const query = qs.stringify({
      action: 'query',
      format: 'json',
      prop: 'langlinks',
      titles: this.title,
      lllang: language
    })

    const response = await fetch(`https://en.wikipedia.org/w/api.php?${query}`)
    const body = await response.json()
    const langlink = Object.values(body.query.pages)[0].langlinks

    return langlink ? langlink[0]['*'] : null
  }

  /**
   * Get a pair of random article names, guaranteed to be two different pages.
   */

  async randomPair (language) {
    let one = null
    let two = null

    while (!(one && two)) {
      one = one || await this.translate(this.random(), language)
      two = two || await this.translate(this.random(), language)
    }

    while (one === two) {
      two = await this.translate(this.random(), language)
    }

    return [one, two]
  }

  /**
   * Wait for the pages list to be available.
   */

  async ready () {
    if (!Array.isArray(this.pages)) {
      await event(this, 'loaded')
    }
  }
}
