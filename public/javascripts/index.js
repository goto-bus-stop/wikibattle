var bus = require('bus')
var classes = require('component-classes')
var render = require('crel')
var throttle = require('throttleit')

var loadPage = require('./load-page')

var gameLink = require('./views/game-link')
var hint = require('./views/hint')
var backlinks = require('./views/backlinks')
var backlinksToggle = require('./views/backlinks-toggle')
var pathTaken = require('./views/path')

var sock

var currentGoal
  , targetTitle = document.querySelector('#target-title')
  , goButton = document.querySelector('#go')
  , goPrivButton = document.querySelector('#go-priv')
  , _players = {}
  , me = Player(document.querySelector('#left')
              , document.querySelector('#left-mask'))
  , opponent = Player(document.querySelector('#right')
                    , document.querySelector('#right-mask'))
  , game = {}
  , _private = false

function Player(area, mask) {
  if (!(this instanceof Player)) return new Player(area, mask)
  this.area = area
  this.mask = mask
  this.title = area.querySelector('.current-title')
  this.content = area.querySelector('.content')
  this.path = []
}

Player.prototype.navigateTo = function (page, cb) {
  var maskClass = classes(this.mask)
  maskClass.add('loading')
  this.path.push(page)
  loadPage(page, function (e, body) {
    this.title.innerHTML = decodeURIComponent(page) + ' <small>(' + this.path.length + ' steps)</small>'
    this.content.innerHTML = body
    maskClass.remove('loading')
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
  targetTitle.innerHTML = 'WikiBattle: Waiting for Opponent&hellip;'
  me.content.innerHTML = ''
  opponent.content.innerHTML = ''
  classes(me.mask).add('loading')
  classes(opponent.mask).add('loading')

  if (_private) {
    bus.emit('game-link', location.href)
  }
}

function onStart(from, goal) {
  render(me.mask, pathTaken(me.id))
  render(opponent.mask, pathTaken(opponent.id))

  bus.emit('start', goal)

  currentGoal = goal
  targetTitle.innerHTML = 'Target: ' + goal
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
  classes(me.mask).add('won')
  classes(opponent.mask).add('lost')
  targetTitle.innerHTML = 'WikiBattle: You won!'
}
function onLost() {
  classes(me.mask).add('lost')
  classes(opponent.mask).add('won')
  targetTitle.innerHTML = 'WikiBattle: You lost!'
}

function onReceivePaths(paths) {
  me.content.removeEventListener('click', onClick)
  me.content.addEventListener('click', preventDefault, false)

  bus.emit('paths', paths)

  sock.disconnect()

  var restartBt = document.createElement('button')
  restartBt.addEventListener('click', restart, false)
  restartBt.innerHTML = 'Another Run?'
  targetTitle.appendChild(restartBt)
}

// other helpers that are half stolen and not really related to WikiBattle in any way
function preventDefault(e) { e.preventDefault() }
