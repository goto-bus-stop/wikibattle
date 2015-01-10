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

WikiBattle.prototype.disconnect = function (player) {
  player.disconnect()
  this.navigate(player, null)
  var connectedPlayers = 0
  for (var i = 0, l = this.players.length; i < l; i++) {
    if (this.players[i].connected) {
      this.players[i].notifyDisconnect(player)
      connectedPlayers++
    }
  }
  if (connectedPlayers === 1) {
    for (i = 0, l = this.players.length; i < l; i++) {
      if (this.players[i].connected) {
        this.players[i].win()
        break
      }
    }
    this.end()
  }
}

WikiBattle.prototype.checkWin = function () {
  var losers = []
    , winner
  for (var i = 0, l = this.players.length; i < l; i++) {
    if (this.players[i].current() === this.goal) {
      winner = this.players[i]
    }
    else {
      losers.push(this.players[i])
    }
  }

  if (winner) {
    winner.win()
    losers.forEach(function (player) { player.lose() })
    this.end()
  }
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
  var paths = {}
  this.players.forEach(function (p) { paths[p.id] = p.path })
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