const bus = require('bus')
const render = require('crel')
const { on, off } = require('dom-event')

module.exports = function startGameButton (isPrivate) {
  return new StartGameButton(isPrivate).el
}

function StartGameButton (isPrivate) {
  this.onClick = this.onClick.bind(this)

  this.isPrivate = isPrivate

  this.el = render('button', '» Go!')
  on(this.el, 'click', this.onClick)
}

StartGameButton.prototype.disable = function () {
  this.el.disabled = true
  off(this.el, 'click', this.onClick)
}

StartGameButton.prototype.onClick = function () {
  bus.emit('connect', this.isPrivate)
  this.disable()
}
