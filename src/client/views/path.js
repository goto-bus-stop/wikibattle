import empty from 'empty-element'
import render from 'crel'
import bus from '../bus.js'

export default function path (player) {
  return new Path(player).el
}

class Path {
  constructor (player) {
    this.onPaths = this.onPaths.bind(this)

    this.list = render('ol')
    this.el = render('div', { class: 'path hide' }, [render('h3', 'Path'), this.list])

    this.player = player
    bus.on('paths', this.onPaths)
  }

  onPaths (paths) {
    if (paths[this.player.id]) {
      this.el.classList.remove('hide')
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
