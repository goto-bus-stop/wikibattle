/* eslint-env browser */
import delegate from 'component-delegate'
import empty from 'empty-element'
import render from 'crel'
import bus from '../bus.js'

export default function article (player, isSelf) {
  return new Article(player, isSelf).el
}

const reSimpleWiki = /^\/wiki\//
const reIndexWiki = /^\/w\/index\.php\?title=(.*?)(?:&|$)/
const reInvalidPages = /^(File|Template):/

function preventDefault (e) {
  e.preventDefault()
}

class Article {
  constructor (player, isSelf) {
    this.onScroll = this.onScroll.bind(this)
    this.onArticleLoaded = this.onArticleLoaded.bind(this)
    this.onArticleScrolled = this.onArticleScrolled.bind(this)
    this.onGameOver = this.onGameOver.bind(this)

    this.player = player
    this.isSelf = isSelf

    this.title = render('h2', { class: 'wb-article-title' },
      isSelf ? 'Your Article' : 'Opponent\'s Article')
    this.content = render('div', { class: 'wb-article-content content' })
    this.el = render(
      'div', { class: 'wb-article' },
      [render('div', { class: 'heading-holder' }, this.title), this.content]
    )

    this.el.addEventListener('click', (event) => {
      const target = event.target.closest('a')
      if (target) {
        const href = target.getAttribute('href')
        if (href[0] === '#') {
          return
        }
      }
      event.preventDefault()
    })
    if (isSelf) {
      this.delegatedOnClick = delegate.bind(this.el, 'a, area', 'click', this.onClick)
      this.el.addEventListener('scroll', this.onScroll)
    } else {
      this.el.addEventListener('wheel', preventDefault, { passive: false })
    }

    bus.on('article-loaded', this.onArticleLoaded)
    bus.on('article-scrolled', this.onArticleScrolled)
    bus.on('game-over', this.onGameOver)
  }

  removePrev () {
    if (this.prev && this.prev.parentNode) {
      this.prev.parentNode.removeChild(this.prev)
    }
  }

  renderPrev () {
    this.removePrev()
    this.prev = this.el.cloneNode(true)
    this.el.parentNode.insertBefore(this.prev, this.el)
  }

  renderContent (title, body) {
    const steps = render('small', ` (${this.player.path.length} steps)`)
    render(empty(this.title), [title, steps])
    empty(this.content).innerHTML = body
    this.el.scrollTop = 0
  }

  animate (title, body) {
    this.renderPrev()
    this.el.classList.add('in')
    this.renderContent(title, body)

    requestAnimationFrame(() => {
      this.prev.classList.add('out')
      this.el.classList.remove('in')
      this.prev.addEventListener('transitionend', () => {
        this.removePrev()
      })
    })
  }

  onClick ({ delegateTarget: el }) {
    const href = el.getAttribute('href')
    let next
    if (reSimpleWiki.test(href)) {
      next = href.replace(reSimpleWiki, '')
    } else if ((next = reIndexWiki.exec(href))) {
      next = next[1]
    } else {
      return
    }
    next = next.replace(/#.*?$/, '').replace(/_/g, ' ')
    if (reInvalidPages.test(next)) return
    bus.emit('navigate', next)
  }

  onScroll (e) {
    // timeout so we get the scrollTop *after* the scroll event instead of before
    setTimeout(() => {
      bus.emit('scroll', { scroll: this.el.scrollTop, width: this.el.offsetWidth })
    }, 10)
  }

  onArticleLoaded ({ player, title, body }) {
    if (this.player.id === player.id) {
      this.animate(title, body)
    }
  }

  onArticleScrolled ({ id, top, width }) {
    if (this.player.id === id) {
      // very rough estimation of where the opponent will roughly be on their screen size
      // inaccurate as poop but it's only a gimmick anyway so it doesn't really matter
      this.el.scrollTop = top * width / this.el.offsetWidth
    }
  }

  onGameOver (winner) {
    if (this.isSelf) {
      delegate.unbind(this.el, 'click', this.delegatedOnClick)
      this.el.addEventListener('scroll', this.onScroll)
    }
  }
}
