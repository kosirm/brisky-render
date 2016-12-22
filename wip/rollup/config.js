const sourcemaps = require('rollup-plugin-sourcemaps')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const envs = require('rollup-plugin-envs')
const hub = require('rollup-plugin-hub')
const pkg = require('../package.json')
const deps = Object.keys(pkg.dependencies)

module.exports = [{
  entry: 'src/index.js', // app prerender
  plugins: [
    resolve(),
    envs({ imports: [ 'vigour-ua/navigator' ] }),
    commonjs()
  ],
  format: 'cjs',
  dest: 'dist/app/index.js'
}, {
  entry: 'src/state.js', // state
  plugins: [ resolve() ],
  external: deps,
  format: 'cjs',
  dest: 'dist/state/index.js'
}, {
  entry: 'server/render.js', // render // server
  plugins: [
    resolve()
  ],
  external: deps,
  format: 'cjs',
  dest: 'dist/render/index.js'
}, {
  entry: 'server/browser.js', // client build // server
  plugins: [
    resolve({ browser: true }),
    envs({ imports: [ 'vigour-ua/navigator' ] }),
    commonjs(),
    hub(),
    sourcemaps()
  ],
  sourceMap: true,
  format: 'iife',
  moduleName: 'app',
  intro: 'var global = window;',
  dest: 'dist/browser/index.js'
}]
