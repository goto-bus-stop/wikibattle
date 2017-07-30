const fs = require('fs')
const EventEmitter = require('events')
const ms = require('ms')
const newless = require('newless')
const getRandom = require('random-item')
const debug = require('debug')('WikiBattle:pages')

/**
 * Possible starting and goal wikipedia articles manager.
 */

module.exports = newless(class WikiPages extends EventEmitter {
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

  /**
   * Get a pair of random article names, guaranteed to be two different pages.
   */

  randomPair () {
    const one = this.random()

    let two = this.random()
    while (one === two) {
      two = this.random()
    }

    return [one, two]
  }

  /**
   * Execute `cb` when the pages list is available.
   */

  ready (cb) {
    if (Array.isArray(this.pages)) {
      cb()
    } else {
      this.once('loaded', cb)
    }
  }
})
