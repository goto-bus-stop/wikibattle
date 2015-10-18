var bus = require('bus')
var classes = require('component-classes')
var render = require('crel')

var path = require('./path')

module.exports = function (playerId) {
  return new PlayerMask(playerId).el
}

function PlayerMask(playerId) {
  this.setLoading = this.setLoading.bind(this)
  this.onArticleLoading = this.onArticleLoading.bind(this)
  this.onArticleLoaded = this.onArticleLoaded.bind(this)
  this.onGameStart = this.onGameStart.bind(this)
  this.onGameOver = this.onGameOver.bind(this)

  this.player = playerId

  this.el = render('div', { class: 'wb-mask hide' },
                   [ path(playerId) ])
  this.classes = classes(this.el)

  this.isLoading = false
  this.isGameOver = false

  bus.on('waiting-for-opponent', this.setLoading)
  bus.on('start', this.onGameStart)
  bus.on('article-loading', this.onArticleLoading)
  bus.on('article-loaded', this.onArticleLoaded)
  bus.on('game-over', this.onGameOver)
}

PlayerMask.prototype.show = function (link) {
  this.classes.remove('hide')
}

PlayerMask.prototype.hide = function () {
  this.classes.add('hide')
}

PlayerMask.prototype.maybeHide = function () {
  if (!this.isLoading && !this.isGameOver) {
    this.hide()
  }
}

PlayerMask.prototype.setLoading = function () {
  this.show()
  this.classes.add('loading')
  this.isLoading = true
}

PlayerMask.prototype.setNotLoading = function () {
  this.isLoading = false
  this.classes.remove('loading')
  this.maybeHide()
}

PlayerMask.prototype.onGameStart = function () {
  this.setNotLoading()
}

PlayerMask.prototype.onArticleLoading = function (e) {
  if (e.player.id === this.player) {
    this.setLoading()
  }
}

PlayerMask.prototype.onArticleLoaded = function (e) {
  if (e.player.id === this.player) {
    this.setNotLoading()
  }
}

PlayerMask.prototype.onGameOver = function (winner) {
  this.isGameOver = true
  if (winner.id === this.player) {
    this.classes.add('won')
  } else {
    this.classes.add('lost')
  }
  this.show()
}
