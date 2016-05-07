import bus from 'bus'
import delegate from 'component-delegate'
import empty from 'empty-element'
import render from 'crel'

export default function article (player, isSelf) {
  return new Article(player, isSelf).el
}

const reSimpleWiki = /^\/wiki\//
const reIndexWiki = /^\/w\/index\.php\?title=(.*?)(?:&|$)/
const reInvalidPages = /^(File|Template):/

function preventDefault (e) {
  e.preventDefault()
}

function Article (player, isSelf) {
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
    [ render('div', { class: 'heading-holder' }, this.title), this.content ]
  )

  this.el.addEventListener('click', preventDefault, false)
  if (isSelf) {
    this.delegatedOnClick = delegate.bind(this.el, 'a, area', 'click', this.onClick)
    this.el.addEventListener('mousewheel', this.onScroll, false)
  } else {
    this.el.addEventListener('mousewheel', preventDefault, false)
  }

  bus.on('article-loaded', this.onArticleLoaded)
  bus.on('article-scrolled', this.onArticleScrolled)
  bus.on('game-over', this.onGameOver)
}

Article.prototype.render = function (title, body) {
  const steps = render('small', ` (${this.player.path.length} steps)`)
  render(empty(this.title), [ title, steps ])
  empty(this.content).innerHTML = body
  this.el.scrollTop = 0
}

Article.prototype.onClick = function ({ delegateTarget: el }) {
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

Article.prototype.onScroll = function (e) {
  // timeout so we get the scrollTop *after* the scroll event instead of before
  setTimeout(() => {
    bus.emit('scroll', this.el.scrollTop, this.el.offsetWidth)
  }, 10)
}

Article.prototype.onArticleLoaded = function ({ player, title, body }) {
  if (this.player.id === player.id) {
    this.render(title, body)
  }
}

Article.prototype.onArticleScrolled = function (playerId, top, width) {
  if (this.player.id === playerId) {
    // very rough estimation of where the opponent will roughly be on their screen size
    // inaccurate as poop but it's only a gimmick anyway so it doesn't really matter
    this.el.scrollTop = top * width / this.el.offsetWidth
  }
}

Article.prototype.onGameOver = function (winner) {
  if (this.isSelf) {
    delegate.unbind(this.el, 'click', this.delegatedOnClick)
    this.el.removeEventListener('mousewheel', this.onScroll)
  }
}
