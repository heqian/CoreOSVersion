const http = require('http')
const async = require('async')
const Twitter = require('twitter')
const fetch = require('./fetch')
const KvDb = require('./kvdb')

const HTTPS_API_URLS = {
  ALPHA: {
    hostname: 'www.flatcar.org',
    path: '/releases-json/releases-alpha.json',
    method: 'GET'
  },
  BETA: {
    hostname: 'www.flatcar.org',
    path: '/releases-json/releases-beta.json',
    method: 'GET'
  },
  STABLE: {
    hostname: 'www.flatcar.org',
    path: '/releases-json/releases-stable.json',
    method: 'GET'
  },
  LTS: {
    hostname: 'www.flatcar.org',
    path: '/releases-json/releases-lts.json',
    method: 'GET'
  }
}

const client = new Twitter({
  consumer_key: process.env.CONSUMER_API_KEY,
  consumer_secret: process.env.CONSUMER_API_SECRET_KEY,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

const storage = new KvDb(process.env.BUCKET)

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

function sortedKeys (json) {
  delete json.current
  return Object
    .keys(json)
    .sort((a, b) => new Date(json[a].release_date).valueOf() - new Date(json[b].release_date).valueOf())
}

function hasUpdate (newVersions, oldVersions) {
  const channels = Object.keys(newVersions)

  for (const channel of channels) {
    const newVersion = newVersions[channel]
    const oldVersion = oldVersions[channel]
    const newVersionSegments = newVersion.split('.')
    const oldVersionSegments = oldVersion.split('.')

    for (let i = 0; i < newVersionSegments.length; i++) {
      const newVersionNumber = parseInt(newVersionSegments[i])
      const oldVersionNumber = parseInt(oldVersionSegments[i])

      if (newVersionNumber === oldVersionNumber) {
        continue
      } else if (newVersionNumber > oldVersionNumber) {
        console.log(`[${channel}] ${newVersion} > ${oldVersion}`)
        return true
      } else {
        return false
      }
    }
  }

  // No update by default
  return false
}

function check () {
  async.parallel({
    alpha: callback => {
      fetch(HTTPS_API_URLS.ALPHA, null, callback)
    },
    beta: callback => {
      fetch(HTTPS_API_URLS.BETA, null, callback)
    },
    stable: callback => {
      fetch(HTTPS_API_URLS.STABLE, null, callback)
    },
    lts: callback => {
      fetch(HTTPS_API_URLS.LTS, null, callback)
    }
  }, (error, result) => {
    if (error) {
      console.error(error)
      return
    }

    const alpha = sortedKeys(JSON.parse(result.alpha))
    const beta = sortedKeys(JSON.parse(result.beta))
    const stable = sortedKeys(JSON.parse(result.stable))
    const lts = sortedKeys(JSON.parse(result.lts))

    const versions = {
      alpha: alpha[alpha.length - 1],
      beta: beta[beta.length - 1],
      stable: stable[stable.length - 1],
      lts: lts[lts.length - 1]
    }

    storage
      .get('versions')
      .then(storedVersions => {
        if (hasUpdate(versions, JSON.parse(storedVersions))) {
          update(
            'LTS: ' + versions.lts + '\n' +
            'Stable: ' + versions.stable + '\n' +
            'Beta: ' + versions.beta + '\n' +
            'Alpha: ' + versions.alpha
          )
        } else {
          console.log('[%s] No news is good news. :)', new Date().toString())
        }

        storage.set('versions', versions)
      })
      .catch(error => {
        console.error(error)
      })
  })
}

setInterval(check, 60000)

http
  .createServer((request, response) => {
    storage
      .get('versions')
      .then(versions => {
        response.statusCode = 200
        response.setHeader('content-type', 'application/json')
        response.write(versions)
        response.end()
      })
      .catch(error => {
        console.error(error)
        response.statusCode = 500
        response.end()
      })
  })
  .listen(process.env.PORT || 80)
