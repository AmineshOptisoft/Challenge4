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

/**
 * Validate project creation request
 * @param {Object} body - Request body
 * @returns {Object} - Validation result with isValid and error properties
 */
function validateProjectCreation(body) {
  const requiredFields = [
    'projectId', 'projectName', 'year', 'currency', 
    'initialBudgetLocal', 'budgetUsd', 'initialScheduleEstimateMonths',
    'adjustedScheduleEstimateMonths', 'contingencyRate', 
    'escalationRate', 'finalBudgetUsd'
  ]
  
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      return {
        isValid: false,
        error: `Missing required field: ${field}`
      }
    }
  }
  
  // Validate numeric fields
  const numericFields = [
    'projectId', 'year', 'initialBudgetLocal', 'budgetUsd',
    'initialScheduleEstimateMonths', 'adjustedScheduleEstimateMonths',
    'contingencyRate', 'escalationRate', 'finalBudgetUsd'
  ]
  
  for (const field of numericFields) {
    if (isNaN(parseFloat(body[field]))) {
      return {
        isValid: false,
        error: `Field ${field} must be a valid number`
      }
    }
  }
  
  // Validate year range
  const year = parseInt(body.year)
  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      error: 'Year must be between 1900 and 2100'
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
 * POST /api/project/budget
 * Create a new project
 */
