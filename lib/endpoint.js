const express = require('express')
const db = require('./db')
const { convertCurrencyWithFallback } = require('./currency')

const endpoints = express.Router()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send standardized success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccessResponse(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data: data,
    ok: true
  })
}

/**
 * Send standardized error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {string} errorType - Error type identifier
 * @param {number} statusCode - HTTP status code (default: 400)
 */
function sendErrorResponse(res, error, errorType, statusCode = 400) {
  res.status(statusCode).json({
    success: false,
    error: error,
    errorType: errorType
  })
}

/**
 * Validate project ID parameter
 * @param {string} projectId - Project ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateProjectId(projectId) {
  return projectId && !isNaN(parseInt(projectId))
}

/**
 * Validate currency conversion request
 * @param {Object} body - Request body
 * @returns {Object} - Validation result with isValid and error properties
 */
function validateCurrencyRequest(body) {
  const { year, projectName, currency } = body
  
  if (!year || !projectName || !currency) {
    return {
      isValid: false,
      error: 'Missing required fields: year, projectName, and currency are required'
    }
  }
  
  if (isNaN(parseInt(year))) {
    return {
      isValid: false,
      error: 'Year must be a valid number'
    }
  }
  
  return { isValid: true }
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

endpoints.get('/ok', (req, res) => {
  sendSuccessResponse(res, { ok: true })
})

// ============================================================================
// PROJECT BUDGET ENDPOINTS
// ============================================================================

/**
 * GET /api/project/budget/:id
 * Retrieve project budget data by ID
 */
endpoints.get('/project/budget/:id', (req, res) => {
  const projectId = req.params.id
  
  // Input validation for project ID
  if (!validateProjectId(projectId)) {
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

/**
 * POST /api/project/budget/currency
 * Convert project budget to specified currency
 */
endpoints.post('/project/budget/currency', (req, res) => {
  // Request validation
  const validation = validateCurrencyRequest(req.body)
  if (!validation.isValid) {
    return sendErrorResponse(res, validation.error, 'VALIDATION_ERROR', 400)
  }
  
  const { year, projectName, currency } = req.body
  
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
