const fs = require('fs')
const db = require('../lib/db')

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

// Create table first
db.query(createTableSql, err => {
  if (err) return console.error('Error creating table:', err)
  console.log('Table created successfully')

  // Load seed data from CSV
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

    db.query(insertSql, err => {
      if (err) {
        console.error('Error inserting Project ID:', values[0], err)
        process.exit(1)
      }
      console.log('Inserted Project ID:', values[0])
    })
  }

  // Close database connection after seeding
  setTimeout(() => {
    db.end(err => {
      if (err) return console.error('Error closing database connection:', err)
      console.log('Database seeding completed')
    })
  }, 1000)
})
