'use strict'

const path = require('path')
const url = require('url')
const {is} = require('type-is')
const {pipe} = require('mississippi')
const htmlparser2 = require('htmlparser2')

function getBaseUrls(location) {
  const parsed = new url.URL(location)
  parsed.search = ''

  let baseUrl = parsed.toString()
  const filename = path.basename(baseUrl)

  // If the url ends with a filename, let’s remove it
  if (filename.indexOf('.') > -1) {
    baseUrl = path.dirname(baseUrl)
  }

  parsed.pathname = '/'
  const rootUrl = parsed.toString().slice(0, -1)

  return {baseUrl, rootUrl}
}

async function extractLinks(token, options) {
  let isIndexOf = false
  const links = []

  let {baseUrl, rootUrl} = getBaseUrls(token.finalURL)

  const parser = new htmlparser2.WritableStream({
    ontext: text => {
      const matches = options.indexOfMatches || []

      if (matches.some(match => text.match(match))) {
        isIndexOf = true
      }
    },

    onopentag: (tag, attributes) => {
      if (tag === 'base' && attributes.href) {
        baseUrl = attributes.href
      }

      if (isIndexOf && tag === 'a' && attributes.href && !attributes.href.startsWith('.')) {
        const fullUrl = attributes.href.startsWith('/') ?
          `${rootUrl}${attributes.href}` :
          `${baseUrl}${attributes.href}`

        if (fullUrl.startsWith(baseUrl) && fullUrl !== baseUrl) {
          links.push(fullUrl)
        }
      }
    }
  })

  return new Promise((resolve, reject) => {
    pipe(
      token.response.body,
      parser,
      err => {
        if (err) return reject(err)

        resolve(links)
      }
    )
  })
}

async function parseIndexOf(token, options) {
  options.logger.log('index-of:parse:start', token)
  const links = await extractLinks(token, options)
  options.logger.log('index-of:parse:end', token)

  if (links.length > 0) {
    token.type = 'index-of'
    token.children = links.map(location => ({
      inputType: 'url',
      location
    }))
    token.parsed = true
  }
}

async function parseHTML(token, options) {
  if (token.parsed) return false

  const isHtml = token.fileTypes.some(type => is(type.mime, 'html'))
  if (!isHtml) return false

  await parseIndexOf(token, options)
}

module.exports = parseHTML