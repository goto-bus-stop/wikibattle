import fs from 'fs'
import { EventEmitter, once } from 'events'
import ms from 'ms'
import getRandom from 'random-item'
import createDebug from 'debug'

const debug = createDebug('WikiBattle:pages')

/**
 * Possible starting and goal wikipedia articles manager.
 */

export default class WikiPages extends EventEmitter {
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
   * Wait for the pages list to be available.
   */

  async ready () {
    if (!Array.isArray(this.pages)) {
      await once(this, 'loaded')
    }
  }
}
