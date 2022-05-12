import render from 'crel'
import bus from '../bus.js'

export default function hint () {
  return new Hint().el
}

class Hint {
  constructor () {
    this.el = render('div', { id: 'target-hint', class: 'hide' })

    this.show = this.show.bind(this)
    bus.on('hint', this.show)
  }

  show (hintText) {
    this.el.classList.remove('hide')
    render(this.el, [render('strong', 'Hint: '), hintText])
  }
}
