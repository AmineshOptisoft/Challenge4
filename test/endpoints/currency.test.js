process.env.NODE_ENV = 'test'

// External dependencies
const http = require('http')
const test = require('tape')

// Internal dependencies
const app = require('../../lib/app')
const { createTestRequest, assertCurrencyResponse, assertErrorResponse } = require('../utils/testHelpers')
const { currencyRequests, conversionRequests, specificProjects } = require('../utils/testData')

const server = http.createServer(app)

test('Currency endpoint tests', function (t) {
  t.test('POST /api/project/budget/currency - successful conversion', function (t) {
    createTestRequest(server, '/api/project/budget/currency', 'POST', currencyRequests.valid, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('POST /api/project/budget/currency - missing required fields', function (t) {
    createTestRequest(server, '/api/project/budget/currency', 'POST', currencyRequests.invalid, function (err, res) {
      assertErrorResponse(t, err, res, 400)
      t.end()
    })
  })

  t.test('POST /api/project/budget/currency - non-existent project', function (t) {
    createTestRequest(server, '/api/project/budget/currency', 'POST', currencyRequests.nonExistent, function (err, res) {
      assertErrorResponse(t, err, res, 404)
      t.end()
    })
  })

  t.test('TTD conversion for Peking roasted duck Chanel', function (t) {
    createTestRequest(server, '/api/project/budget/currency', 'POST', specificProjects.pekingRoastedDuckChanel, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('TTD conversion for Choucroute Cartier', function (t) {
    createTestRequest(server, '/api/project/budget/currency', 'POST', specificProjects.choucrouteCartier, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('TTD conversion for Rigua Nintendo', function (t) {
    createTestRequest(server, '/api/project/budget/currency', 'POST', specificProjects.riguaNintendo, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('TTD conversion for Llapingacho Instagram', function (t) {
    createTestRequest(server, '/api/project/budget/currency', 'POST', specificProjects.llapingachoInstagram, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  // Tests for new /api-conversion endpoint
  t.test('POST /api/api-conversion - successful conversion', function (t) {
    createTestRequest(server, '/api/api-conversion', 'POST', conversionRequests.valid, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('POST /api/api-conversion - missing required fields', function (t) {
    createTestRequest(server, '/api/api-conversion', 'POST', conversionRequests.invalid, function (err, res) {
      assertErrorResponse(t, err, res, 400)
      t.end()
    })
  })

  t.test('POST /api/api-conversion - non-existent project', function (t) {
    createTestRequest(server, '/api/api-conversion', 'POST', conversionRequests.nonExistent, function (err, res) {
      assertErrorResponse(t, err, res, 404)
      t.end()
    })
  })

  t.test('TTD conversion via /api-conversion for Peking roasted duck Chanel', function (t) {
    createTestRequest(server, '/api/api-conversion', 'POST', specificProjects.pekingRoastedDuckChanel, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('TTD conversion via /api-conversion for Choucroute Cartier', function (t) {
    createTestRequest(server, '/api/api-conversion', 'POST', specificProjects.choucrouteCartier, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('TTD conversion via /api-conversion for Rigua Nintendo', function (t) {
    createTestRequest(server, '/api/api-conversion', 'POST', specificProjects.riguaNintendo, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('TTD conversion via /api-conversion for Llapingacho Instagram', function (t) {
    createTestRequest(server, '/api/api-conversion', 'POST', specificProjects.llapingachoInstagram, function (err, res) {
      assertCurrencyResponse(t, err, res, 200)
      t.end()
    })
  })
})
