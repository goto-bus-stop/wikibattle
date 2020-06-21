const SocketEvents = require('ws-events')
const Player = require('./Player')

module.exports = class SocketHandler {
  constructor (ws, matchMaker) {
    this.ws = ws
    this.matchMaker = matchMaker

    this.handler = this.onConnection.bind(this)
  }

  onConnection (raw) {
    let game
    const sock = new SocketEvents(raw)
    const player = new Player(sock)

    sock.on('gameType', async (type, id) => {
      switch (type) {
        case 'pair':
          game = await this.matchMaker.pair(player)
          break
        case 'new':
          game = await this.matchMaker.new(player)
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

    raw.on('close', async () => {
      if (await game) {
        game.disconnect(player)

        this.matchMaker.disconnected(game)
      }
    })
  }

  start () {
    this.ws.on('connection', this.handler)
  }

  close () {
    this.ws.removeListener('connection', this.handler)
  }
}
