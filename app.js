// this was just edited from the default express generated app
// because it is a quick'n'verydirty project…thing
var express = require('express')
  , path = require('path')
  , http = require('http')
  , wiki = require('./wiki')
  , wikiPages = require('./pages.json') // array of page names that we can pick from
  , debug = require('debug')('WikiBattle')

function getRandom(arr) { return arr[Math.floor(arr.length * Math.random())] }

var app = express()
  , server = http.createServer(app)
  , io = require('socket.io')(server)

// `pair` contains the most recently connected socket so we can… pair it with
// the next. Once an opponent is found (i.e. a new socket connects) this will
// be `null` again because there are no sockets waiting for opponents.
var pair = null
io.on('connection', function (sock) {
  var path = [] // path taken by this socket
    , opponent // opponent socket
    , opponentPath // path taken by opponent socket
    , origin, goal // Starting Article & Target Article

  if (pair) {
    opponent = pair.sock
    opponentPath = pair.path
    origin = pair.origin
    goal = pair.goal
    pair.opponent(sock, path)
    pair = null

    start()
  }
  else {
    origin = getRandom(wikiPages)
    do { goal = getRandom(wikiPages) } while (goal === origin)
    pair = { sock: sock, opponent: function (o, p) { opponent = o, opponentPath = p, start() }, origin: origin, goal: goal, path: path }
    sock.emit('waiting')
  }

  function start() {
    sock.emit('start', origin, goal)

    setTimeout(function () {
      wiki.getHint(goal, function (e, hint) { sock.emit('hint', hint) })
    }, 90 * 1000 /* 1:30 minutes */)
  }

  sock.on('navigate', function (to) {
    path.push({ page: to, time: Date.now() })
    opponent.emit('navigated', to)

    // lol maybe this needs some anti-cheat at some point so people don't just go
    // `sock.emit('navigate', currentGoal)` in their browser consoles
    // so insert imaginary `articleContainsLink(last(path), to)` here
    if (to === goal) {
      sock.emit('won', path, opponentPath)
      opponent.emit('lost', opponentPath, path)
    }
  })

  sock.on('scroll', function (top, areaWidth) {
    if (typeof top === 'number') {
      opponent.emit('scrolled', top, areaWidth)
    }
  })

  sock.on('disconnect', function () {
    // if this socket disconnected before finding an opponent,
    // clear the Waiting Socket again
    if (pair && pair.sock === sock) pair = null
    // else notify the opponent
    if (opponent) opponent.emit('disconnected')
  })
})

// view engine setup
// seems overkill :'
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hjs')

// seems overkill, too, for 2 files :'
app.use(require('less-middleware')(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, 'public')))

// index page
app.get('/', function (req, res) {
  res.render('index', { title: 'WikiBattle' })
})
// Wiki Article content
app.get('/wiki/:page', function (req, res) {
  wiki.get(req.params.page, function (err, body) {
    if (body) res.end(body)
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
    res.status(err.status || 500)
    res.render('error', {
      message: err.message,
      error: err
    })
  })
}

// production error handler
app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.render('error', {
    message: err.message,
    error: {}
  })
})

app.set('port', process.env.PORT || 3000)

server.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port)
})