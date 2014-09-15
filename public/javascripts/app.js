var sock

var currentGoal
  , targetTitle = document.getElementById('target-title')
  , targetHint = document.getElementById('target-hint')
  , goButton = document.getElementById('go')
  , cachedPages = {}
  , me = new Player(document.getElementById('left')
                  , document.getElementById('left-mask'))
  , opponent = new Player(document.getElementById('right')
                        , document.getElementById('right-mask'))

function Player(area, mask) {
  this.area = area
  this.mask = mask
  this.title = area.querySelector('.current-title')
  this.content = area.querySelector('.content')
  this.path = []
}

me.content.addEventListener('click', onClick, false)
me.area.addEventListener('mousewheel', throttle(onScroll, 50), false)
opponent.content.addEventListener('click', preventDefault, false)
opponent.content.addEventListener('mousewheel', preventDefault, false)

goButton.addEventListener('click', go, false)

function go() {
  sock = io.connect(location.protocol + '//' + location.hostname + ':' + location.port)
  sock.on('waiting', waiting)
  sock.on('start', onStart)
  sock.on('navigated', onOpponentNavigated)
  sock.on('won', onWon)
  sock.on('lost', onLost)
  sock.on('scrolled', onOpponentScrolled)
  sock.on('hint', onHint)
  
  goButton.parentNode.removeChild(goButton)
}

function restart() {
  // lol
  location.href = location.pathname
}

// Player goes somewhere
function navigateTo(p, page, cb) {
  addClass(p.mask, 'loading')
  if (p === me) sock.emit('navigate', page)
  p.path.push(page)
  getWikiContent(page, function (e, body) {
    p.title.innerHTML = decodeURIComponent(page) + ' <small>(' + p.path.length + ' steps)</small>'
    p.content.innerHTML = body
    removeClass(p.mask, 'loading')
    p.area.scrollTop = 0
    if (cb) cb(e)
  })
}

// Wiki related Helpers
function getWikiContent(page, cb) {
  if (cachedPages[page]) return cb(null, cachedPages[page])
  var xhr = new XMLHttpRequest()
  xhr.open('GET', './wiki/' + page, true)
  xhr.addEventListener('load', function () {
    cachedPages[page] = xhr.responseText
    cb(null, xhr.responseText)
  })
  xhr.addEventListener('error', function (e) { cb(e) })
  xhr.send()
}
function getPathHtml(path) {
  return '<div class="path"><h3>Path</h3><ol>' + path.map(function (x, i) {
    var next = path[i + 1]
    return '<li>' + x.page + (next ? ' (' + (Math.round((next.time - x.time) / 100) / 10) + ' seconds)' : '') + '</li>'
  }).join('') + '</ol>'
}

// WebSocket Events
function waiting() {
  me.title.innerHTML = 'Your Article'
  opponent.title.innerHTML = 'Opponent\'s Article'
  targetTitle.innerHTML = 'WikiBattle: Waiting for Opponent&hellip;'
  me.content.innerHTML = ''
  opponent.content.innerHTML = ''
  addClass(me.mask, 'loading')
  addClass(opponent.mask, 'loading')
}

function onStart(from, goal) {
  currentGoal = goal
  targetTitle.innerHTML = 'Target: ' + goal

  navigateTo(me, from)
}

function onHint(hint) {
  targetHint.style.display = 'block'
  targetHint.innerHTML = '<strong>Hint: </strong>' + hint
}

function onOpponentNavigated(page, cb) {
  navigateTo(opponent, page, cb)
}
function onOpponentScrolled(top, width) {
  // very rough estimation of where the opponent will roughly be on their screen size
  // inaccurate as poop but it's only a gimmick anyway so it doesn't really matter
  opponent.area.scrollTop = top * width / opponent.area.offsetWidth
}

var reIsWiki = /^\/wiki\//
  , reInvalidPages = /^(File|Template):/
function onClick(e) {
  var el = e.target
    , next, href
  while (el && el.tagName !== 'A' && el.tagName !== 'AREA') el = el.parentNode
  if (el) {
    e.preventDefault()
    href = el.getAttribute('href')
    if (!reIsWiki.test(href)) return
    next = href.replace(reIsWiki, '').replace(/#.*?$/, '').replace(/_/g, ' ')
    if (reInvalidPages.test(next)) return
    navigateTo(me, next)
  }
}

function onScroll(e) {
  setTimeout(function () {
    sock.emit('scroll', me.area.scrollTop, me.area.offsetWidth)
  }, 10)
}

function _onEnd(path, opponentPath) {
  me.content.removeEventListener('click', onClick)
  me.content.addEventListener('click', preventDefault, false)

  me.mask.innerHTML = getPathHtml(path)
  opponent.mask.innerHTML = getPathHtml(opponentPath)

  sock.disconnect()

  var restartBt = document.createElement('button')
  restartBt.addEventListener('click', restart, false)
  restartBt.innerHTML = 'Another Run?'
  targetTitle.appendChild(restartBt)
}
function onWon(path, opponentPath) {
  addClass(me.mask, 'won')
  addClass(opponent.mask, 'lost')
  targetTitle.innerHTML = 'WikiBattle: You won!'
  _onEnd(path, opponentPath)
}
function onLost(path, opponentPath) {
  addClass(me.mask, 'lost')
  addClass(opponent.mask, 'won')
  targetTitle.innerHTML = 'WikiBattle: You lost!'
  _onEnd(path, opponentPath)
 }

// other helpers that are half stolen and not really related to WikiBattle in any way
function preventDefault(e) { e.preventDefault() }

// stolen from https://github.com/component/throttle/
function throttle(func, wait) {
  var last = 0 // last invokation timestamp
    , invoked = 0 // number of times invoked
  return function throttled () {
    var now = new Date().getTime()
    if (now - last >= wait) { // reset
      last = now
      invoked = false
    }
    if (!invoked) return invoked = true, func.apply(this, arguments)
  }
}

function addClass(el, cls) {
  el.classList.add(cls)
}
function removeClass(el, cls) {
  el.classList.remove(cls)
}