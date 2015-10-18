import bus from 'bus'
import classes from 'component-classes'
import render from 'crel'

export default function gameLink () {
  return new GameLink().el
}

function GameLink () {
  this.showLink = this.showLink.bind(this)
  this.hide = this.hide.bind(this)

  this.input = render('input', { type: 'text' })
  this.el = render('div', { id: 'game-link', class: 'hide' },
                   [ 'Link to this game:', this.input ])
  this.classes = classes(this.el)

  bus.on('game-link', this.showLink)
  bus.on('start', this.hide)
}

GameLink.prototype.showLink = function (link) {
  this.input.value = link
  this.classes.remove('hide')
  this.input.select()
}

GameLink.prototype.hide = function () {
  this.classes.add('hide')
}
