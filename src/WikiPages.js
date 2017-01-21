const fs = require('fs')
const ms = require('ms')
const getRandom = require('random-item')
const debug = require('debug')('WikiBattle:pages')

module.exports = WikiPages

function WikiPages (filename) {
  if (!(this instanceof WikiPages)) return new WikiPages(filename)

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
    setTimeout(() => {
      debug('Reloading pages')
      this.load()
    }, ms('2 seconds'))
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
