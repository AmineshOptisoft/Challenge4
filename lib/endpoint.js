const express = require('express')
const db = require('./db')
const currencyService = require('./currency')

const endpoints = express.Router()

// Health check endpoint
endpoints.get('/ok', (req, res) => {
  res.status(200).json({ ok: true })
})

// GET /api/project/budget/:id - Get project budget by ID
endpoints.get('/project/budget/:id', (req, res) => {
  const projectId = parseInt(req.params.id)
  
  if (isNaN(projectId)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid project ID' 
    })
  }

  const query = 'SELECT * FROM project WHERE projectId = ?'
  
  db.query(query, [projectId], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      })
    }

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found' 
      })
    }

    const project = rows[0]
    res.status(200).json({
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
    })
  })
})

// POST /api/project/budget/currency - Get project budget with currency conversion
endpoints.post('/project/budget/currency', (req, res) => {
  const { year, projectName, currency } = req.body

  // Validate required fields
  if (!year || !projectName || !currency) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: year, projectName, currency'
    })
  }

  if (isNaN(year)) {
    return res.status(400).json({
      success: false,
      error: 'Year must be a valid number'
    })
  }

  const query = 'SELECT * FROM project WHERE projectName = ? AND year = ?'
  
  db.query(query, [projectName, year], async (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({
        success: false,
        error: 'Database error'
      })
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    const project = rows[0]
    
    try {
      // Convert final budget USD to target currency
      const conversionResult = await currencyService.convertCurrency(
        project.finalBudgetUsd,
        'USD',
        currency,
        project.year,
        '01', // Default to January 1st for historical conversion
        '01'
      )

      res.status(200).json({
        success: true,
        data: [{
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
          [`finalBudget${currency}`]: parseFloat(conversionResult.convertedAmount.toFixed(2))
        }]
      })
    } catch (conversionError) {
      console.error('Currency conversion error:', conversionError)
      res.status(500).json({
        success: false,
        error: 'Currency conversion failed'
      })
    }
  })
})

// POST /api/project/budget - Add new project budget data
endpoints.post('/project/budget', (req, res) => {
  const {
    projectId,
    projectName,
    year,
    currency,
    initialBudgetLocal,
    budgetUsd,
    initialScheduleEstimateMonths,
    adjustedScheduleEstimateMonths,
    contingencyRate,
    escalationRate,
    finalBudgetUsd
  } = req.body

  // Validate required fields
  if (!projectId || !projectName || !year || !currency || 
      initialBudgetLocal === undefined || budgetUsd === undefined ||
      initialScheduleEstimateMonths === undefined || adjustedScheduleEstimateMonths === undefined ||
      contingencyRate === undefined || escalationRate === undefined || finalBudgetUsd === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    })
  }

  // Check if project already exists
  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  db.query(checkQuery, [projectId], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({
        success: false,
        error: 'Database error'
      })
    }

    if (rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Project with this ID already exists'
      })
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
      projectId, projectName, year, currency, initialBudgetLocal,
      budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
      contingencyRate, escalationRate, finalBudgetUsd
    ]

    db.query(insertQuery, values, (err) => {
      if (err) {
        console.error('Database error:', err)
        return res.status(500).json({
          success: false,
          error: 'Database error'
        })
      }

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        projectId
      })
    })
  })
})

// PUT /api/project/budget/:id - Update project budget data
endpoints.put('/project/budget/:id', (req, res) => {
  const projectId = parseInt(req.params.id)
  
  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID'
    })
  }

  const {
    projectName,
    year,
    currency,
    initialBudgetLocal,
    budgetUsd,
    initialScheduleEstimateMonths,
    adjustedScheduleEstimateMonths,
    contingencyRate,
    escalationRate,
    finalBudgetUsd
  } = req.body

  // Validate required fields
  if (!projectName || !year || !currency || 
      initialBudgetLocal === undefined || budgetUsd === undefined ||
      initialScheduleEstimateMonths === undefined || adjustedScheduleEstimateMonths === undefined ||
      contingencyRate === undefined || escalationRate === undefined || finalBudgetUsd === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    })
  }

  // Check if project exists
  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  db.query(checkQuery, [projectId], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({
        success: false,
        error: 'Database error'
      })
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    // Update project
    const updateQuery = `
      UPDATE project SET 
        projectName = ?, year = ?, currency = ?, initialBudgetLocal = ?,
        budgetUsd = ?, initialScheduleEstimateMonths = ?, adjustedScheduleEstimateMonths = ?,
        contingencyRate = ?, escalationRate = ?, finalBudgetUsd = ?
      WHERE projectId = ?
    `
    
    const values = [
      projectName, year, currency, initialBudgetLocal,
      budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
      contingencyRate, escalationRate, finalBudgetUsd, projectId
    ]

    db.query(updateQuery, values, (err) => {
      if (err) {
        console.error('Database error:', err)
        return res.status(500).json({
          success: false,
          error: 'Database error'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        projectId
      })
    })
  })
})

// DELETE /api/project/budget/:id - Delete project budget data
endpoints.delete('/project/budget/:id', (req, res) => {
  const projectId = parseInt(req.params.id)
  
  if (isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID'
    })
  }

  // Check if project exists
  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  db.query(checkQuery, [projectId], (err, rows) => {
    if (err) {
      console.error('Database error:', err)
      return res.status(500).json({
        success: false,
        error: 'Database error'
      })
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }

    // Delete project
    const deleteQuery = 'DELETE FROM project WHERE projectId = ?'
    db.query(deleteQuery, [projectId], (err) => {
      if (err) {
        console.error('Database error:', err)
        return res.status(500).json({
          success: false,
          error: 'Database error'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
        projectId
      })
    })
  })
})

module.exports = endpoints
