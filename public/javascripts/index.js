import bus from 'bus'
import classes from 'component-classes'
import empty from 'empty-element'
import render from 'crel'
import throttle from 'throttleit'
import io from 'socket.io-client'

import loadPage from './load-page'

import pageTitle from './views/page-title'
import gameLink from './views/game-link'
import hint from './views/hint'
import backlinks from './views/backlinks'
import backlinksToggle from './views/backlinks-toggle'
import playerMask from './views/player-mask'

var sock

var currentGoal
  , header = document.querySelector('#main-head')
  , goButton = document.querySelector('#go')
  , goPrivButton = document.querySelector('#go-priv')
  , _players = {}
  , me = Player(document.querySelector('#left'))
  , opponent = Player(document.querySelector('#right'))
  , game = {}
  , _private = false

function Player(el) {
  if (!(this instanceof Player)) return new Player(el)
  this.el = el
  var area = el.querySelector('.wb-article')
  this.area = area
  this.title = area.querySelector('.current-title')
  this.content = area.querySelector('.content')
  this.path = []
}

Player.prototype.navigateTo = function (page, cb) {
  this.path.push(page)
  bus.emit('article-loading', { player: this, title: page })
  loadPage(page, function (e, body) {
    this.title.innerHTML = decodeURIComponent(page) + ' <small>(' + this.path.length + ' steps)</small>'
    this.content.innerHTML = body
    bus.emit('article-loaded', { player: this, title: page, body: body })
    this.area.scrollTop = 0
    if (cb) cb(e)
  }.bind(this))
}

goButton.addEventListener('click', go, false)
goPrivButton.addEventListener('click', goPriv, false)

if (location.hash.substr(0, 6) === '#game:') {
  document.querySelector('#game-id').innerHTML = location.hash.substr(1)
  document.querySelector('#friend').style.display = 'none'
  classes(document.body).add('invited')
}

function go() {
  me.content.addEventListener('click', onClick, false)
  me.area.addEventListener('mousewheel', throttle(onScroll, 50), false)
  opponent.content.addEventListener('click', preventDefault, false)
  opponent.content.addEventListener('mousewheel', preventDefault, false)

  render(document.body, hint())
  render(empty(header), pageTitle(me))
  render(document.querySelector('#main'), [
    gameLink(),
    backlinksToggle(),
    backlinks()
  ])

  sock = io.connect(location.protocol + '//' + location.hostname + ':' + location.port)
  sock.on('start', onStart)
  sock.on('navigated', onOpponentNavigated)
  sock.on('won', onWon)
  sock.on('lost', onLost)
  sock.on('paths', onReceivePaths)
  sock.on('scrolled', onOpponentScrolled)
  sock.on('hint', function (hintText) { bus.emit('hint', hintText) })
  sock.on('backlinks', onBacklinks)
  sock.on('id', function (id) { me.id = id, _players[id] = me })
  sock.on('connection', function (id) { opponent.id = id, _players[id] = opponent })

  var connectType = _private ? 'new' : 'pair'
    , connectId = null
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
    if (connectType !== 'pair') {
      location.hash = gameId
    }
    if (status === 'wait') {
      waiting()
    }
  })

  goButton.disabled = true
  goButton.removeEventListener('click', go)
  goPrivButton.disabled = true
  goPrivButton.removeEventListener('click', goPriv)
}
function goPriv() {
  _private = true
  go(true)
}

function restart() {
  // lol
  location.href = location.pathname
}

// WebSocket Events
function waiting() {
  me.title.innerHTML = 'Your Article'
  opponent.title.innerHTML = 'Opponent\'s Article'
  me.content.innerHTML = ''
  opponent.content.innerHTML = ''
  bus.emit('waiting-for-opponent')

  if (_private) {
    bus.emit('game-link', location.href)
  }
}

function onStart(from, goal) {
  render(me.area.parentNode, playerMask(me.id))
  render(opponent.area.parentNode, playerMask(opponent.id))

  bus.on('restart', restart)

  bus.emit('start', goal)

  currentGoal = goal
  location.hash = ''

  me.navigateTo(from)
}

function onBacklinks(e, backlinks) {
  if (e) throw e
  bus.emit('backlinks', backlinks)
}

function onOpponentNavigated(playerId, page, cb) {
  if (me.id !== playerId && page !== null) {
    opponent.navigateTo(page, cb)
  }
}
function onOpponentScrolled(id, top, width) {
  if (me.id !== id) {
    // very rough estimation of where the opponent will roughly be on their screen size
    // inaccurate as poop but it's only a gimmick anyway so it doesn't really matter
    _players[id].area.scrollTop = top * width / opponent.area.offsetWidth
  }
}

var reSimpleWiki = /^\/wiki\//
  , reIndexWiki = /^\/w\/index\.php\?title=(.*?)(?:&|$)/
  , reInvalidPages = /^(File|Template):/
function onClick(e) {
  var el = e.target
    , next, href
  while (el && el.tagName !== 'A' && el.tagName !== 'AREA') el = el.parentNode
  if (el) {
    e.preventDefault()
    href = el.getAttribute('href')
    if (reSimpleWiki.test(href)) {
      next = href.replace(reSimpleWiki, '')
    }
    else if (next = reIndexWiki.exec(href)) {
      next = next[1]
    }
    else {
      return
    }
    next = next.replace(/#.*?$/, '').replace(/_/g, ' ')
    if (reInvalidPages.test(next)) return
    sock.emit('navigate', next)
    me.navigateTo(next)
  }
}

function onScroll(e) {
  // timeout so we send the scrollTop *after* the scroll event instead of before
  setTimeout(function () {
    sock.emit('scroll', me.area.scrollTop, me.area.offsetWidth)
  }, 10)
}

function onWon() {
  bus.emit('game-over', me)
}
function onLost() {
  bus.emit('game-over', opponent)
}

function onReceivePaths(paths) {
  me.content.removeEventListener('click', onClick)
  me.content.addEventListener('click', preventDefault, false)

  bus.emit('paths', paths)

  sock.disconnect()
}

// other helpers that are half stolen and not really related to WikiBattle in any way
function preventDefault(e) { e.preventDefault() }
