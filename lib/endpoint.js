const express = require('express')
const db = require('./db')

const endpoints = express.Router()

// Currency conversion API configuration
const CURRENCY_API_KEY = process.env.CURRENCY_API_KEY || 'a0426cd75e068086aa6de9ae'
const CURRENCY_API_BASE = 'https://v6.exchangerate-api.com/v6'

// Helper function to convert currency using historical rates
async function convertCurrency(amount, fromCurrency, toCurrency, year, month, day) {
  try {
    const url = `${CURRENCY_API_BASE}/${CURRENCY_API_KEY}/history/${fromCurrency}/${year}/${month}/${day}/${amount}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.conversion_result
  } catch (error) {
    console.error('Currency conversion error:', error)
    throw error
  }
}

// Helper function to validate project data
function validateProjectData(data) {
  const requiredFields = ['projectName', 'year', 'currency', 'initialBudgetLocal', 
                         'budgetUsd', 'initialScheduleEstimateMonths', 
                         'adjustedScheduleEstimateMonths', 'contingencyRate', 
                         'escalationRate', 'finalBudgetUsd']
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` }
    }
  }
  
  return { valid: true }
}

// Helper function to execute database queries
function executeQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err)
      } else {
        resolve(results)
      }
    })
  })
}

// 1. POST /project/budget/currency - Find budget details with currency conversion
endpoints.post('/project/budget/currency', async (req, res) => {
  try {
    const { year, projectName, currency } = req.body
    
    // Validate required fields
    if (!year || !projectName || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: year, projectName, currency'
      })
    }
    
    // Find projects by name and year
    const sql = 'SELECT * FROM project WHERE projectName = ? AND year = ?'
    const projects = await executeQuery(sql, [projectName, year])
    
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No projects found with the specified name and year'
      })
    }
    
    // Convert currency for each project
    const convertedProjects = []
    for (const project of projects) {
      let finalBudgetTtd = null
      
      if (currency.toUpperCase() === 'TTD') {
        try {
          // Use the year as the conversion date (approximate)
          const conversionResult = await convertCurrency(
            project.finalBudgetUsd,
            'USD',
            'TTD',
            project.year,
            1, // January
            1  // 1st day
          )
          finalBudgetTtd = conversionResult.converted_amount
        } catch (error) {
          console.error('Currency conversion failed:', error)
          // Continue without conversion if API fails
        }
      }
      
      convertedProjects.push({
        ...project,
        finalBudgetTtd
      })
    }
    
    res.status(200).json({
      success: true,
      data: convertedProjects
    })
    
  } catch (error) {
    console.error('Error in currency conversion endpoint:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// 2. GET /project/budget/:id - Get project by ID
endpoints.get('/project/budget/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id)    
    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
    }
    
    const sql = 'SELECT * FROM project WHERE projectId = ?'
    const projects = await executeQuery(sql, [projectId])
    
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }
    
    res.status(200).json(projects[0])
    
  } catch (error) {
    console.error('Error in get project endpoint:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// 3. POST /project/budget - Create new project
endpoints.post('/project/budget', async (req, res) => {
  try {
    const projectData = req.body
    
    // Validate required fields
    const validation = validateProjectData(projectData)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      })
    }
    
    // Check if project already exists
    const checkSql = 'SELECT projectId FROM project WHERE projectId = ?'
    const existingProjects = await executeQuery(checkSql, [projectData.projectId])
    
    if (existingProjects.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Project with this ID already exists'
      })
    }
    
    // Insert new project
    const insertSql = `
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
    
    await executeQuery(insertSql, values)
    
    res.status(201).json(projectData)
    
  } catch (error) {
    console.error('Error in create project endpoint:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// 4. PUT /project/budget/:id - Update project
endpoints.put('/project/budget/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id)
    const updateData = req.body
    
    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
    }
    
    // Validate required fields (excluding projectId)
    const validation = validateProjectData(updateData)
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      })
    }
    
    // Check if project exists
    const checkSql = 'SELECT projectId FROM project WHERE projectId = ?'
    const existingProjects = await executeQuery(checkSql, [projectId])
    
    if (existingProjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }
    
    // Update project
    const updateSql = `
      UPDATE project SET
        projectName = ?, year = ?, currency = ?, initialBudgetLocal = ?,
        budgetUsd = ?, initialScheduleEstimateMonths = ?, adjustedScheduleEstimateMonths = ?,
        contingencyRate = ?, escalationRate = ?, finalBudgetUsd = ?
      WHERE projectId = ?
    `
    
    const values = [
      updateData.projectName,
      updateData.year,
      updateData.currency,
      updateData.initialBudgetLocal,
      updateData.budgetUsd,
      updateData.initialScheduleEstimateMonths,
      updateData.adjustedScheduleEstimateMonths,
      updateData.contingencyRate,
      updateData.escalationRate,
      updateData.finalBudgetUsd,
      projectId
    ]
    
    await executeQuery(updateSql, values)
    
    res.status(200).json({
      success: true,
      message: 'Project budget updated successfully'
    })
    
  } catch (error) {
    console.error('Error in update project endpoint:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// 5. DELETE /project/budget/:id - Delete project
endpoints.delete('/project/budget/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id)
    
    if (isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      })
    }
    
    // Check if project exists
    const checkSql = 'SELECT projectId FROM project WHERE projectId = ?'
    const existingProjects = await executeQuery(checkSql, [projectId])
    
    if (existingProjects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      })
    }
    
    // Delete project
    const deleteSql = 'DELETE FROM project WHERE projectId = ?'
    await executeQuery(deleteSql, [projectId])
    
    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    })
    
  } catch (error) {
    console.error('Error in delete project endpoint:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Health check endpoint
endpoints.get('/ok', (req, res) => {
  res.status(200).json({ ok: true })
})

module.exports = endpoints
