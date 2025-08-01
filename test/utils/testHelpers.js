// External dependencies
const servertest = require('servertest')

// Test helper functions
function createTestRequest (server, endpoint, method, requestBody, callback) {
  const json = JSON.stringify(requestBody)
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

// Assertion helper functions
function assertSuccessResponse (t, err, res, expectedStatus = 200) {
  t.error(err, 'No error')
  t.equal(res.statusCode, expectedStatus, `Should return ${expectedStatus}`)
}

function assertErrorResponse (t, err, res, expectedStatus = 400) {
  t.error(err, 'No error')
  t.equal(res.statusCode, expectedStatus, `Should return ${expectedStatus}`)
}

function assertProjectResponse (t, err, res, expectedStatus = 200) {
  assertSuccessResponse(t, err, res, expectedStatus)
  t.ok(res.body.projectId, 'Should have projectId')
}

function assertCurrencyResponse (t, err, res, expectedStatus = 200) {
  assertSuccessResponse(t, err, res, expectedStatus)
  t.ok(res.body.success, 'Should return success true')
}

function assertHealthResponse (t, err, res, expectedStatus = 200) {
  assertSuccessResponse(t, err, res, expectedStatus)
  t.ok(res.body.ok, 'Should return ok true')
}

// Test data helper functions
function createTestProject (projectId = 10001) {
  return {
    projectId,
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
}

function createCurrencyRequest (projectName = 'Humitas Hewlett Packard', year = 2000) {
  return {
    year,
    projectName,
    currency: 'TTD'
  }
}

function createUpdateData () {
  return {
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
}

module.exports = {
  createTestRequest,
  createGetRequest,
  createDeleteRequest,
  assertSuccessResponse,
  assertErrorResponse,
  assertProjectResponse,
  assertCurrencyResponse,
  assertHealthResponse,
  createTestProject,
  createCurrencyRequest,
  createUpdateData
}
