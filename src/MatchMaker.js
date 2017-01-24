const debug = require('debug')('WikiBattle:matchMaker')
const WikiBattle = require('./WikiBattle')

module.exports = MatchMaker

function MatchMaker (opts) {
  if (!(this instanceof MatchMaker)) return new MatchMaker(opts)

  this.waitingPair = null
  this.games = {}
  this.wikiPages = opts.pages
}

/**
 * Create a new game hosted by the given player.
 */

MatchMaker.prototype.createGame = function (player) {
  const [origin, goal] = this.wikiPages.randomPair()
  const game = WikiBattle(origin, goal)
  game.connect(player)
  return game
}

/**
 * Use paired matchmaking for a player. Puts the given player into a game with
 * either the previous, or the next player that is passed to this method.
 */

MatchMaker.prototype.pair = function (player) {
  if (this.waitingPair) {
    debug('pairing with existing')
    const game = this.waitingPair
    this.waitingPair = null

    game.connect(player)
    player.notifyJoinedGame(game)
    game.start()

    return game
  }

  debug('waiting for pairing')
  const game = this.createGame(player)
  this.waitingPair = game

  player.notifyJoinedGame(game)

  return game
}

/**
 * Host a new game using "private" matchmaking. The given player is put into
 * a new game, and waits for another player to join via the game's unique
 * shareable URL.
 */

MatchMaker.prototype.new = function (player) {
  debug('forcing new game')

  const game = this.createGame(player)
  this.games[game.id] = game

  player.notifyJoinedGame(game)

  return game
}

/**
 * Join a "private" game.
 */

MatchMaker.prototype.join = function (player, id) {
  if (!(id in this.games)) {
    throw new Error('nonexistent game id')
  }

  debug('joining', id)

  const game = this.games[id]
  game.connect(player)
  delete this.games[id]

  player.notifyJoinedGame(game)
  game.start()

  return game
}

/**
 * Notify the matchmaker that a game that was waiting for a second player has
 * stopped because the only remaining player disconnected.
 */

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
