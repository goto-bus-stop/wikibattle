import render from 'crel'
import bus from '../bus.js'

export default function startGameButton (isPrivate) {
  return new StartGameButton(isPrivate).el
}

class StartGameButton {
  constructor (isPrivate) {
    this.isPrivate = isPrivate

    this.el = render('button', '» Go!')
    this.el.addEventListener('click', this.#onClick)
  }

  disable () {
    this.el.disabled = true
    this.el.removeEventListener('click', this.#onClick)
  }

  #onClick = () => {
    bus.emit('connect', this.isPrivate)
    this.disable()
  }
}
