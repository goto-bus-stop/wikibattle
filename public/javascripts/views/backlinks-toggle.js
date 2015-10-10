var bus = require('bus')
var classes = require('component-classes')
var crel = require('crel')

module.exports = function () {
  return new BacklinksToggle().el
}

function BacklinksToggle() {
  this.onChange = this.onChange.bind(this)
  this.show = this.show.bind(this)

  this.input = crel('input', { id: 'sbin', type: 'checkbox' })
  this.el = crel(
    'label', { id: 'show-backlinks', for: 'sbin', class: 'hide' },
    [ this.input, ' Show Backlinks' ]
  )
  this.classes = classes(this.el)

  this.input.addEventListener('change', this.onChange, false)

  bus.on('backlinks', this.show)
}

BacklinksToggle.prototype.show = function () {
  this.classes.remove('hide')
}

BacklinksToggle.prototype.onChange = function () {
  bus.emit(this.input.checked ? 'backlinks:show' : 'backlinks:hide')
}
