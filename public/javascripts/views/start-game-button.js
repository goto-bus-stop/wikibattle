import bus from 'bus'
import render from 'crel'

export default function startGameButton(isPrivate) {
  return new StartGameButton(isPrivate).el
}

function StartGameButton(isPrivate) {
  this.onClick = this.onClick.bind(this)

  this.isPrivate = isPrivate

  this.el = render('button', '» Go!')
  this.el.addEventListener('click', this.onClick, false)
}

StartGameButton.prototype.disable = function () {
  this.el.disabled = true
  this.el.removeEventListener('click', this.onClick)
}

StartGameButton.prototype.onClick = function () {
  bus.emit('connect', this.isPrivate)
  this.disable()
}
