import xhr from 'xhr'

const loading = {}

export default function load (page, cb) {
  if (!loading[page]) {
    loading[page] = [ cb ]

    xhr(`./wiki/${page}`, (err, response) => {
      if (err) done(err)
      else done(null, response.body)
    })
  } else {
    loading[page].push(cb)
  }

  function done (e, content) {
    loading[page].forEach((cb) => {
      cb(e, content)
    })
    delete loading[page]
  }
}
