const classes = require('component-classes')
const empty = require('empty-element')
const render = require('crel')
const bus = require('../bus')

module.exports = function path (player) {
  return new Path(player).el
}

class Path {
  constructor (player) {
    this.onPaths = this.onPaths.bind(this)

    this.list = render('ol')
    this.el = render('div', { class: 'path hide' }, [render('h3', 'Path'), this.list])
    this.classes = classes(this.el)

    this.player = player
    bus.on('paths', this.onPaths)
  }

  onPaths (paths) {
    if (paths[this.player.id]) {
      this.classes.remove('hide')
      this.setPathList(paths[this.player.id])
    }
  }

  setPathList (path) {
    empty(this.list)
    render(this.list, path.map(function (entry, i) {
      const next = path[i + 1]
      const duration = next ? ` (${Math.round((next.time - entry.time) / 100) / 10} seconds)` : ''
      return render('li', (entry.page === null ? render('i', 'Disconnected') : entry.page + duration))
    }))
  }
}
