// this was just edited from the default express generated app
// because it is a quick'n'verydirty project…thing
var express = require('express')
  , path = require('path')
  , http = require('http')
  , fs = require('fs')
  , util = require('util')
  , wiki = require('./lib/wiki')
  , Player = require('./lib/Player')
  , WikiBattle = require('./lib/WikiBattle')
  , wikiPages = require('./pages.json') // array of page names that we can pick from
  , debug = require('debug')('WikiBattle:app')

function getRandom(arr) { return arr[Math.floor(arr.length * Math.random())] }

var app = express()
  , server = http.createServer(app)
  , io = require('socket.io')(server)

// `_pair` contains the most recently created game, which will be connected
// to by the next socket
var _pair = null
  , _games = {}

function newGame(player) {
  var origin = getRandom(wikiPages)
    , goal
    , game
  do { goal = getRandom(wikiPages) } while (goal === origin)
  var game = WikiBattle(io, origin, goal)
  game.connect(player)
  player.sock.emit('waiting')
  return game
}

io.on('connection', function (sock) {
  var game
    , player = Player(sock)

  sock.on('gameType', function (type, id, cb) {
    switch (type) {
      case 'pair':
        if (_pair) {
          game = _pair
          game.connect(player)
          _pair = null
          cb(null, game.id, player.id, 'start')
          game.start()
        }
        else {
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
        }
        else {
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

// index page
app.get('/', function (req, res) {
  res.writeHead(200, { 'content-type': 'text/html' })
  fs.createReadStream('views/index.html').pipe(res)
})
// Wiki Article content
app.get('/wiki/:page', function (req, res) {
  wiki.get(req.params.page, function (err, body) {
    if (body) res.end(body.content)
    else throw err
  })
})

// seems overkill for 2 files :'
app.use(require('less-middleware')(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'public')))

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