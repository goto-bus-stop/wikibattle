var loading = {}

export default function load(page, cb) {
  if (!loading[page]) {
    loading[page] = [ cb ]

    var xhr = new XMLHttpRequest()
    xhr.open('GET', './wiki/' + page, true)
    xhr.addEventListener('load', function () {
      done(null, xhr.responseText)
    })
    xhr.addEventListener('error', done)
    xhr.send()

    function done(e, content) {
      loading[page].forEach(function (cb) { cb(e, content) })
      delete loading[page]
    }
  }
  else {
    loading[page].push(cb)
  }
}
