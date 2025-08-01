process.env.NODE_ENV = 'test'

const http = require('http')
const test = require('tape')
const servertest = require('servertest')
const url = require('url')
const app = require('../lib/app')

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

  t.test('Database cleanup functionality', function (t) {
    const db = require('../lib/db')
    
    // Test cleanup by deleting and recreating
    db.query('DELETE FROM project', (err) => {
      t.error(err, 'No error deleting all projects')
      
      db.query('SELECT COUNT(*) as count FROM project', (err, rows) => {
        t.error(err, 'No error counting after cleanup')
        t.equal(rows[0].count, 0, 'All projects deleted')
        t.end()
      })
    })
  })
})

test('GET /health should return 200', function (t) {
  servertest(server, '/health', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

test('GET /api/ok should return 200', function (t) {
  servertest(server, '/api/ok', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.ok, 'Should return a body')
    t.end()
  })
})

test('GET /nonexistent should return 404', function (t) {
  servertest(server, '/nonexistent', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.end()
  })
})
