var bus = require('bus')
var classes = require('component-classes')
var render = require('crel')
var empty = require('../empty-element')

module.exports = function () {
  return new Backlinks().el
}

function Backlinks() {
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

Backlinks.prototype.setBacklinks = function (backlinks) {
  empty(this.list)
  render(this.list, backlinks.map(function (name) { return render('li', name) }))
}

Backlinks.prototype.show = function () {
  this.classes.remove('hide')
}

Backlinks.prototype.hide = function () {
  this.classes.add('hide')
}
