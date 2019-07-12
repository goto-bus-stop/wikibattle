const classes = require('component-classes')
const render = require('crel')
const bus = require('../bus')

module.exports = function hint () {
  return new Hint().el
}

class Hint {
  constructor () {
    this.el = render('div', { id: 'target-hint', class: 'hide' })
    this.classes = classes(this.el)

    this.show = this.show.bind(this)
    bus.on('hint', this.show)
  }

  show (hintText) {
    this.classes.remove('hide')
    render(this.el, [render('strong', 'Hint: '), hintText])
  }
}
