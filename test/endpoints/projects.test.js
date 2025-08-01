process.env.NODE_ENV = 'test'

// External dependencies
const http = require('http')
const test = require('tape')

// Internal dependencies
const app = require('../../lib/app')
const { createTestRequest, createGetRequest, createDeleteRequest, assertProjectResponse, assertErrorResponse, assertSuccessResponse } = require('../utils/testHelpers')
const { testProjects, updateData } = require('../utils/testData')

const server = http.createServer(app)

test('Projects endpoint tests', function (t) {
  t.test('GET /api/project/budget/:id - successful retrieval', function (t) {
    createGetRequest(server, '/api/project/budget/512', function (err, res) {
      assertProjectResponse(t, err, res, 200)
      t.end()
    })
  })

  t.test('GET /api/project/budget/:id - non-existent project', function (t) {
    createGetRequest(server, '/api/project/budget/99999', function (err, res) {
      assertErrorResponse(t, err, res, 404)
      t.end()
    })
  })

  t.test('GET /api/project/budget/:id - invalid project ID', function (t) {
    createGetRequest(server, '/api/project/budget/invalid', function (err, res) {
      assertErrorResponse(t, err, res, 400)
      t.end()
    })
  })

  t.test('POST /api/project/budget - successful creation', function (t) {
    createTestRequest(server, '/api/project/budget', 'POST', testProjects.valid, function (err, res) {
      assertSuccessResponse(t, err, res, 201)
      t.ok(res.body.projectId, 'Should return projectId')
      t.end()
    })
  })

  t.test('POST /api/project/budget - missing required fields', function (t) {
    createTestRequest(server, '/api/project/budget', 'POST', testProjects.invalid, function (err, res) {
      assertErrorResponse(t, err, res, 400)
      t.end()
    })
  })

  t.test('POST /api/project/budget - duplicate project ID', function (t) {
    createTestRequest(server, '/api/project/budget', 'POST', testProjects.duplicate, function (err, res) {
      assertErrorResponse(t, err, res, 409)
      t.end()
    })
  })

  t.test('PUT /api/project/budget/:id - successful update', function (t) {
    createTestRequest(server, '/api/project/budget/512', 'PUT', updateData.valid, function (err, res) {
      assertSuccessResponse(t, err, res, 200)
      t.ok(res.body.success, 'Should return success true')
      t.end()
    })
  })

  t.test('PUT /api/project/budget/:id - non-existent project', function (t) {
    createTestRequest(server, '/api/project/budget/99999', 'PUT', updateData.valid, function (err, res) {
      assertErrorResponse(t, err, res, 404)
      t.end()
    })
  })

  t.test('PUT /api/project/budget/:id - invalid project ID', function (t) {
    createTestRequest(server, '/api/project/budget/invalid', 'PUT', updateData.valid, function (err, res) {
      assertErrorResponse(t, err, res, 400)
      t.end()
    })
  })

  t.test('PUT /api/project/budget/:id - missing required fields', function (t) {
    createTestRequest(server, '/api/project/budget/512', 'PUT', updateData.incomplete, function (err, res) {
      assertErrorResponse(t, err, res, 400)
      t.end()
    })
  })

  t.test('DELETE /api/project/budget/:id - successful deletion', function (t) {
    createDeleteRequest(server, '/api/project/budget/10001', function (err, res) {
      assertSuccessResponse(t, err, res, 200)
      t.ok(res.body.success, 'Should return success true')
      t.end()
    })
  })

  t.test('DELETE /api/project/budget/:id - non-existent project', function (t) {
    createDeleteRequest(server, '/api/project/budget/99999', function (err, res) {
      assertErrorResponse(t, err, res, 404)
      t.end()
    })
  })

  t.test('DELETE /api/project/budget/:id - invalid project ID', function (t) {
    createDeleteRequest(server, '/api/project/budget/invalid', function (err, res) {
      assertErrorResponse(t, err, res, 400)
      t.end()
    })
  })
})
