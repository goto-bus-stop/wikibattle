const SocketEvents = require('ws-events')
const Player = require('./Player')

module.exports = SocketHandler

function SocketHandler (ws, matchMaker) {
  if (!(this instanceof SocketHandler)) return new SocketHandler(ws, matchMaker)

  this.ws = ws
  this.matchMaker = matchMaker

  this.handler = this.onConnection.bind(this)
}

SocketHandler.prototype.onConnection = function (raw) {
  let game
  const sock = SocketEvents(raw)
  const player = Player(sock)

  sock.on('gameType', (type, id) => {
    switch (type) {
      case 'pair':
        game = this.matchMaker.pair(player)
        break
      case 'new':
        game = this.matchMaker.new(player)
        break
      case 'join':
        try {
          game = this.matchMaker.join(player, id)
        } catch (e) {
          sock.emit('error', e.message)
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

      this.matchMaker.disconnected(game)
    }
  })
}

SocketHandler.prototype.start = function () {
  this.ws.on('connection', this.handler)
}

SocketHandler.prototype.close = function () {
  this.ws.removeListener('connection', this.handler)
}
