const express = require('express')
const db = require('./db')

const endpoints = express.Router()

endpoints.get('/ok', (req, res) => {
  res.status(200).json({ ok: true })
})

// GET /api/project/budget/:id endpoint
endpoints.get('/project/budget/:id', (req, res) => {
  const projectId = req.params.id
  
  // Input validation for project ID
  if (!projectId || isNaN(parseInt(projectId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID. Must be a valid number.',
      errorType: 'VALIDATION_ERROR'
    })
  }
  
  const query = 'SELECT * FROM project WHERE projectId = ?'
  
  db.query(query, [parseInt(projectId)], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({
        success: false,
        error: 'Database error occurred',
        errorType: 'DATABASE_ERROR'
      })
    }
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Project with ID ${projectId} not found`,
        errorType: 'NOT_FOUND'
      })
    }
    
    const project = rows[0]
    res.status(200).json({
      success: true,
      data: {
        projectId: project.projectId,
        projectName: project.projectName,
        year: project.year,
        currency: project.currency,
        initialBudgetLocal: project.initialBudgetLocal,
        budgetUsd: project.budgetUsd,
        initialScheduleEstimateMonths: project.initialScheduleEstimateMonths,
        adjustedScheduleEstimateMonths: project.adjustedScheduleEstimateMonths,
        contingencyRate: project.contingencyRate,
        escalationRate: project.escalationRate,
        finalBudgetUsd: project.finalBudgetUsd
      }
    })
  })
})

module.exports = endpoints
