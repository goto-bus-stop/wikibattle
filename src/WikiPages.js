const fs = require('fs')
const ms = require('ms')
const newless = require('newless')
const getRandom = require('random-item')
const debug = require('debug')('WikiBattle:pages')

/**
 * Possible starting and goal wikipedia articles manager.
 */

module.exports = newless(class WikiPages {
  constructor (filename) {
    this.pages = null
    this.filename = filename

    this.load()
    this.startWatching()
  }

  /**
   * Load article titles from the pages file.
   */

  load () {
    debug('Loading pages')
    delete require.cache[this.filename]
    this.pages = require(this.filename)
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
})
