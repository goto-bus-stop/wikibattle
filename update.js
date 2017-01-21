const path = require('path')
const updater = require('./lib/WikiUpdater')({
  cssPath: path.join(__dirname, 'public/stylesheets/wiki.css'),
  pagesPath: path.join(__dirname, 'pages.json')
})

console.log('updating wiki assets & pages list')

updateCss()

function updateCss () {
  console.log('downloading css')
  updater.updateCss((err) => {
    if (err) throw err
    console.log('downloaded css')
    updatePages()
  })
}

function updatePages () {
  console.log('updating pages')
  updater.updatePages((err) => {
    if (err) throw err
    console.log('done')
  })
}
