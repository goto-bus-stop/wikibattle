const path = require('path')
const updater = require('./src/WikiUpdater')({
  cssPath: path.join(__dirname, 'public/wiki.css')
})

console.log('updating wiki assets')

updateCss()

function updateCss () {
  console.log('downloading css')
  updater.updateCss((err) => {
    if (err) throw err
    console.log('downloaded css')
  })
}
