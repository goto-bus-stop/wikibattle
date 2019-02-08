const debug = require('debug')('WikiBattle:matchMaker')
const WikiBattle = require('./WikiBattle')

function limitedArray (max) {
  const array = []
  array.push = (...args) => {
    Array.prototype.push.apply(array, args)
    while (array.length > max) array.shift()
    return array.length
  }
  return array
}

module.exports = class MatchMaker {
  constructor (opts) {
    this.waitingPair = null
    this.games = {}
    this.wikiPages = opts.pages
    this.history = limitedArray(20)
  }

  /**
   * Create a new game hosted by the given player.
   */

  createGame (player) {
    const [origin, goal] = this.wikiPages.randomPair()
    const game = new WikiBattle(origin, goal)
    game.connect(player)
    return game
  }

  /**
   * Use paired matchmaking for a player. Puts the given player into a game with
   * either the previous, or the next player that is passed to this method.
   */

  pair (player) {
    if (this.waitingPair) {
      debug('pairing with existing')
      const game = this.waitingPair
      this.waitingPair = null

      game.connect(player)
      this.history.push(game)

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

  new (player) {
    debug('forcing new game')

    const game = this.createGame(player)
    this.games[game.id] = game

    player.notifyJoinedGame(game)

    return game
  }

  /**
   * Join a "private" game.
   */

  join (player, id) {
    if (!(id in this.games)) {
      throw new Error('nonexistent game id')
    }

    debug('joining', id)

    const game = this.games[id]
    game.connect(player)
    this.history.push(game)
    delete this.games[id]

    player.notifyJoinedGame(game)
    game.start()

    return game
  }

  /**
   * Notify the matchmaker that a game that was waiting for a second player has
   * stopped because the only remaining player disconnected.
   */

  disconnected (game) {
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

  getRecentGames () {
    return this.history
  }
}
