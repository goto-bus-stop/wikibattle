const express = require('express')
const compression = require('compression')
const serveStatic = require('serve-static')
const path = require('path')
const http = require('http')
const debug = require('debug')('WikiBattle:app')
const schedule = require('node-schedule').scheduleJob

const wiki = require('./wiki')
const WikiUpdater = require('./WikiUpdater')
const WikiPages = require('./WikiPages')
const MatchMaker = require('./MatchMaker')
const SocketHandler = require('./SocketHandler')

const CSS_FILE = path.join(__dirname, '../public/stylesheets/wiki.css')
const PAGES_FILE = path.join(__dirname, '../pages.json')

const app = express()
const server = http.createServer(app)
const WebSocketServer = require('ws').Server
const ws = new WebSocketServer({ server })

app.use(compression())

const updater = WikiUpdater({
  cssPath: CSS_FILE,
  pagesPath: PAGES_FILE
})
const wikiPages = WikiPages(PAGES_FILE)
const matchMaker = MatchMaker({
  pages: wikiPages
})

/**
 * Set up the WebSocket communications handler.
 */

const handler = SocketHandler(ws, matchMaker)
handler.start()

/**
 * Start the wikipedia article list updater.
 */

updater.update()
schedule('0 0 0 * * *', () => {
  updater.update((err) => {
    if (err) {
      console.error('Update failed:')
      console.error(err.stack)
    }
  })
})

/**
 * Serve the application.
 */

app.use(serveStatic(path.join(__dirname, '../public')))

/**
 * Serve proxied Wikipedia articles.
 */

app.get('/wiki/:page', (req, res) => {
  wiki.get(req.params.page, (err, body) => {
    if (body) res.end(body.content)
    else throw err
  })
})

/**
 * Handle errors.
 */

app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.writeHead(err.status || 500, { 'content-type': 'text/html' })
    res.write(`<h1>${err.message}</h1>`)
    res.write(`<h2>${err.status}</h2>`)
    res.write(`<pre>${err.stack}</pre>`)
    res.end()
  })
} else {
  app.use((err, req, res, next) => {
    res.writeHead(err.status || 500, { 'content-type': 'text/html' })
    res.write(`<h1>${err.message}</h1>`)
    res.write(`<h2>${err.status}</h2>`)
    res.end()
  })
}

/**
 * Run the server.
 */

app.set('port', process.env.PORT || 3000)

server.listen(app.get('port'), () => {
  debug(`Express server listening on port ${server.address().port}`)
})
