import bus from 'bus'
import classes from 'component-classes'
import empty from 'empty-element'
import render from 'crel'

export default function path (by) {
  return new Path(by).el
}

function Path (by) {
  this.onPaths = this.onPaths.bind(this)

  this.list = render('ol')
  this.el = render('div', { class: 'path hide' }, [ render('h3', 'Path'), this.list ])
  this.classes = classes(this.el)

  this.by = by
  bus.on('paths', this.onPaths)
}

Path.prototype.onPaths = function (paths) {
  if (paths[this.by]) {
    this.classes.remove('hide')
    this.setPathList(paths[this.by])
  }
}

Path.prototype.setPathList = function (path) {
  empty(this.list)
  render(this.list, path.map(function (entry, i) {
    const next = path[i + 1]
    const duration = next ? ` (${Math.round((next.time - entry.time) / 100) / 10} seconds)` : ''
    return render('li', (entry.page === null ? render('i', 'Disconnected') : entry.page + duration))
  }))
}
