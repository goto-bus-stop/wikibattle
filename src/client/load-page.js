const cache = {}

export default function load (page, cb) {
  cache[page] ??= fetch(`./wiki/${page}`).then((response) => response.text())
  cache[page].then((result) => cb(null, result), cb)
}
