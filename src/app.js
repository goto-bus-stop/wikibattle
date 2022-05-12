import express from 'express'
import compression from 'compression'
import serveStatic from 'serve-static'
import { fileURLToPath } from 'url'
import http from 'http'
import createDebug from 'debug'
import schedule from 'node-schedule'
import tmp from 'tmp'
import WebSocket from 'ws'
import * as wiki from './wiki.js'
import WikiUpdater from './WikiUpdater.js'
import WikiPages from './WikiPages.js'
import MatchMaker from './MatchMaker.js'
import SocketHandler from './SocketHandler.js'

const debug = createDebug('WikiBattle:app')

const CSS_FILE = new URL('../public/wiki.css', import.meta.url)
const PAGES_FILE = tmp.fileSync({
  discardDescriptor: true
}).name

const app = express()
const server = http.createServer(app)
const ws = new WebSocket.Server({ server })

app.use(compression())

const updater = new WikiUpdater({
  cssPath: CSS_FILE,
  pagesPath: PAGES_FILE
})
const wikiPages = new WikiPages(PAGES_FILE)
const matchMaker = new MatchMaker({
  pages: wikiPages
})

/**
 * Set up the WebSocket communications handler.
 */

const handler = new SocketHandler(ws, matchMaker)
handler.start()

/**
 * Start the wikipedia article list updater.
 */

updater.update()
schedule.scheduleJob('0 0 0 * * *', () => {
  updater.update().catch((err) => {
    if (err) {
      console.error('Update failed:')
      console.error(err.stack)
    }
  })
})

/**
 * Wait for pages list to be loaded before responding to requests.
 */

app.use(t(async (req, res, next) => {
  await wikiPages.ready()
  next()
}))

/**
 * Serve the application.
 */

function gameToJson ({ origin, goal, startedAt }) {
  return { origin, goal, startedAt }
}

app.get('/current', (req, res) => {
  res.json(matchMaker.getCurrentGames().map(gameToJson))
})
app.get('/recent', t(async (req, res) => {
  const recentGames = await matchMaker.getRecentGames()
  res.json(recentGames.map(gameToJson))
}))

app.use(serveStatic(fileURLToPath(new URL('../public', import.meta.url))))

/**
 * Serve proxied Wikipedia articles.
 */

app.get('/wiki/:page', t(async (req, res) => {
  const body = await wiki.get(req.params.page)
  res.end(body.content)
}))

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

debug('Waiting for wiki pages')
wikiPages.ready().then(() => {
  debug('Ready')
})

function t (middleware) {
  return (req, res, next) => {
    middleware(req, res, next).catch(next)
  }
}
