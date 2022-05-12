import WikiUpdater from './src/WikiUpdater.js'

const updater = new WikiUpdater({
  cssPath: new URL('public/wiki.css', import.meta.url)
})

console.log('updating wiki assets')

console.log('downloading css')
await updater.updateCss()
console.log('downloaded css')
