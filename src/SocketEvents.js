const Emitter = require('component-emitter')

const debug = require('debug')('WikiBattle:sockets')

module.exports = function SocketEvents (sock) {
  const listeners = new Emitter()
  let onopen = []

  sock.onmessage = ({ data }) => {
    try {
      const { type, args } = JSON.parse(data)
      debug('receive', type, args)
      listeners.emit(type, ...args)
    } catch (e) {
      // OK
    }
  }

  sock.onopen = () => {
    onopen.forEach((fn) => fn())
    onopen = []
  }

  function whenOpen (fn) {
    if (sock.readyState === sock.constructor.OPEN) {
      fn()
    } else {
      onopen.push(fn)
    }
  }

  const events = Object.create(sock)
  events.socket = sock
  events.emit = (type, ...args) => {
    debug('send', type, args)
    whenOpen(() => sock.send(JSON.stringify({ type, args })))
    return events
  }
  events.on = (type, cb) => {
    listeners.on(type, cb)
    return events
  }
  events.off = (type, cb) => {
    listeners.off(type, cb)
    return events
  }
  return events
}
