/* global XMLHttpRequest */
const loading = {}

export default function load (page, cb) {
  if (!loading[page]) {
    loading[page] = [ cb ]

    const xhr = new XMLHttpRequest()
    xhr.open('GET', './wiki/' + page, true)
    xhr.addEventListener('load', function () {
      done(null, xhr.responseText)
    })
    xhr.addEventListener('error', done)
    xhr.send()
  } else {
    loading[page].push(cb)
  }

  function done (e, content) {
    loading[page].forEach(cb => { cb(e, content) })
    delete loading[page]
  }
}
