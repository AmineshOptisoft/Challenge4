const express = require('express')
const db = require('./db')
const { convertCurrencyWithFallback } = require('./currency')

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

// POST /api/project/budget/currency endpoint
endpoints.post('/project/budget/currency', (req, res) => {
  const { year, projectName, currency } = req.body
  
  // Request validation
  if (!year || !projectName || !currency) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: year, projectName, and currency are required',
      errorType: 'VALIDATION_ERROR'
    })
  }
  
  if (isNaN(parseInt(year))) {
    return res.status(400).json({
      success: false,
      error: 'Year must be a valid number',
      errorType: 'VALIDATION_ERROR'
    })
  }
  
  // Find project by name and year
  const query = 'SELECT * FROM project WHERE projectName = ? AND year = ?'
  
  db.query(query, [projectName, parseInt(year)], (err, rows) => {
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
        error: `Project "${projectName}" for year ${year} not found`,
        errorType: 'NOT_FOUND'
      })
    }
    
    const project = rows[0]
    
    // Convert currency
    convertCurrencyWithFallback(project.currency, currency, project.finalBudgetUsd)
      .then(result => {
        res.status(200).json({
          success: true,
          data: {
            projectId: project.projectId,
            projectName: project.projectName,
            year: project.year,
            originalCurrency: project.currency,
            originalAmount: project.finalBudgetUsd,
            targetCurrency: currency,
            convertedAmount: result.convertedAmount,
            exchangeRate: result.rate,
            fallbackUsed: result.fallback || false
          }
        })
      })
      .catch(error => {
        console.error('Currency conversion error:', error)
        res.status(500).json({
          success: false,
          error: 'Currency conversion failed',
          errorType: 'CONVERSION_ERROR',
          details: error.error || error.message
        })
      })
  })
})

module.exports = endpoints
