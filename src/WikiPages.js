const fs = require('fs')
const ms = require('ms')
const getRandom = require('random-item')
const debug = require('debug')('WikiBattle:pages')

module.exports = WikiPages

/**
 * Possible starting and goal wikipedia articles manager.
 */

function WikiPages (filename) {
  if (!(this instanceof WikiPages)) return new WikiPages(filename)

  this.pages = null
  this.filename = filename

  this.load()
  this.startWatching()
}

/**
 * Load article titles from the pages file.
 */

WikiPages.prototype.load = function () {
  debug('Loading pages')
  delete require.cache[this.filename]
  this.pages = require(this.filename)
}

/**
 * Begin watching the pages file, and reload when it changes.
 */

WikiPages.prototype.startWatching = function () {
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

WikiPages.prototype.random = function () {
  return getRandom(this.pages)
}

/**
 * Get a pair of random article names, guaranteed to be two different pages.
 */

WikiPages.prototype.randomPair = function () {
  const one = this.random()

  let two = this.random()
  while (one === two) {
    two = this.random()
  }

  return [one, two]
}
