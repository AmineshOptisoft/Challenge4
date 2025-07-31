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

/**
 * Helper function to handle database transactions
 * @param {Function} operations - Array of database operations
 * @param {Object} res - Express response object
 */
function executeTransaction(operations, res) {
  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction begin error:', err)
      return sendErrorResponse(res, 'Failed to start transaction', 'DATABASE_ERROR', 500)
    }
    
    let operationIndex = 0
    
    function executeNextOperation() {
      if (operationIndex >= operations.length) {
        // All operations completed successfully
        db.commit((err) => {
          if (err) {
            console.error('Transaction commit error:', err)
            return db.rollback(() => {
              sendErrorResponse(res, 'Failed to commit transaction', 'DATABASE_ERROR', 500)
            })
          }
          sendSuccessResponse(res, { message: 'Transaction completed successfully' }, 200)
        })
        return
      }
      
      const operation = operations[operationIndex]
      operation((err, result) => {
        if (err) {
          console.error('Transaction operation error:', err)
          return db.rollback(() => {
            sendErrorResponse(res, 'Transaction failed', 'DATABASE_ERROR', 500)
          })
        }
        
        operationIndex++
        executeNextOperation()
      })
    }
    
    executeNextOperation()
  })
}

/**
 * Standardized error handler for write operations
 * @param {Error} error - Database error
 * @param {Object} res - Express response object
 * @param {string} operation - Operation name for logging
 */
function handleWriteError(error, res, operation) {
  console.error(`${operation} error:`, error)
  
  // Handle specific database errors
  if (error.code === 'ER_DUP_ENTRY') {
    return sendErrorResponse(res, 'Duplicate entry found', 'CONFLICT', 409)
  }
  
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return sendErrorResponse(res, 'Referenced record not found', 'NOT_FOUND', 404)
  }
  
  if (error.code === 'ER_DATA_TOO_LONG') {
    return sendErrorResponse(res, 'Data too long for field', 'VALIDATION_ERROR', 400)
  }
  
  // Generic database error
  return sendErrorResponse(res, 'Database operation failed', 'DATABASE_ERROR', 500)
}

/**
 * Validate and sanitize project data
 * @param {Object} projectData - Project data to validate
 * @returns {Object} - Validation result with isValid, error, and sanitizedData properties
 */
function validateAndSanitizeProjectData(projectData) {
  const validation = validateProjectCreation(projectData)
  if (!validation.isValid) {
    return validation
  }
  
  // Sanitize data
  const sanitizedData = {
    projectId: parseInt(projectData.projectId),
    projectName: String(projectData.projectName).trim(),
    year: parseInt(projectData.year),
    currency: String(projectData.currency).toUpperCase(),
    initialBudgetLocal: parseFloat(projectData.initialBudgetLocal),
    budgetUsd: parseFloat(projectData.budgetUsd),
    initialScheduleEstimateMonths: parseInt(projectData.initialScheduleEstimateMonths),
    adjustedScheduleEstimateMonths: parseInt(projectData.adjustedScheduleEstimateMonths),
    contingencyRate: parseFloat(projectData.contingencyRate),
    escalationRate: parseFloat(projectData.escalationRate),
    finalBudgetUsd: parseFloat(projectData.finalBudgetUsd)
  }
  
  return {
    isValid: true,
    sanitizedData: sanitizedData
  }
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
    
    res.status(200).json(projectData)
  })
})

/**
 * POST /api/project/budget
 * Create a new project
 */
