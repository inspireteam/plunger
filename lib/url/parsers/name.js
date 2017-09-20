const url = require('url')
const contentDisposition = require('content-disposition')
const rfc2047 = require('rfc2047')

function parseName(token) {
  if (token.parsed) return false

  const cdHeader = token.response.headers['content-disposition']

  if (cdHeader) {
    const cd = contentDisposition.parse(cdHeader)
    if (cd && cd.parameters) {
      token.fileName = rfc2047.decode(cd.parameters.filename)
    }
  }

  if (!token.fileName) {
    const {pathname} = url.parse(token.finalURL)
    if (pathname) {
      const fileName = pathname.split('/').pop()
      if (fileName) {
        token.fileName = fileName
      }
    }
  }
}

module.exports = parseName