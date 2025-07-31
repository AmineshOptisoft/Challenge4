// External dependencies
const express = require('express')

// Internal dependencies
const { processCurrencyConversion } = require('../services/currency')
const { validateCurrencyRequest } = require('../services/validation')
const { getProjectsByNameAndYear } = require('../services/projects')
const { sendSuccessResponse, sendBadRequestResponse, sendNotFoundResponse, sendInternalServerError } = require('../utils/response')

const router = express.Router()

// Specific projects array for TTD conversion
const SPECIFIC_PROJECTS = [
  'Peking roasted duck Chanel',
  'Choucroute Cartier', 
  'Rigua Nintendo',
  'Llapingacho Instagram'
]

// POST /api-conversion - Convert specific projects to TTD
router.post('/api-conversion', async (req, res) => {
  try {
    const { year, projectName, currency } = req.body
    
    // Validate required fields
    const validation = validateCurrencyRequest({ year, projectName, currency })
    if (!validation.valid) {
      return sendBadRequestResponse(res, validation.error)
    }
    
    // Check if the project is in our specific list
    if (!SPECIFIC_PROJECTS.includes(projectName)) {
      return sendBadRequestResponse(res, 'Project not in the specific conversion list')
    }
    
    // Find projects by name and year
    const projects = await getProjectsByNameAndYear(projectName, year)
    
    if (projects.length === 0) {
      return sendNotFoundResponse(res, 'No projects found with the specified name and year')
    }
    
    // Convert currency for each project
    const convertedProjects = await processCurrencyConversion(projects, currency)
    
    sendSuccessResponse(res, convertedProjects)
    
  } catch (error) {
    console.error('Error in api-conversion endpoint:', error)
    sendInternalServerError(res)
  }
})

module.exports = router 