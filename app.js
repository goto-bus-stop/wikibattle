// this was just edited from the default express generated app
// because it is a quick'n'verydirty project…thing
var express = require('express')
var path = require('path')
var http = require('http')
var getRandom = require('random-item')
var wiki = require('./lib/wiki')
var Player = require('./lib/Player')
var WikiBattle = require('./lib/WikiBattle')
var wikiPages = require('./pages.json') // array of page names that we can pick from
var debug = require('debug')('WikiBattle:app')

var app = express()
var server = http.createServer(app)
var io = require('socket.io')(server, { serveClient: false })

// `_pair` contains the most recently created game, which will be connected
// to by the next socket
var _pair = null
var _games = {}

function newGame (player) {
  var origin = getRandom(wikiPages)
  var goal
  do { goal = getRandom(wikiPages) } while (goal === origin)
  var game = WikiBattle(io, origin, goal)
  game.connect(player)
  return game
}

io.on('connection', function (sock) {
  var game
  var player = Player(sock)

  sock.on('gameType', function (type, id, cb) {
    switch (type) {
      case 'pair':
        if (_pair) {
          game = _pair
          game.connect(player)
          _pair = null
          cb(null, game.id, player.id, 'start')
          game.start()
        } else {
          _pair = game = newGame(player)
          cb(null, game.id, player.id, 'wait')
        }
        break
      case 'new':
        game = newGame(player)
        _games[game.id] = game
        cb(null, game.id, player.id, 'wait')
        break
      case 'join':
        if (id in _games) {
          game = _games[id]
          game.connect(player)
          delete _games[id]
          cb(null, game.id, player.id, 'start')
          game.start()
        } else {
          cb('nonexistent game id')
          sock.disconnect()
        }
        break
      default:
        cb('invalid game type')
        sock.disconnect()
        break
    }
  })

  sock.on('navigate', function (to) {
    game.navigate(player, decodeURIComponent(to))
  })

  sock.on('scroll', function (top, areaWidth) {
    if (typeof top === 'number') {
      game.notifyScroll(player, top, areaWidth)
    }
  })

  sock.on('disconnect', function () {
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
app.use(express.static(path.join(__dirname, 'public')))

// Wiki Article content
app.get('/wiki/:page', function (req, res) {
  wiki.get(req.params.page, function (err, body) {
    if (body) res.end(body.content)
    else throw err
  })
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handlers
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.writeHead(err.status || 500, { 'content-type': 'text/html' })
    res.write('<h1>' + err.message + '</h1>')
    res.write('<h2>' + err.status + '</h2>')
    res.write('<pre>' + err.stack + '</pre>')
    res.end()
  })
}

// production error handler
app.use(function (err, req, res, next) {
  res.writeHead(err.status || 500, { 'content-type': 'text/html' })
  res.write('<h1>' + err.message + '</h1>')
  res.write('<h2>' + err.status + '</h2>')
  res.end()
})

app.set('port', process.env.PORT || 3000)

server.listen(app.get('port'), function () {
  debug('Express server listening on port ' + server.address().port)
})
