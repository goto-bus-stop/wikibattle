const path = require('path')
const updater = require('./src/WikiUpdater')({
  cssPath: path.join(__dirname, 'public/wiki.css')
})

console.log('updating wiki assets')

updateCss().catch((err) => {
  setImmediate(() => { throw err })
})

async function updateCss () {
  console.log('downloading css')
  await updater.updateCss()
  console.log('downloaded css')
}
