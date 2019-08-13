const https = require('https')

module.exports = (options, data, callback) => {
  const request = https.request(options, response => {
    let output = ''

    response.on('data', chunk => {
      output += chunk
    })

    response.on('end', () => {
      callback(null, output.toString())
    })

    response.on('error', error => {
      console.error(error)
      callback(error, null)
    })
  })

  request.on('error', error => {
    console.error(error)
    callback(error, null)
  })

  if (data) {
    request.write(data)
  }

  request.end()
}
