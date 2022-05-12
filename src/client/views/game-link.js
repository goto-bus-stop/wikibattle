import render from 'crel'
import bus from '../bus.js'

export default function gameLink () {
  return new GameLink().el
}

class GameLink {
  constructor () {
    this.showLink = this.showLink.bind(this)
    this.hide = this.hide.bind(this)

    this.input = render('input', { type: 'text' })
    this.el = render('div', { id: 'game-link', class: 'hide' },
      ['Link to this game:', this.input])

    bus.on('game-link', this.showLink)
    bus.on('start', this.hide)
  }

  showLink (link) {
    this.input.value = link
    this.el.classList.remove('hide')
    this.input.select()
  }

  hide () {
    this.el.classList.add('hide')
  }
}
