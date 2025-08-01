// External dependencies
const servertest = require('servertest')

// Test helper functions
function createTestRequest (server, endpoint, method, requestBody, callback) {
  const json = JSON.stringify(requestBody)
  console.log(json, 'json==============json')
  console.log(method, 'method==============method')
  console.log(endpoint, 'endpoint==============endpoint')
  console.log(requestBody, 'requestBody==============requestBody')
  const stream = servertest(server, endpoint, {
    method,
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    }
  }, callback)
  stream.end(json)
}

function createGetRequest (server, endpoint, callback) {
  servertest(server, endpoint, {
    method: 'GET',
    encoding: 'json'
  }, callback)
}

function createDeleteRequest (server, endpoint, callback) {
  servertest(server, endpoint, {
    method: 'DELETE',
    encoding: 'json'
  }, callback)
}

module.exports = {
  createTestRequest,
  createGetRequest,
  createDeleteRequest
}
