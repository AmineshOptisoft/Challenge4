const config = require('../config')
const mysql = require('mysql2')
const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')

const engines = {
  undefined: 'sqlite3',
  test: 'sqlite3',
  development: 'mysql',
  production: 'mysql'
}

const engine = {
  sqlite3: new sqlite3.Database(':memory:'),
  mysql: mysql.createConnection(config.mysql)
}[engines[process.env.NODE_ENV]]

const db = module.exports = engine

// Initialize SQLite database for test environment
if (engines[process.env.NODE_ENV] === 'sqlite3') {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS project (
      projectId INT PRIMARY KEY,
      projectName VARCHAR(255),
      year INT,
      currency VARCHAR(3),
      initialBudgetLocal DECIMAL(10, 2),
      budgetUsd DECIMAL(10, 2),
      initialScheduleEstimateMonths INT,
      adjustedScheduleEstimateMonths INT,
      contingencyRate DECIMAL(5, 2),
      escalationRate DECIMAL(5, 2),
      finalBudgetUsd DECIMAL(10, 2)
    )
  `
  
  db.serialize(() => {
    db.run(createTableSql, (err) => {
      if (err) {
        console.error('Error creating SQLite table:', err)
      } else {
        console.log('SQLite table created successfully')
        // Load seed data for test environment
        loadSeedData()
      }
    })
  })
}

// Load seed data from CSV file
function loadSeedData() {
  const csvData = fs.readFileSync('./data/projects.csv', 'utf8')
  const lines = csvData.split('\n')
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = line.split(',')
    const parsedValues = values.map(value => {
      if (value === 'NULL') return null
      if (!isNaN(value)) return parseFloat(value)
      return `"${value}"`
    })

    const insertSql = `INSERT INTO project VALUES (${parsedValues.join(',')})`
    
    db.run(insertSql, (err) => {
      if (err) {
        console.error('Error inserting Project ID:', values[0], err)
      } else {
        console.log('Inserted Project ID:', values[0])
      }
    })
  }
}

if (engines[process.env.NODE_ENV] === 'mysql') {
  db.connect(function (err) {
    if (err) throw err
    console.log('connected to the database')
  })
}

db.healthCheck = function (cb) {
  const now = Date.now().toString()
  const createQuery = 'CREATE TABLE IF NOT EXISTS healthCheck (value TEXT)'
  const insertQuery = 'INSERT INTO healthCheck VALUES (?)'

  return executeQuery(createQuery, [], function (err) {
    if (err) return cb(err)
    return executeQuery(insertQuery, [now], function (err) {
      if (err) return cb(err)
      cb(null, now)
    })
  })
}

function executeQuery (query, values, cb) {
  if (engines[process.env.NODE_ENV] === 'mysql') {
    return db.query(query, values, function (err, data) {
      if (err) return cb(err)
      cb(null, data)
    })
  }

  return db.serialize(function () {
    db.run(query, values, function (err, data) {
      if (err) return cb(err)
      cb(null, data)
    })
  })
}
