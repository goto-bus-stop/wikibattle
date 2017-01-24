import bus from 'bus'
import render from 'crel'
import { on, off } from 'dom-event'

export default function startGameButton (isPrivate) {
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
