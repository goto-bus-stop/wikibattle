// Don't attempt to bundle dependencies using rollup, let browserify handle
// them instead.
exports.external = Object.keys(require('./package.json').dependencies)
