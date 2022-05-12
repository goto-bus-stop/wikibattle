import generateId from 'crypto-random-string'

export default class Player {
  /**
   * Manages one Player's socket. (i.e. Sends events and stores state.)
   * @param {SocketEvents} sock A WebSocket events wrapper.
   */
  constructor (sock) {
    this.id = generateId({ length: 7 })
    this.sock = sock
    this.path = []
    this.connected = true
  }

  /**
   * Get the name of the article that the Player is currently viewing.
   */

  current () {
    const current = this.path[this.path.length - 1]
    return current ? current.page : undefined
  }

  /**
   * Navigate to the next article.
   */

  navigateTo (article) {
    this.path.push({ page: article, time: Date.now() })
  }

  /**
   * Notify this player of a win.
   */

  win () {
    this.sock?.emit('won')
  }

  /**
   * Notify this player of a loss.
   */

  lose () {
    this.sock?.emit('lost')
  }

  /**
   * Disconnect this player from the socket.
   */

  disconnect () {
    this.connected = false
    this.sock?.close()
    this.sock = null
  }

  /**
   * Notify this player that they have joined a game.
   */

  notifyJoinedGame (game) {
    this.sock?.emit('game', game.id, this.id)
  }

  /**
   * Notify this player that another player has joined.
   */

  notifyConnect (player) {
    this.sock?.emit('connection', player.id)
  }

  /**
   * Notify this player that another player's scroll position changed.
   */

  notifyScroll (player, top, width) {
    this.sock?.emit('scrolled', player.id, top, width)
  }

  /**
   * Notify this player that another player has disconnected.
   */

  notifyDisconnect (player) {
    this.sock?.emit('disconnection', player.id)
  }
}
