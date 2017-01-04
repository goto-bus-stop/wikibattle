const fs = require('fs')
const getRandom = require('random-item')
const debug = require('debug')('WikiBattle:pages')

const PAGES_FILE = require.resolve('../pages.json')

module.exports = WikiPages

function WikiPages (filename) {
  if (!(this instanceof WikiPages)) return new WikiPages()

  this.pages = null
  this.filename = filename

  this.load()
  this.startWatching()
}

WikiPages.prototype.load = function () {
  debug('Loading pages')
  delete require.cache[this.filename]
  this.pages = require(this.filename)
}

WikiPages.prototype.startWatching = function () {
  fs.watch(this.filename, () => {
    debug('Reloading pages')
    this.load()
  })
}

WikiPages.prototype.random = function () {
  return getRandom(this.pages)
}

WikiPages.prototype.randomPair = function () {
  const one = this.random()

  let two = this.random()
  while (one === two) {
    two = this.random()
  }

  return [one, two]
}
