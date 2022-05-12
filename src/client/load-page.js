import xhr from 'xhr'

const callbacks = {}

export default function load (page, cb) {
  if (callbacks[page]) {
    callbacks[page].push(cb)
    return
  }

  callbacks[page] = [cb]

  xhr(`./wiki/${page}`, (err, response) => {
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
