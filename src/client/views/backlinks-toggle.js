import classes from 'component-classes'
import crel from 'crel'
import domEvent from 'dom-event'
import bus from '../bus.js'

const { on } = domEvent

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
    this.classes = classes(this.el)

    on(this.input, 'change', this.onChange)

    bus.on('backlinks', this.show)
  }

  show () {
    this.classes.remove('hide')
    this.input.click()
  }

  onChange () {
    bus.emit(this.input.checked ? 'backlinks:show' : 'backlinks:hide')
  }
}
