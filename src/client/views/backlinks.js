const classes = require('component-classes')
const render = require('crel')
const empty = require('empty-element')
const bus = require('../bus')

module.exports = function backlinks () {
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
      [ render('h2', 'Backlinks'), this.list ]
    )
    this.classes = classes(this.el)

    bus.on('backlinks', this.setBacklinks)
    bus.on('backlinks:show', this.show)
    bus.on('backlinks:hide', this.hide)
  }

  setBacklinks (backlinks) {
    empty(this.list)
    render(this.list, backlinks.map(function (name) { return render('li', name) }))
  }

  show () {
    this.classes.remove('hide')
  }

  hide () {
    this.classes.add('hide')
  }
}
