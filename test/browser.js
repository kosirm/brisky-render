module.exports = function (app) {
  if ('body' in document) {
    document.body.appendChild(app)
  }
  return app
}
