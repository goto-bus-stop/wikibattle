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

Player.prototype.current = function () {
  const current = this.path[this.path.length - 1]
  return current ? current.page : undefined
}

Player.prototype.navigateTo = function (article) {
  this.path.push({ page: article, time: Date.now() })
}

Player.prototype.win = function () {
  this.sock && this.sock.emit('won')
}

Player.prototype.lose = function () {
  this.sock && this.sock.emit('lost')
}

Player.prototype.disconnect = function () {
  if (this.sock) {
    this.connected = false
    this.sock.close()
    this.sock = null
  }
}

Player.prototype.notifyConnect = function (player) {
  this.sock && this.sock.emit('connection', player.id)
}

Player.prototype.notifyScroll = function (player, top, width) {
  this.sock && this.sock.emit('scrolled', player.id, top, width)
}

Player.prototype.notifyDisconnect = function (player) {
  this.sock && this.sock.emit('disconnection', player.id)
}
