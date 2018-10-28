const empty = require('empty-element')
const render = require('crel')
const { on } = require('dom-event')
const bus = require('../bus')

module.exports = function pageTitle (pov) {
  return new PageTitle(pov).el
}

class PageTitle {
  constructor (pov) {
    this.onWaiting = this.onWaiting.bind(this)
    this.onGameStart = this.onGameStart.bind(this)
    this.onGameOver = this.onGameOver.bind(this)

    this.pov = pov

    this.el = render('h1', { id: 'target-title' }, 'WikiBattle')

    bus.on('waiting-for-opponent', this.onWaiting)
    bus.on('start', this.onGameStart)
    bus.on('game-over', this.onGameOver)
  }

  text (text) {
    render(empty(this.el), text)
  }

  onWaiting () {
    this.text('WikiBattle: Waiting for Opponent…')
  }

  onGameStart (goal) {
    this.text(`Target: ${goal}`)
  }

  onGameOver (winner) {
    const won = winner.id === this.pov.id

    const text = `Game over: You ${won ? 'won' : 'lost'}!`
    const restart = render('button', 'Another Run?')
    on(restart, 'click', () => bus.emit('restart'))

    render(empty(this.el), [ text, restart ])
  }
}
