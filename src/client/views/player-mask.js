import render from 'crel'
import bus from '../bus.js'
import path from './path.js'

export default function playerMask (player) {
  return new PlayerMask(player).el
}

class PlayerMask {
  constructor (player) {
    this.setLoading = this.setLoading.bind(this)
    this.onArticleLoading = this.onArticleLoading.bind(this)
    this.onArticleLoaded = this.onArticleLoaded.bind(this)
    this.onGameStart = this.onGameStart.bind(this)
    this.onGameOver = this.onGameOver.bind(this)

    this.player = player

    this.el = render('div', { class: 'wb-mask hide' },
      [path(player)])

    this.isLoading = false
    this.isGameOver = false

    bus.on('waiting-for-opponent', this.setLoading)
    bus.on('start', this.onGameStart)
    bus.on('article-loading', this.onArticleLoading)
    bus.on('article-loaded', this.onArticleLoaded)
    bus.on('game-over', this.onGameOver)
  }

  show (link) {
    this.el.classList.remove('hide')
  }

  hide () {
    this.el.classList.add('hide')
  }

  maybeHide () {
    if (!this.isLoading && !this.isGameOver) {
      this.hide()
    }
  }

  setLoading () {
    this.show()
    this.el.classList.add('loading')
    this.isLoading = true
  }

  setNotLoading () {
    this.isLoading = false
    this.el.classList.remove('loading')
    this.maybeHide()
  }

  onGameStart () {
    this.setNotLoading()
  }

  onArticleLoading (e) {
    if (e.player.id === this.player.id) {
      this.setLoading()
    }
  }

  onArticleLoaded (e) {
    if (e.player.id === this.player.id) {
      this.setNotLoading()
    }
  }

  onGameOver (winner) {
    this.isGameOver = true
    if (winner.id === this.player.id) {
      this.el.classList.add('won')
    } else {
      this.el.classList.add('lost')
    }
    this.show()
  }
}
