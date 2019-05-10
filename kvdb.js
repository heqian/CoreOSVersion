const fetch = require('./fetch')

class KvDb {
  constructor (bucket) {
    this.bucket = bucket
  }

  get (key) {
    return new Promise((resolve, reject) => {
      fetch({
        protocol: 'https:',
        hostname: 'kvdb.io',
        path: `/${this.bucket}/${key}`,
        method: 'GET'
      }, null, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
  }

  set (key, value) {
    value = JSON.stringify(value)
    return new Promise((resolve, reject) => {
      fetch({
        protocol: 'https:',
        hostname: 'kvdb.io',
        path: `/${this.bucket}/${key}`,
        method: 'PUT',
        headers: {
          'content-length': value.length
        }
      }, value, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
  }
}

module.exports = KvDb
