const cache = {}

const fetchOpts = {
  headers: {
    authorization: 'wikibattle.me client',
  },
}

export default function load (page, cb) {
  cache[page] ??= fetch(`./wiki/${page}`, fetchOpts).then((response) => response.text())
  cache[page].then((result) => cb(null, result), cb)
}
