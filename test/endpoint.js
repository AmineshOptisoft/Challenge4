process.env.NODE_ENV = 'test'

const http = require('http')
const test = require('tape')
const url = require('url')
const app = require('../lib/app')
const { createGetRequest, createTestRequest, createDeleteRequest } = require('./helper')

const server = http.createServer(app)

test('database setup and seeding tests', function (t) {
  t.test('SQLite table creation', function (t) {
    const db = require('../lib/db')
    
    // Test that table exists
    db.query('SELECT name FROM sqlite_master WHERE type="table" AND name="project"', (err, rows) => {
      t.error(err, 'No error querying table existence')
      t.ok(rows && rows.length > 0, 'Project table exists')
      t.end()
    })
  })

  t.test('Seed data insertion', function (t) {
    const db = require('../lib/db')
    
    // Test that seed data was loaded
    db.query('SELECT COUNT(*) as count FROM project', (err, rows) => {
      t.error(err, 'No error counting projects')
      t.ok(rows && rows[0].count > 0, 'Seed data was inserted')
      t.end()
    })
  })

  t.end()
})

test('GET /health should return 200', function (t) {
  createGetRequest(server, '/health', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

test('GET /api/ok should return 200', function (t) {
  createGetRequest(server, '/api/ok', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.ok, 'Should return a body')
    t.end()
  })
})

test('GET /nonexistent should return 404', function (t) {
  createGetRequest(server, '/nonexistent', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.end()
  })
})

// GET /api/project/budget/:id tests
test('GET /api/project/budget/:id - successful retrieval', function (t) {
  createGetRequest(server, '/api/project/budget/38', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.projectId, 'Should return project data')
    t.equal(res.body.projectName, 'Llapingacho Instagram', 'Should return correct project name')
    t.end()
  })
})

test('GET /api/project/budget/:id - project not found', function (t) {
  createGetRequest(server, '/api/project/budget/99999', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

test('GET /api/project/budget/:id - invalid ID', function (t) {
  createGetRequest(server, '/api/project/budget/invalid', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

// POST /api/project/budget/currency tests
test('POST /api/project/budget/currency - successful conversion', function (t) {
  const requestBody = {
    year: 2000,
    projectName: 'Humitas Hewlett Packard',
    currency: 'TTD'
  }
  
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success')
    t.ok(res.body.data, 'Should return data array')
    t.ok(res.body.data[0].finalBudgetTTD, 'Should return converted amount')
    t.end()
  })
})

test('POST /api/project/budget/currency - missing fields', function (t) {
  const requestBody = {
    year: 2000,
    projectName: 'Humitas Hewlett Packard'
    // Missing currency
  }
  
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

test('POST /api/project/budget/currency - project not found', function (t) {
  const requestBody = {
    year: 2000,
    projectName: 'Non Existent Project',
    currency: 'TTD'
  }
  
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

// POST /api/project/budget tests
test('POST /api/project/budget - successful creation', function (t) {
  const requestBody = {
    projectId: 10001,
    projectName: 'Test Project',
    year: 2024,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }
  
  createTestRequest(server, '/api/project/budget', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 201, 'Should return 201')
    t.ok(res.body.success, 'Should return success')
    t.end()
  })
})

test('POST /api/project/budget - missing fields', function (t) {
  const requestBody = {
    projectId: 10002,
    projectName: 'Test Project'
    // Missing required fields
  }
  
  createTestRequest(server, '/api/project/budget', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

test('POST /api/project/budget - duplicate project ID', function (t) {
  const requestBody = {
    projectId: 38, // Existing project ID
    projectName: 'Test Project',
    year: 2024,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }
  
  createTestRequest(server, '/api/project/budget', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 409, 'Should return 409')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

// PUT /api/project/budget/:id tests
test('PUT /api/project/budget/:id - successful update', function (t) {
  const requestBody = {
    projectName: 'Updated Project Name',
    year: 2025,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }
  
  createTestRequest(server, '/api/project/budget/50', 'PUT', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success')
    t.end()
  })
})

test('PUT /api/project/budget/:id - project not found', function (t) {
  const requestBody = {
    projectName: 'Updated Project Name',
    year: 2025,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }
  
  createTestRequest(server, '/api/project/budget/99999', 'PUT', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

test('PUT /api/project/budget/:id - invalid ID', function (t) {
  const requestBody = {
    projectName: 'Updated Project Name',
    year: 2025,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }
  
  createTestRequest(server, '/api/project/budget/invalid', 'PUT', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

// DELETE /api/project/budget/:id tests
test('DELETE /api/project/budget/:id - successful deletion', function (t) {
  createDeleteRequest(server, '/api/project/budget/80', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success')
    t.end()
  })
})

test('DELETE /api/project/budget/:id - project not found', function (t) {
  createDeleteRequest(server, '/api/project/budget/99999', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

test('DELETE /api/project/budget/:id - invalid ID', function (t) {
  createDeleteRequest(server, '/api/project/budget/invalid', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400')
    t.ok(res.body.error, 'Should return error message')
    t.end()
  })
})

// Specific project tests for TTD conversion
test('POST /api/project/budget/currency - Peking roasted duck Chanel TTD conversion', function (t) {
  const requestBody = {
    year: 2000,
    projectName: 'Peking roasted duck Chanel',
    currency: 'TTD'
  }
  
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success')
    t.ok(res.body.data[0].finalBudgetTTD, 'Should return TTD conversion')
    t.end()
  })
})

test('POST /api/project/budget/currency - Choucroute Cartier TTD conversion', function (t) {
  const requestBody = {
    year: 2000,
    projectName: 'Choucroute Cartier',
    currency: 'TTD'
  }
  
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success')
    t.ok(res.body.data[0].finalBudgetTTD, 'Should return TTD conversion')
    t.end()
  })
})

test('POST /api/project/budget/currency - Rigua Nintendo TTD conversion', function (t) {
  const requestBody = {
    year: 2001,
    projectName: 'Rigua Nintendo',
    currency: 'TTD'
  }
  
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success')
    t.ok(res.body.data[0].finalBudgetTTD, 'Should return TTD conversion')
    t.end()
  })
})

test('POST /api/project/budget/currency - Llapingacho Instagram TTD conversion', function (t) {
  const requestBody = {
    year: 2000,
    projectName: 'Llapingacho Instagram',
    currency: 'TTD'
  }
  
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success')
    t.ok(res.body.data[0].finalBudgetTTD, 'Should return TTD conversion')
    t.end()
  })
})
