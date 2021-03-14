const debug = require('debug')('WikiBattle:matchMaker')
const WikiBattle = require('./WikiBattle')
const RecentGames = require('./RecentGames')

module.exports = class MatchMaker {
  constructor (opts) {
    this.waitingPair = {}
    this.games = {}
    this.wikiPages = opts.pages
    this.recentGames = new RecentGames()
  }

  addToHistory (game) {
    this.recentGames.add(game.origin, game.goal).catch((err) => {
      debug('failed to save recent game', err)
    })
  }

  /**
   * Create a new game hosted by the given player.
   */

  async createGame (player, language) {
    const [origin, goal] = await this.wikiPages.randomPair(language)
    const game = new WikiBattle(origin, goal, language)
    game.connect(player)
    return game
  }

  /**
   * Use paired matchmaking for a player. Puts the given player into a game with
   * either the previous, or the next player that is passed to this method.
   */

  async pair (player, language) {
    if (this.waitingPair[language]) {
      debug('pairing with existing')
      const game = this.waitingPair[language]
      this.waitingPair[language] = null

      game.connect(player)

      player.notifyJoinedGame(game)
      game.start()

      this.addToHistory(game)

      return game
    }

    debug('waiting for pairing')
    const game = await this.createGame(player, language)
    this.waitingPair[language] = game

    player.notifyJoinedGame(game)

    return game
  }

  /**
   * Host a new game using "private" matchmaking. The given player is put into
   * a new game, and waits for another player to join via the game's unique
   * shareable URL.
   */

  async new (player, language) {
    debug('forcing new game')

    const game = await this.createGame(player, language)
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
    this.addToHistory(game)
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
    return this.recentGames.get()
  }
}
