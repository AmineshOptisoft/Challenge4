process.env.NODE_ENV = 'test'

// External dependencies
const http = require('http')
const test = require('tape')
const servertest = require('servertest')

// Internal dependencies
const app = require('../../lib/app')
const { assertHealthResponse } = require('../utils/testHelpers')

const server = http.createServer(app)

test('Health endpoint tests', function (t) {
  t.test('GET /health should return 200', function (t) {
    servertest(server, '/health', { encoding: 'json' }, function (err, res) {
      t.error(err, 'No error')
      t.equal(res.statusCode, 200, 'Should return 200')
      t.end()
    })
  })

  t.test('GET /api/ok should return 200', function (t) {
    servertest(server, '/api/ok', { encoding: 'json' }, function (err, res) {
      assertHealthResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('GET /nonexistent should return 404', function (t) {
    servertest(server, '/nonexistent', { encoding: 'json' }, function (err, res) {
      t.error(err, 'No error')
      t.equal(res.statusCode, 404, 'Should return 404')
      t.end()
    })
  })
})
