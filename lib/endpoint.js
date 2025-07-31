const express = require('express')
const db = require('./db')
const { convertCurrencyWithFallback } = require('./currency')

const endpoints = express.Router()

// Standard response helper functions
function sendSuccessResponse(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: data
  })
}

function sendErrorResponse(res, error, errorType, statusCode = 400) {
  res.status(statusCode).json({
    success: false,
    error: error,
    errorType: errorType
  })
}

endpoints.get('/ok', (req, res) => {
  sendSuccessResponse(res, { ok: true })
})

// GET /api/project/budget/:id endpoint
endpoints.get('/project/budget/:id', (req, res) => {
  const projectId = req.params.id
  
  // Input validation for project ID
  if (!projectId || isNaN(parseInt(projectId))) {
    return sendErrorResponse(res, 'Invalid project ID. Must be a valid number.', 'VALIDATION_ERROR', 400)
  }
  
  const query = 'SELECT * FROM project WHERE projectId = ?'
  
  db.query(query, [parseInt(projectId)], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return sendErrorResponse(res, 'Database error occurred', 'DATABASE_ERROR', 500)
    }
    
    if (!rows || rows.length === 0) {
      return sendErrorResponse(res, `Project with ID ${projectId} not found`, 'NOT_FOUND', 404)
    }
    
    const project = rows[0]
    const projectData = {
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
    
    sendSuccessResponse(res, projectData, 200)
  })
})

// POST /api/project/budget/currency endpoint
endpoints.post('/project/budget/currency', (req, res) => {
  const { year, projectName, currency } = req.body
  
  // Request validation
  if (!year || !projectName || !currency) {
    return sendErrorResponse(res, 'Missing required fields: year, projectName, and currency are required', 'VALIDATION_ERROR', 400)
  }
  
  if (isNaN(parseInt(year))) {
    return sendErrorResponse(res, 'Year must be a valid number', 'VALIDATION_ERROR', 400)
  }
  
  // Find project by name and year
  const query = 'SELECT * FROM project WHERE projectName = ? AND year = ?'
  
  db.query(query, [projectName, parseInt(year)], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return sendErrorResponse(res, 'Database error occurred', 'DATABASE_ERROR', 500)
    }
    
    if (!rows || rows.length === 0) {
      return sendErrorResponse(res, `Project "${projectName}" for year ${year} not found`, 'NOT_FOUND', 404)
    }
    
    const project = rows[0]
    
    // Convert currency
    convertCurrencyWithFallback(project.currency, currency, project.finalBudgetUsd)
      .then(result => {
        const conversionData = {
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
        
        sendSuccessResponse(res, conversionData, 200)
      })
      .catch(error => {
        console.error('Currency conversion error:', error)
        sendErrorResponse(res, 'Currency conversion failed', 'CONVERSION_ERROR', 500)
      })
  })
})

module.exports = endpoints
