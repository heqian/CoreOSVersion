'use strict'

const https = require('https')
const async = require('async')
const path = require('path')
const NeDB = require('nedb')
const Twitter = require('twitter')

const HTTPS_API_URLS = {
  MAIN: {
    hostname: 'coreos.com',
    path: '/releases/releases.json',
    method: 'GET'
  },
  ALPHA: {
    hostname: 'coreos.com',
    path: '/releases/releases-alpha.json',
    method: 'GET'
  },
  BETA: {
    hostname: 'coreos.com',
    path: '/releases/releases-beta.json',
    method: 'GET'
  },
  STABLE: {
    hostname: 'coreos.com',
    path: '/releases/releases-stable.json',
    method: 'GET'
  }
}

let client = new Twitter({
  consumer_key: process.env.CONSUMER_API_KEY,
  consumer_secret: process.env.CONSUMER_API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

let database = new NeDB({
  filename: path.join(__dirname, 'versions.db'),
  autoload: true
})

function fetch (options, callback) {
  let request = https.request(options, response => {
    let output = ''

    response.on('data', chunk => {
      output += chunk
    })

    response.on('end', () => {
      try {
        let json = JSON.parse(output.toString())
        callback(null, json)
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

  request.end()
}

function update (text) {
  client.post(
    'statuses/update',
    {
      status: text
    },
    (error, tweet, response) => {
      if (error) console.error(error)
    })
}

function check () {
  async.parallel({
    'alpha': callback => {
      fetch(HTTPS_API_URLS.ALPHA, callback)
    },
    'beta': callback => {
      fetch(HTTPS_API_URLS.BETA, callback)
    },
    'stable': callback => {
      fetch(HTTPS_API_URLS.STABLE, callback)
    }
  }, (error, result) => {
    if (error) {
      console.error(error)
      return
    }

    let versions = {
      'alpha': Object.keys(result.alpha).shift(),
      'beta': Object.keys(result.beta).shift(),
      'stable': Object.keys(result.stable).shift()
    }

    database.findOne(versions, (error, document) => {
      if (error) {
        console.error(error)
        return
      }

      if (document === null) {
        database.insert(versions, error => {
          if (error) console.error(error)
        })

        update(
          'Stable: ' + versions.stable + '\n' +
          'Beta: ' + versions.beta + '\n' +
          'Alpha: ' + versions.alpha
        )
      } else {
        console.log('[%s] No news is good news. :)', new Date().toString())
      }
    })
  })
}

setInterval(check, 60000)
