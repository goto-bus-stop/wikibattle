const debug = require('debug')('WikiBattle:matchMaker')
const WikiBattle = require('./WikiBattle')

module.exports = MatchMaker

function MatchMaker (opts) {
  if (!(this instanceof MatchMaker)) return new MatchMaker(opts)

  this.waitingPair = null
  this.games = {}
  this.wikiPages = opts.pages
}

MatchMaker.prototype.createGame = function (player) {
  const [origin, goal] = this.wikiPages.randomPair()
  const game = WikiBattle(origin, goal)
  game.connect(player)
  return game
}

MatchMaker.prototype.pair = function (player) {
  if (this.waitingPair) {
    debug('pairing with existing')
    const game = this.waitingPair
    this.waitingPair = null

    game.connect(player)
    player.sock.emit('game', game.id, player.id)
    game.start()

    return game
  }

  debug('waiting for pairing')
  const game = this.createGame(player)
  this.waitingPair = game

  player.sock.emit('game', game.id, player.id)

  return game
}

MatchMaker.prototype.new = function (player) {
  debug('forcing new game')

  const game = this.createGame(player)
  this.games[game.id] = game

  player.sock.emit('game', game.id, player.id)

  return game
}

MatchMaker.prototype.join = function (player, id) {
  if (!(id in this.games)) {
    throw new Error('nonexistent game id')
  }

  debug('joining', id)

  const game = this.games[id]
  game.connect(player)
  delete this.games[id]

  player.sock.emit('game', game.id, player.id)
  game.start()

  return game
}

MatchMaker.prototype.disconnected = function (game) {
  debug('removing', game.id)

  // if the player disconnected before finding an opponent,
  // clear the "Waiting" game
  if (game === this.waitingPair) {
    this.waitingPair = null
  }
  if (this.games[game.id]) {
    delete this.games[game.id]
  }
}