endpoints.post('/project/budget', (req, res) => {
  // Request validation
  const validation = validateProjectCreation(req.body)
  if (!validation.isValid) {
    return sendErrorResponse(res, validation.error, 'VALIDATION_ERROR', 400)
  }
  
  const projectData = req.body
  
  // Check if project already exists
  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  db.query(checkQuery, [parseInt(projectData.projectId)], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return sendErrorResponse(res, 'Database error occurred', 'DATABASE_ERROR', 500)
    }
    
    if (rows && rows.length > 0) {
      return sendErrorResponse(res, `Project with ID ${projectData.projectId} already exists`, 'CONFLICT', 409)
    }
    
    // Insert new project
    const insertQuery = `
      INSERT INTO project (
        projectId, projectName, year, currency, initialBudgetLocal,
        budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
        contingencyRate, escalationRate, finalBudgetUsd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const values = [
      parseInt(projectData.projectId),
      projectData.projectName,
      parseInt(projectData.year),
      projectData.currency,
      parseFloat(projectData.initialBudgetLocal),
      parseFloat(projectData.budgetUsd),
      parseInt(projectData.initialScheduleEstimateMonths),
      parseInt(projectData.adjustedScheduleEstimateMonths),
      parseFloat(projectData.contingencyRate),
      parseFloat(projectData.escalationRate),
      parseFloat(projectData.finalBudgetUsd)
    ]
    
    db.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error('Database insertion error:', err)
        return sendErrorResponse(res, 'Failed to create project', 'DATABASE_ERROR', 500)
      }
      
      sendSuccessResponse(res, {
        message: 'Project created successfully',
        projectId: projectData.projectId
      }, 201)
    })
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

/**
 * PUT /api/project/budget/:id
 * Update an existing project
 */
endpoints.put('/project/budget/:id', (req, res) => {
  const projectId = req.params.id
  
  // Input validation for project ID
  if (!validateProjectId(projectId)) {
    return sendErrorResponse(res, 'Invalid project ID. Must be a valid number.', 'VALIDATION_ERROR', 400)
  }
  
  // Request validation
  const validation = validateProjectCreation(req.body)
  if (!validation.isValid) {
    return sendErrorResponse(res, validation.error, 'VALIDATION_ERROR', 400)
  }
  
  const projectData = req.body
  
  // Check if project exists
  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  db.query(checkQuery, [parseInt(projectId)], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return sendErrorResponse(res, 'Database error occurred', 'DATABASE_ERROR', 500)
    }
    
    if (!rows || rows.length === 0) {
      return sendErrorResponse(res, `Project with ID ${projectId} not found`, 'NOT_FOUND', 404)
    }
    
    // Check if new projectId conflicts with existing project (if different)
    if (parseInt(projectData.projectId) !== parseInt(projectId)) {
      const conflictQuery = 'SELECT projectId FROM project WHERE projectId = ? AND projectId != ?'
      db.query(conflictQuery, [parseInt(projectData.projectId), parseInt(projectId)], (err, conflictRows) => {
        if (err) {
          console.error('Database error:', err)
          return sendErrorResponse(res, 'Database error occurred', 'DATABASE_ERROR', 500)
        }
        
        if (conflictRows && conflictRows.length > 0) {
          return sendErrorResponse(res, `Project with ID ${projectData.projectId} already exists`, 'CONFLICT', 409)
        }
        
        // Update project
        updateProject(projectId, projectData, res)
      })
    } else {
      // Update project (no ID change)
      updateProject(projectId, projectData, res)
    }
  })
})

/**
 * DELETE /api/project/budget/:id
 * Delete an existing project
 */
endpoints.delete('/project/budget/:id', (req, res) => {
  const projectId = req.params.id
  
  // Input validation for project ID
  if (!validateProjectId(projectId)) {
    return sendErrorResponse(res, 'Invalid project ID. Must be a valid number.', 'VALIDATION_ERROR', 400)
  }
  
  // Check if project exists
  const checkQuery = 'SELECT projectId, projectName FROM project WHERE projectId = ?'
  db.query(checkQuery, [parseInt(projectId)], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return sendErrorResponse(res, 'Database error occurred', 'DATABASE_ERROR', 500)
    }
    
    if (!rows || rows.length === 0) {
      return sendErrorResponse(res, `Project with ID ${projectId} not found`, 'NOT_FOUND', 404)
    }
    
    const project = rows[0]
    
    // Delete project
    const deleteQuery = 'DELETE FROM project WHERE projectId = ?'
    db.query(deleteQuery, [parseInt(projectId)], (err, result) => {
      if (err) {
        console.error('Database deletion error:', err)
        return sendErrorResponse(res, 'Failed to delete project', 'DATABASE_ERROR', 500)
      }
      
      sendSuccessResponse(res, {
        message: 'Project deleted successfully',
        deletedProject: {
          projectId: project.projectId,
          projectName: project.projectName
        }
      }, 200)
    })
  })
})

/**
 * Helper function to update project
 * @param {string} projectId - Original project ID
 * @param {Object} projectData - Updated project data
 * @param {Object} res - Express response object
 */
function updateProject(projectId, projectData, res) {
  const updateQuery = `
    UPDATE project SET
      projectId = ?, projectName = ?, year = ?, currency = ?,
      initialBudgetLocal = ?, budgetUsd = ?, initialScheduleEstimateMonths = ?,
      adjustedScheduleEstimateMonths = ?, contingencyRate = ?,
      escalationRate = ?, finalBudgetUsd = ?
    WHERE projectId = ?
  `
  
  const values = [
    parseInt(projectData.projectId),
    projectData.projectName,
    parseInt(projectData.year),
    projectData.currency,
    parseFloat(projectData.initialBudgetLocal),
    parseFloat(projectData.budgetUsd),
    parseInt(projectData.initialScheduleEstimateMonths),
    parseInt(projectData.adjustedScheduleEstimateMonths),
    parseFloat(projectData.contingencyRate),
    parseFloat(projectData.escalationRate),
    parseFloat(projectData.finalBudgetUsd),
    parseInt(projectId)
  ]
  
  db.query(updateQuery, values, (err, result) => {
    if (err) {
      console.error('Database update error:', err)
      return sendErrorResponse(res, 'Failed to update project', 'DATABASE_ERROR', 500)
    }
    
    sendSuccessResponse(res, {
      message: 'Project updated successfully',
      projectId: projectData.projectId
    }, 200)
  })
}

module.exports = endpoints
