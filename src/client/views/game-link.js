const classes = require('component-classes')
const render = require('crel')
const bus = require('../bus')

module.exports = function gameLink () {
  return new GameLink().el
}

class GameLink {
  constructor () {
    this.showLink = this.showLink.bind(this)
    this.hide = this.hide.bind(this)

    this.input = render('input', { type: 'text' })
    this.el = render('div', { id: 'game-link', class: 'hide' },
      [ 'Link to this game:', this.input ])
    this.classes = classes(this.el)

    bus.on('game-link', this.showLink)
    bus.on('start', this.hide)
  }

  showLink (link) {
    this.input.value = link
    this.classes.remove('hide')
    this.input.select()
  }

  hide () {
    this.classes.add('hide')
  }
}
