var $id = 0

module.exports = Player

/**
 * Manages one Player's socket. (i.e. Sends events and stores state.)
 * @param {SocketEvents} sock A WebSocket events wrapper.
 */
function Player (sock) {
  if (!(this instanceof Player)) return new Player(sock)
  this.id = ++$id
  this.sock = sock
  this.path = []
  this.connected = true
}

/**
 * Get the name of the article that the Player is currently viewing.
 */

Player.prototype.current = function () {
  const current = this.path[this.path.length - 1]
  return current ? current.page : undefined
}

/**
 * Navigate to the next article.
 */

Player.prototype.navigateTo = function (article) {
  this.path.push({ page: article, time: Date.now() })
}

/**
 * Notify this player of a win.
 */

Player.prototype.win = function () {
  this.sock && this.sock.emit('won')
}

/**
 * Notify this player of a loss.
 */

Player.prototype.lose = function () {
  this.sock && this.sock.emit('lost')
}

/**
 * Disconnect this player from the socket.
 */

Player.prototype.disconnect = function () {
  if (this.sock) {
    this.connected = false
    this.sock.close()
    this.sock = null
  }
}

/**
 * Notify this player that they have joined a game.
 */

Player.prototype.notifyJoinedGame = function (game) {
  this.sock && this.sock.emit('game', game.id, this.id)
}

/**
 * Notify this player that another player has joined.
 */

Player.prototype.notifyConnect = function (player) {
  this.sock && this.sock.emit('connection', player.id)
}

/**
 * Notify this player that another player's scroll position changed.
 */

Player.prototype.notifyScroll = function (player, top, width) {
  this.sock && this.sock.emit('scrolled', player.id, top, width)
}

/**
 * Notify this player that another player has disconnected.
 */

Player.prototype.notifyDisconnect = function (player) {
  this.sock && this.sock.emit('disconnection', player.id)
}
