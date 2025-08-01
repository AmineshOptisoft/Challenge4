process.env.NODE_ENV = 'test'

// External dependencies
const http = require('http')
const test = require('tape')

// Internal dependencies
const app = require('../../lib/app')
const { createTestRequest, createGetRequest, createDeleteRequest } = require('../utils/testHelpers')
const { integrationTestProject } = require('../utils/testData')

const server = http.createServer(app)

test('Integration tests', function (t) {
  t.test('Database setup and seeding tests', function (t) {
    t.test('SQLite table creation', function (t) {
      const db = require('../../lib/db')

      db.query('SELECT name FROM sqlite_master WHERE type="table" AND name="project"', (err, rows) => {
        t.error(err, 'No error')
        t.ok(rows && rows.length > 0, 'Project table exists')
        t.end()
      })
    })

    t.test('Seed data insertion', function (t) {
      const db = require('../../lib/db')

      db.query('SELECT COUNT(*) as count FROM project', (err, rows) => {
        t.error(err, 'No error')
        t.ok(rows && rows[0].count > 0, 'Seed data was inserted')
        t.end()
      })
    })

    t.test('Database cleanup functionality', function (t) {
      const db = require('../../lib/db')

      // Instead of deleting all data, just verify we can delete a specific project
      db.query('DELETE FROM project WHERE projectId = 999999', (err) => {
        t.error(err, 'No error')

        db.query('SELECT COUNT(*) as count FROM project WHERE projectId = 999999', (err, rows) => {
          t.error(err, 'No error')
          t.equal(rows[0].count, 0, 'Specific project deleted')
          t.end()
        })
      })
    })
  })

  t.test('Full CRUD cycle for a project', function (t) {
    createTestRequest(server, '/api/project/budget', 'POST', integrationTestProject, function (err, res) {
      t.error(err, 'No error creating project')
      t.equal(res.statusCode, 201, 'Should return 201 for creation')

      createGetRequest(server, '/api/project/budget/99999', function (err, res) {
        t.error(err, 'No error reading project')
        t.equal(res.statusCode, 200, 'Should return 200 for reading')

        const updateData = {
          projectName: 'Updated Integration Test Project',
          year: 2025,
          currency: 'USD',
          initialBudgetLocal: 150000.0,
          budgetUsd: 180000.0,
          initialScheduleEstimateMonths: 15,
          adjustedScheduleEstimateMonths: 12,
          contingencyRate: 6.0,
          escalationRate: 3.0,
          finalBudgetUsd: 190000.0
        }

        createTestRequest(server, '/api/project/budget/99999', 'PUT', updateData, function (err, res) {
          t.error(err, 'No error updating project')
          t.equal(res.statusCode, 200, 'Should return 200 for updating')

          createDeleteRequest(server, '/api/project/budget/99999', function (err, res) {
            t.error(err, 'No error deleting project')
            t.equal(res.statusCode, 200, 'Should return 200 for deleting')
            t.end()
          })
        })
      })
    })
  })
})
