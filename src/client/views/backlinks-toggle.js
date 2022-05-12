import crel from 'crel'
import bus from '../bus.js'

export default function backlinksToggle () {
  return new BacklinksToggle().el
}

class BacklinksToggle {
  constructor () {
    this.onChange = this.onChange.bind(this)
    this.show = this.show.bind(this)

    this.input = crel('input', { id: 'sbin', type: 'checkbox' })
    this.el = crel(
      'label', { id: 'show-backlinks', for: 'sbin', class: 'hide' },
      [this.input, ' Show Backlinks']
    )

    this.input.addEventListener('change', this.onChange)

    bus.on('backlinks', this.show)
  }

  show () {
    this.el.classList.remove('hide')
    this.input.click()
  }

  onChange () {
    bus.emit(this.input.checked ? 'backlinks:show' : 'backlinks:hide')
  }
}
