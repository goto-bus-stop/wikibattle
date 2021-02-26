/* global location, alert, WebSocket */

const xhr = require('xhr')
const classes = require('component-classes')
const empty = require('empty-element')
const render = require('crel')
const throttle = require('throttleit')
const formatTimeAgo = require('s-ago')
const wsEvents = require('ws-events')
const Plausible = require('plausible-tracker').default
const bus = require('./bus')
const loadPage = require('./load-page')
const pageTitle = require('./views/page-title')
const startGameButton = require('./views/start-game-button')
const gameLink = require('./views/game-link')
const hint = require('./views/hint')
const backlinks = require('./views/backlinks')
const backlinksToggle = require('./views/backlinks-toggle')
const article = require('./views/article')
const playerMask = require('./views/player-mask')
const newless = (Class) => (...args) => new Class(...args)

let sock

const { trackEvent } = Plausible({
  domain: 'wikibattle.me'
})

bus.on('start', () => {
  trackEvent('start')
})
bus.on('navigate', (target) => {
  trackEvent('navigate', {
    props: { article: target }
  })
})

const Player = newless(class Player {
  constructor (el) {
    this.el = el
    this.path = []
  }

  navigateTo (page, cb) {
    this.path.push(page)
    bus.emit('article-loading', { player: this, title: page })
    loadPage(page, (e, body) => {
      bus.emit('article-loaded', { player: this, title: page, body: body })
      if (cb) cb(e)
    })
  }
})

const header = document.querySelector('#main-head')
const _players = {}
const me = Player(document.querySelector('#left'))
const opponent = Player(document.querySelector('#right'))
const game = {}
let _private = false

init()

function init () {
  if (location.hash.substr(0, 6) === '#game:') {
    document.querySelector('#game-id').innerHTML = location.hash.substr(1)
    document.querySelector('#friend').style.display = 'none'
    classes(document.body).add('invited')
  }

  loadRecentGames()

  const startGameWrapper = document.querySelector('#go')
  const startGamePrivateWrapper = document.querySelector('#go-priv')

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
  render(empty(me.el), [article(me, true), playerMask(me)])
  render(empty(opponent.el), [article(opponent, false), playerMask(opponent)])

  const protocol = location.protocol.replace(/^http/, 'ws')
  const { hostname, port } = location
  sock = wsEvents(
    new WebSocket(`${protocol}//${hostname}:${port}`)
  )

  sock.on('error', (error) => {
    alert(error)
  })

  sock.on('start', onStart)
  sock.on('navigated', onNavigated)
  sock.on('won', onWon)
  sock.on('lost', onLost)
  sock.on('paths', onReceivePaths)
  sock.on('scrolled', onOpponentScrolled)
  sock.on('hint', (hintText) => {
    bus.emit('hint', hintText)
  })
  sock.on('backlinks', onBacklinks)
  sock.on('connection', (id) => {
    opponent.id = id
    _players[id] = opponent
  })

  let connectType = _private ? 'new' : 'pair'
  let connectId = null
  if (!_private && location.hash.substr(0, 6) === '#game:') {
    connectType = 'join'
    connectId = location.hash.substr(6)
  }

  sock.on('game', (gameId, playerId) => {
    game.id = gameId
    me.id = playerId
    _players[playerId] = me

    if (connectType !== 'pair') {
      location.hash = `#game:${gameId}`
    }

    waiting()
  })

  sock.emit('gameType', connectType, connectId)
}

function onNavigate (next) {
  sock.emit('navigate', next)
}

function onScroll ({ scroll, width }) {
  sock.emit('scroll', scroll, width)
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
  bus.emit('article-scrolled', { id, top, width })
}

function onWon () {
  bus.emit('game-over', me)
}
function onLost () {
  bus.emit('game-over', opponent)
}

function onReceivePaths (paths) {
  bus.emit('paths', paths)
  sock.close()
}

function GameRow ({ origin, goal, startedAt }) {
  function wikiLink (article) {
    return render('a', { href: `https://en.wikipedia.org/wiki/${encodeURIComponent(article)}` }, [article])
  }

  this.el = render('li', [
    `${wikiLink(origin)} → ${wikiLink(goal)} `,
    render('small', `(${formatTimeAgo(new Date(startedAt))})`)
  ])
}

function gameRow (game) {
  return new GameRow(game).el
}

function loadRecentGames () {
  xhr('/recent', (err, response) => {
    if (err) return null
    const recent = JSON.parse(response.body)
    render(empty(document.querySelector('#recent-games')),
      recent.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)).map(gameRow)
    )
  })
}
