module.exports = empty

function empty(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild)
  }
}
