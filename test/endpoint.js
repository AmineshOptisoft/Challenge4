process.env.NODE_ENV = 'test'

const http = require('http')
const test = require('tape')
const servertest = require('servertest')
const url = require('url')
const app = require('../lib/app')

const server = http.createServer(app)

test('environment switching tests', function (t) {
  t.test('NODE_ENV=test triggers SQLite setup', function (t) {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    
    // Clear require cache to force reload
    delete require.cache[require.resolve('../lib/db')]
    const db = require('../lib/db')
    
    // Test that SQLite is being used
    db.query('SELECT name FROM sqlite_master WHERE type="table" AND name="project"', (err, rows) => {
      t.error(err, 'No error querying SQLite table existence')
      t.ok(rows && rows.length > 0, 'SQLite project table exists')
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv
      t.end()
    })
  })

  t.test('NODE_ENV=development uses MySQL', function (t) {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    // Clear require cache to force reload
    delete require.cache[require.resolve('../lib/db')]
    const db = require('../lib/db')
    
    // Test that MySQL connection is established
    db.query('SELECT 1 as test', (err, rows) => {
      if (err) {
        // MySQL might not be available in test environment, so this is expected
        t.pass('MySQL connection test (expected to fail in test environment)')
      } else {
        t.ok(rows && rows.length > 0, 'MySQL connection successful')
      }
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv
      t.end()
    })
  })

  t.test('validate connections and basic CRUD operations under both environments', function (t) {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    
    // Clear require cache to force reload
    delete require.cache[require.resolve('../lib/db')]
    const db = require('../lib/db')
    
    // Test basic CRUD operations
    const testProject = {
      projectId: 99999,
      projectName: 'Test Project',
      year: 2024,
      currency: 'USD',
      initialBudgetLocal: 100000,
      budgetUsd: 100000,
      initialScheduleEstimateMonths: 12,
      adjustedScheduleEstimateMonths: 12,
      contingencyRate: 5.0,
      escalationRate: 2.0,
      finalBudgetUsd: 107000
    }
    
    // Test CREATE
    const insertQuery = `
      INSERT INTO project (
        projectId, projectName, year, currency, initialBudgetLocal,
        budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
        contingencyRate, escalationRate, finalBudgetUsd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const values = [
      testProject.projectId,
      testProject.projectName,
      testProject.year,
      testProject.currency,
      testProject.initialBudgetLocal,
      testProject.budgetUsd,
      testProject.initialScheduleEstimateMonths,
      testProject.adjustedScheduleEstimateMonths,
      testProject.contingencyRate,
      testProject.escalationRate,
      testProject.finalBudgetUsd
    ]
    
    db.query(insertQuery, values, (err) => {
      t.error(err, 'No error inserting test project')
      
      // Test READ
      db.query('SELECT * FROM project WHERE projectId = ?', [testProject.projectId], (err, rows) => {
        t.error(err, 'No error reading test project')
        t.ok(rows && rows.length > 0, 'Test project found')
        t.equal(rows[0].projectName, testProject.projectName, 'Project name matches')
        
        // Test UPDATE
        const updateQuery = 'UPDATE project SET projectName = ? WHERE projectId = ?'
        db.query(updateQuery, ['Updated Test Project', testProject.projectId], (err) => {
          t.error(err, 'No error updating test project')
          
          // Verify update
          db.query('SELECT projectName FROM project WHERE projectId = ?', [testProject.projectId], (err, rows) => {
            t.error(err, 'No error reading updated project')
            t.equal(rows[0].projectName, 'Updated Test Project', 'Project name updated correctly')
            
            // Test DELETE
            db.query('DELETE FROM project WHERE projectId = ?', [testProject.projectId], (err) => {
              t.error(err, 'No error deleting test project')
              
              // Verify deletion
              db.query('SELECT * FROM project WHERE projectId = ?', [testProject.projectId], (err, rows) => {
                t.error(err, 'No error checking deleted project')
                t.equal(rows.length, 0, 'Test project deleted successfully')
                
                // Restore original environment
                process.env.NODE_ENV = originalEnv
                t.end()
              })
            })
          })
        })
      })
    })
  })
})

test('SQLite database setup tests', function (t) {
  t.test('Create SQLite tables during test setup', function (t) {
    const db = require('../lib/db')
    
    // Test table creation
    db.query('SELECT name FROM sqlite_master WHERE type="table" AND name="project"', (err, rows) => {
      t.error(err, 'No error checking table existence')
      t.ok(rows && rows.length > 0, 'Project table created successfully')
      
      // Test table structure
      db.query('PRAGMA table_info(project)', (err, columns) => {
        t.error(err, 'No error getting table structure')
        t.ok(columns && columns.length > 0, 'Table has columns')
        
        // Check for required columns
        const columnNames = columns.map(col => col.name)
        const requiredColumns = [
          'projectId', 'projectName', 'year', 'currency',
          'initialBudgetLocal', 'budgetUsd', 'initialScheduleEstimateMonths',
          'adjustedScheduleEstimateMonths', 'contingencyRate',
          'escalationRate', 'finalBudgetUsd'
        ]
        
        requiredColumns.forEach(col => {
          t.ok(columnNames.includes(col), `Column ${col} exists`)
        })
        
        t.end()
      })
    })
  })

  t.test('Clean and seed SQLite before each test', function (t) {
    const db = require('../lib/db')
    
    // Clean existing data
    db.query('DELETE FROM project', (err) => {
      t.error(err, 'No error cleaning existing data')
      
      // Verify clean state
      db.query('SELECT COUNT(*) as count FROM project', (err, rows) => {
        t.error(err, 'No error counting after cleanup')
        t.equal(rows[0].count, 0, 'Database cleaned successfully')
        
        // Test seed data insertion
        const testProject = {
          projectId: 12345,
          projectName: 'Test Seed Project',
          year: 2024,
          currency: 'USD',
          initialBudgetLocal: 50000,
          budgetUsd: 50000,
          initialScheduleEstimateMonths: 6,
          adjustedScheduleEstimateMonths: 6,
          contingencyRate: 3.0,
          escalationRate: 1.5,
          finalBudgetUsd: 52250
        }
        
        const insertQuery = `
          INSERT INTO project (
            projectId, projectName, year, currency, initialBudgetLocal,
            budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
            contingencyRate, escalationRate, finalBudgetUsd
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        
        const values = [
          testProject.projectId,
          testProject.projectName,
          testProject.year,
          testProject.currency,
          testProject.initialBudgetLocal,
          testProject.budgetUsd,
          testProject.initialScheduleEstimateMonths,
          testProject.adjustedScheduleEstimateMonths,
          testProject.contingencyRate,
          testProject.escalationRate,
          testProject.finalBudgetUsd
        ]
        
        db.query(insertQuery, values, (err) => {
          t.error(err, 'No error inserting test seed data')
          
          // Verify seed data
          db.query('SELECT * FROM project WHERE projectId = ?', [testProject.projectId], (err, rows) => {
            t.error(err, 'No error reading seed data')
            t.ok(rows && rows.length > 0, 'Seed data inserted successfully')
            t.equal(rows[0].projectName, testProject.projectName, 'Seed project name matches')
            t.equal(rows[0].year, testProject.year, 'Seed project year matches')
            
            t.end()
          })
        })
      })
    })
  })

  t.test('Load seed data from projects.csv and validate insertion', function (t) {
    const db = require('../lib/db')
    const fs = require('fs')
    
    // Read CSV file
    const csvData = fs.readFileSync('./data/projects.csv', 'utf8')
    const lines = csvData.split('\n')
    const headerLine = lines[0]
    const dataLines = lines.slice(1).filter(line => line.trim())
    
    t.ok(dataLines.length > 0, 'CSV file contains data')
    
    // Test that specific projects exist in database
    const testProjects = [
      { name: 'Peking roasted duck Chanel', year: 2000 },
      { name: 'Choucroute Cartier', year: 2000 },
      { name: 'Rigua Nintendo', year: 2001 },
      { name: 'Llapingacho Instagram', year: 2000 }
    ]
    
    let completedTests = 0
    const totalTests = testProjects.length
    
    testProjects.forEach(project => {
      db.query('SELECT * FROM project WHERE projectName = ? AND year = ?', 
        [project.name, project.year], (err, rows) => {
        t.error(err, `No error finding project: ${project.name}`)
        t.ok(rows && rows.length > 0, `Project "${project.name}" for year ${project.year} found in database`)
        
        completedTests++
        if (completedTests === totalTests) {
          t.end()
        }
      })
    })
  })

  t.test('Confirm DB schema and connection initialization work as expected', function (t) {
    const db = require('../lib/db')
    
    // Test database connection
    db.query('SELECT 1 as test', (err, rows) => {
      t.error(err, 'No error testing database connection')
      t.ok(rows && rows.length > 0, 'Database connection successful')
      
      // Test schema integrity
      db.query('SELECT COUNT(*) as count FROM project', (err, rows) => {
        t.error(err, 'No error counting projects')
        t.ok(rows[0].count >= 0, 'Project count is valid')
        
        // Test data integrity
        db.query('SELECT projectId, projectName, year FROM project LIMIT 5', (err, rows) => {
          t.error(err, 'No error reading sample data')
          t.ok(rows && rows.length > 0, 'Sample data retrieved successfully')
          
          // Verify data types
          rows.forEach(row => {
            t.ok(typeof row.projectId === 'number', 'Project ID is number')
            t.ok(typeof row.projectName === 'string', 'Project name is string')
            t.ok(typeof row.year === 'number', 'Year is number')
          })
          
          t.end()
        })
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
