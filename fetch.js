const https = require('https')

module.exports = (options, data, callback) => {
  let request = https.request(options, response => {
    let output = ''

    response.on('data', chunk => {
      output += chunk
    })

    response.on('end', () => {
      try {
        callback(null, output.toString())
      } catch (exception) {
        callback(exception, null)
      }
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
