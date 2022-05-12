import render from 'crel'
import empty from 'empty-element'
import bus from '../bus.js'

export default function backlinks () {
  return new Backlinks().el
}

class Backlinks {
  constructor () {
    this.setBacklinks = this.setBacklinks.bind(this)
    this.show = this.show.bind(this)
    this.hide = this.hide.bind(this)

    this.list = render('ul')
    this.el = render(
      'div', { id: 'backlinks', class: 'hide' },
      [render('h2', 'Backlinks'), this.list]
    )

    bus.on('backlinks', this.setBacklinks)
    bus.on('backlinks:show', this.show)
    bus.on('backlinks:hide', this.hide)
  }

  setBacklinks (backlinks) {
    empty(this.list)
    render(this.list, backlinks.map(function (name) { return render('li', name) }))
  }

  show () {
    this.el.classList.remove('hide')
  }

  hide () {
    this.el.classList.add('hide')
  }
}
