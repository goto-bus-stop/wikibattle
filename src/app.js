const express = require('express')
const compression = require('compression')
const serveStatic = require('serve-static')
const fs = require('fs')
const path = require('path')
const http = require('http')
const getRandom = require('random-item')
const debug = require('debug')('WikiBattle:app')

const wiki = require('./wiki')
const Player = require('./Player')
const WikiBattle = require('./WikiBattle')
const SocketEvents = require('./SocketEvents')
const WikiPages = require('./WikiPages')

const PAGES_FILE = require.resolve('../pages.json')

const app = express()
const server = http.createServer(app)
const { Server } = require('ws')
const ws = new Server({ server })

app.use(compression())

const wikiPages = WikiPages(PAGES_FILE)

// `_pair` contains the most recently created game, which will be connected
// to by the next socket
let _pair = null
const _games = {}

function newGame (player) {
  const [origin, goal] = wikiPages.randomPair()
  const game = WikiBattle(origin, goal)
  game.connect(player)
  return game
}

ws.on('connection', (raw) => {
  let game
  const sock = SocketEvents(raw)
  const player = Player(sock)

  sock.on('gameType', (type, id) => {
    switch (type) {
      case 'pair':
        debug('gameType', type, id, !!_pair)
        if (_pair) {
          game = _pair
          game.connect(player)
          _pair = null
          sock.emit('game', game.id, player.id)
          game.start()
        } else {
          _pair = game = newGame(player)
          sock.emit('game', game.id, player.id)
        }
        break
      case 'new':
        game = newGame(player)
        _games[game.id] = game
        sock.emit('game', game.id, player.id)
        break
      case 'join':
        if (id in _games) {
          game = _games[id]
          game.connect(player)
          delete _games[id]
          sock.emit('game', game.id, player.id)
          game.start()
        } else {
          sock.emit('error', 'nonexistent game id')
          sock.close()
        }
        break
      default:
        sock.emit('error', 'invalid game type')
        sock.close()
        break
    }
  })

  sock.on('navigate', (to) => {
    game.navigate(player, decodeURIComponent(to))
  })

  sock.on('scroll', (top, areaWidth) => {
    if (typeof top === 'number') {
      game.notifyScroll(player, top, areaWidth)
    }
  })

  raw.on('close', () => {
    if (game) {
      game.disconnect(player)
      // if this socket disconnected before finding an opponent,
      // clear the "Waiting" game again
      if (game === _pair) _pair = null
      if (_games[game.id]) delete _games[game.id]
    }
  })
})

// index page + css + js
app.use(serveStatic(path.join(__dirname, '../public')))

// Wiki Article content
app.get('/wiki/:page', (req, res) => {
  wiki.get(req.params.page, (err, body) => {
    if (body) res.end(body.content)
    else throw err
  })
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.writeHead(err.status || 500, { 'content-type': 'text/html' })
    res.write(`<h1>${err.message}</h1>`)
    res.write(`<h2>${err.status}</h2>`)
    res.write(`<pre>${err.stack}</pre>`)
    res.end()
  })
}

// production error handler
app.use((err, req, res, next) => {
  res.writeHead(err.status || 500, { 'content-type': 'text/html' })
  res.write(`<h1>${err.message}</h1>`)
  res.write(`<h2>${err.status}</h2>`)
  res.end()
})

app.set('port', process.env.PORT || 3000)

server.listen(app.get('port'), () => {
  debug(`Express server listening on port ${server.address().port}`)
})
