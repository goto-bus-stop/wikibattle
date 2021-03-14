const xhr = require('xhr')

const callbacks = {}

module.exports = function load (page, cb, language) {
  if (callbacks[page]) {
    callbacks[page].push(cb)
    return
  }

  callbacks[page] = [cb]
  xhr(`./wiki/${language}/${page}`, (err, response) => {
    if (err) done(err)
    else done(null, response.body)
  })

  function done (e, content) {
    callbacks[page].forEach((cb) => {
      cb(e, content)
    })
    delete callbacks[page]
  }
}
