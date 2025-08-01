// External dependencies
const express = require('express')

// Internal dependencies
const { processCurrencyConversion } = require('../services/currency')
const { validateCurrencyRequest } = require('../services/validation')
const { getProjectsByNameAndYear } = require('../services/projects')
const { sendSuccessResponse, sendBadRequestResponse, sendNotFoundResponse, sendInternalServerError } = require('../utils/response')

const router = express.Router()

// POST /project/budget/currency - Find budget details with currency conversion
router.post('/project/budget/currency', async (req, res) => {
  try {
    const { year, projectName, currency } = req.body

    // Validate required fields
    const validation = validateCurrencyRequest({ year, projectName, currency })
    if (!validation.valid) {
      return sendBadRequestResponse(res, validation.error)
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
    console.error('Error in currency conversion endpoint:', error)
    sendInternalServerError(res)
  }
})

module.exports = router