endpoints.post('/project/budget', (req, res) => {
  // Request validation and sanitization
  const validation = validateAndSanitizeProjectData(req.body)
  if (!validation.isValid) {
    return sendErrorResponse(res, validation.error, 'VALIDATION_ERROR', 400)
  }
  
  const projectData = validation.sanitizedData
  
  // Check if project already exists
  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  db.query(checkQuery, [projectData.projectId], (err, rows) => {
    if (err) {
      return handleWriteError(err, res, 'Project existence check')
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
      projectData.projectId,
      projectData.projectName,
      projectData.year,
      projectData.currency,
      projectData.initialBudgetLocal,
      projectData.budgetUsd,
      projectData.initialScheduleEstimateMonths,
      projectData.adjustedScheduleEstimateMonths,
      projectData.contingencyRate,
      projectData.escalationRate,
      projectData.finalBudgetUsd
    ]
    
    db.query(insertQuery, values, (err, result) => {
      if (err) {
        return handleWriteError(err, res, 'Project creation')
      }
      
      res.status(201).json({
        projectId: projectData.projectId,
        projectName: projectData.projectName,
        year: projectData.year,
        currency: projectData.currency,
        initialBudgetLocal: projectData.initialBudgetLocal,
        budgetUsd: projectData.budgetUsd,
        initialScheduleEstimateMonths: projectData.initialScheduleEstimateMonths,
        adjustedScheduleEstimateMonths: projectData.adjustedScheduleEstimateMonths,
        contingencyRate: projectData.contingencyRate,
        escalationRate: projectData.escalationRate,
        finalBudgetUsd: projectData.finalBudgetUsd
      })
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
          currency: project.currency,
          initialBudgetLocal: project.initialBudgetLocal,
          budgetUsd: project.budgetUsd,
          initialScheduleEstimateMonths: project.initialScheduleEstimateMonths,
          adjustedScheduleEstimateMonths: project.adjustedScheduleEstimateMonths,
          contingencyRate: project.contingencyRate,
          escalationRate: project.escalationRate,
          finalBudgetUsd: project.finalBudgetUsd,
          finalBudgetTtd: result.convertedAmount
        }
        
        res.status(200).json({
          success: true,
          data: [conversionData]
        })
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
      
      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      })
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
    
    res.status(200).json({
      projectId: projectData.projectId,
      projectName: projectData.projectName,
      year: projectData.year,
      currency: projectData.currency,
      initialBudgetLocal: projectData.initialBudgetLocal,
      budgetUsd: projectData.budgetUsd,
      initialScheduleEstimateMonths: projectData.initialScheduleEstimateMonths,
      adjustedScheduleEstimateMonths: projectData.adjustedScheduleEstimateMonths,
      contingencyRate: projectData.contingencyRate,
      escalationRate: projectData.escalationRate,
      finalBudgetUsd: projectData.finalBudgetUsd
    })
  })
}

/**
 * GET /api-conversion
 * Convert specific projects to Trinidad and Tobago dollar (TTD)
 */
endpoints.get('/api-conversion', (req, res) => {
  const specificProjects = [
    { name: 'Peking roasted duck Chanel', year: 2000 },
    { name: 'Choucroute Cartier', year: 2000 },
    { name: 'Rigua Nintendo', year: 2001 },
    { name: 'Llapingacho Instagram', year: 2000 }
  ]
  
  const results = []
  let completedConversions = 0
  const totalProjects = specificProjects.length
  
  specificProjects.forEach(project => {
    // Find project by name and year
    const query = 'SELECT * FROM project WHERE projectName = ? AND year = ?'
    
    db.query(query, [project.name, project.year], (err, rows) => {
      if (err) {
        console.error('Database error:', err)
        return sendErrorResponse(res, 'Database error occurred', 'DATABASE_ERROR', 500)
      }
      
      if (!rows || rows.length === 0) {
        console.error(`Project "${project.name}" for year ${project.year} not found`)
        completedConversions++
        if (completedConversions === totalProjects) {
          res.status(200).json({
            success: true,
            data: results
          })
        }
        return
      }
      
      const dbProject = rows[0]
      
      // Convert to TTD
      convertCurrencyWithFallback(dbProject.currency, 'TTD', dbProject.finalBudgetUsd)
        .then(result => {
          const conversionData = {
            projectId: dbProject.projectId,
            projectName: dbProject.projectName,
            year: dbProject.year,
            currency: dbProject.currency,
            initialBudgetLocal: dbProject.initialBudgetLocal,
            budgetUsd: dbProject.budgetUsd,
            initialScheduleEstimateMonths: dbProject.initialScheduleEstimateMonths,
            adjustedScheduleEstimateMonths: dbProject.adjustedScheduleEstimateMonths,
            contingencyRate: dbProject.contingencyRate,
            escalationRate: dbProject.escalationRate,
            finalBudgetUsd: dbProject.finalBudgetUsd,
            finalBudgetTtd: result.convertedAmount
          }
          
          results.push(conversionData)
          
          completedConversions++
          if (completedConversions === totalProjects) {
            res.status(200).json({
              success: true,
              data: results
            })
          }
        })
        .catch(error => {
          console.error('Currency conversion error:', error)
          completedConversions++
          if (completedConversions === totalProjects) {
            res.status(200).json({
              success: true,
              data: results
            })
          }
        })
    })
  })
})

module.exports = endpoints
