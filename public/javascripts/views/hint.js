var bus = require('bus')
var classes = require('component-classes')
var render = require('crel')

module.exports = function () {
  return new Hint().el
}

function Hint() {
  this.el = render('div', { id: 'target-hint', class: 'hide' })
  this.classes = classes(this.el)

  this.show = this.show.bind(this)
  bus.on('hint', this.show)
}

Hint.prototype.show = function (hintText) {
  this.classes.remove('hide')
  render(this.el, [ render('strong', 'Hint: '), hintText ])
}
