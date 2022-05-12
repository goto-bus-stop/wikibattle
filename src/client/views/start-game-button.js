import render from 'crel'
import domEvent from 'dom-event'
import bus from '../bus.js'

const { on, off } = domEvent

export default function startGameButton (isPrivate) {
  return new StartGameButton(isPrivate).el
}

class StartGameButton {
  constructor (isPrivate) {
    this.onClick = this.onClick.bind(this)

    this.isPrivate = isPrivate

    this.el = render('button', '» Go!')
    on(this.el, 'click', this.onClick)
  }

  disable () {
    this.el.disabled = true
    off(this.el, 'click', this.onClick)
  }

  onClick () {
    bus.emit('connect', this.isPrivate)
    this.disable()
  }
}
