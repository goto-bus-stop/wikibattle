/* global location, alert */

import bus from 'bus'
import classes from 'component-classes'
import empty from 'empty-element'
import render from 'crel'
import throttle from 'throttleit'
import io from 'socket.io-client'

import loadPage from './load-page'

import pageTitle from './views/page-title'
import startGameButton from './views/start-game-button'
import gameLink from './views/game-link'
import hint from './views/hint'
import backlinks from './views/backlinks'
import backlinksToggle from './views/backlinks-toggle'
import article from './views/article'
import playerMask from './views/player-mask'

let sock

const header = document.querySelector('#main-head')
const _players = {}
const me = Player(document.querySelector('#left'))
const opponent = Player(document.querySelector('#right'))
const game = {}
let _private = false

init()

function Player (el) {
  if (!(this instanceof Player)) return new Player(el)
  this.el = el
  this.path = []
}

Player.prototype.navigateTo = function (page, cb) {
  this.path.push(page)
  bus.emit('article-loading', { player: this, title: page })
  loadPage(page, (e, body) => {
    bus.emit('article-loaded', { player: this, title: page, body: body })
    if (cb) cb(e)
  })
}

function init () {
  if (location.hash.substr(0, 6) === '#game:') {
    document.querySelector('#game-id').innerHTML = location.hash.substr(1)
    document.querySelector('#friend').style.display = 'none'
    classes(document.body).add('invited')
  }

  let startGameWrapper = document.querySelector('#go')
  let startGamePrivateWrapper = document.querySelector('#go-priv')

  render(empty(startGameWrapper), startGameButton(false))
  render(empty(startGamePrivateWrapper), startGameButton(true))
  bus.on('connect', go)
}

function go (isPrivate) {
  _private = isPrivate

  bus.on('navigate', onNavigate)
  bus.on('scroll', throttle(onScroll, 50))
  bus.on('restart', restart)

  render(document.body, hint())
  render(empty(header), pageTitle(me))
  render(document.querySelector('#main'), [
    gameLink(),
    backlinksToggle(),
    backlinks()
  ])
  render(empty(me.el),
         [ article(me, true), playerMask(me) ])
  render(empty(opponent.el),
         [ article(opponent, false), playerMask(opponent) ])

  sock = io.connect(location.protocol + '//' + location.hostname + ':' + location.port)
  sock.on('start', onStart)
  sock.on('navigated', onNavigated)
  sock.on('won', onWon)
  sock.on('lost', onLost)
  sock.on('paths', onReceivePaths)
  sock.on('scrolled', onOpponentScrolled)
  sock.on('hint', hintText => { bus.emit('hint', hintText) })
  sock.on('backlinks', onBacklinks)
  sock.on('connection', id => {
    opponent.id = id
    _players[id] = opponent
  })

  let connectType = _private ? 'new' : 'pair'
  let connectId = null
  if (!_private && location.hash.substr(0, 6) === '#game:') {
    connectType = 'join'
    connectId = location.hash.substr(1)
  }
  sock.emit('gameType', connectType, connectId, function (err, gameId, playerId, status) {
    if (err) {
      alert(err)
      return
    }
    game.id = gameId
    me.id = playerId
    _players[playerId] = me
    if (connectType !== 'pair') {
      location.hash = gameId
    }
    if (status === 'wait') {
      waiting()
    }
  })
}

function onNavigated (next) {
  sock.emit('navigate', next)
}

function onScroll (top, width) {
  sock.emit('scroll', top, width)
}

function restart () {
  // lol
  location.href = location.pathname
}

// WebSocket Events
function waiting () {
  bus.emit('waiting-for-opponent')
  if (_private) {
    bus.emit('game-link', location.href)
  }
}

function onStart (from, goal) {
  bus.emit('start', goal)
  location.hash = ''
  me.navigateTo(from)
}

function onBacklinks (e, backlinks) {
  if (e) throw e
  bus.emit('backlinks', backlinks)
}

function onNavigated (playerId, page, cb) {
  if (_players[playerId] && page !== null) {
    _players[playerId].navigateTo(page, cb)
  }
}
function onOpponentScrolled (id, top, width) {
  bus.emit('article-scrolled', id, top, width)
}

function onWon () {
  bus.emit('game-over', me)
}
function onLost () {
  bus.emit('game-over', opponent)
}

function onReceivePaths (paths) {
  bus.emit('paths', paths)
  sock.disconnect()
}
