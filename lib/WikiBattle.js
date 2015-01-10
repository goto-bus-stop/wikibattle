var util = require('util')
  , wiki = require('./wiki')
  , debug = require('debug')('WikiBattle:WikiBattle')
  , EventEmitter = require('events').EventEmitter

var $id = 0
var HINT_TIMEOUT = 40 // seconds
var BACKLINKS_TIMEOUT = 90 // seconds

module.exports = WikiBattle

function WikiBattle(io, origin, goal) {
  if (!(this instanceof WikiBattle)) return new WikiBattle(io, origin, goal)
  EventEmitter.call(this)
  $id %= 2e15 // should be enough for anyone!
  this.id = 'game:' + (++$id)
  this.players = []
  this.origin = origin
  this.goal = goal
  this.io = io
}

WikiBattle.prototype.sock = function () {
  return this.io.in(this.id)
}

WikiBattle.prototype.connect = function (connectingPlayer) {
  connectingPlayer.sock.join(this.id)
  this.players.forEach(function (player) {
    player.notifyConnect(connectingPlayer)
    connectingPlayer.notifyConnect(player)
  })
  this.players.push(connectingPlayer)
  return this
}

WikiBattle.prototype.disconnect = function (disconnectingPlayer) {
  disconnectingPlayer.disconnect()
  this.navigate(disconnectingPlayer, null)

  var connected = this.players.filter(function (p) { return p.connected })
  connected.forEach(function (p) { p.notifyDisconnect(disconnectingPlayer) })
  if (connected.length === 1) {
    connected[0].win()
    this.end()
  }
}

WikiBattle.prototype.checkWin = function () {
  var goal = this.goal
  if (this.players.some(hasWon)) {
    this.players.forEach(function (p) { hasWon(p) ? p.win() : p.lose() })
    this.end()
  }

  function hasWon(p) { return p.current() === goal }
}

WikiBattle.prototype.navigate = function (player, to) {
  player.navigateTo(to)
  this.sock().emit('navigated', player.id, to)
  this.checkWin()
}

WikiBattle.prototype.sendHint = function () {
  var sock = this.sock()
  wiki.get(this.goal, function (e, page) {
    sock.emit('hint', e || page.getHint())
  })
}

WikiBattle.prototype.sendBacklinks = function () {
  var sock = this.sock()
  wiki.get(this.goal, function (e, page) {
    if (e) return sock.emit('backlinks', e)
    page.getBacklinks(function (e, back) {
      sock.emit('backlinks', e, back)
    })
  })
}

WikiBattle.prototype.sendPaths = function () {
  var paths = this.players.reduce(function (paths, p) { paths[p.id] = p.path; return paths }, {})
  this.sock().emit('paths', paths)
}

WikiBattle.prototype.start = function () {
  this.sock().emit('start', this.origin, this.goal)
  this.hintTimeout = setTimeout(this.sendHint.bind(this), HINT_TIMEOUT * 1000)
  this.backlinksTimeout = setTimeout(this.sendBacklinks.bind(this), BACKLINKS_TIMEOUT * 1000)
}

WikiBattle.prototype.end = function () {
  this.sendPaths()
  clearTimeout(this.hintTimeout)
  clearTimeout(this.backlinksTimeout)
}

WikiBattle.prototype.notifyScroll = function (player, top, width) {
  this.sock().emit('scrolled', player.id, top, width)
}