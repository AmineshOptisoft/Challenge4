// External dependencies
const express = require('express')

// Internal dependencies
const {
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  projectExists
} = require('../services/projects')
const {
  validateProjectData,
  validateProjectId,
  validateUpdateData
} = require('../services/validation')
const {
  sendResponse,
  sendBadRequestResponse,
  sendNotFoundResponse,
  sendCreatedResponse,
  sendConflictResponse,
  sendInternalServerError
} = require('../utils/response')

const router = express.Router()

// GET /project/budget/:id - Get project by ID
router.get('/project/budget/:id', async (req, res) => {
  try {
    const validation = validateProjectId(req.params.id)
    if (!validation.valid) {
      return sendBadRequestResponse(res, validation.error)
    }

    const project = await getProjectById(validation.projectId)

    if (!project) {
      return sendNotFoundResponse(res, 'Project not found')
    }

    sendResponse(res, 200, project)
  } catch (error) {
    console.error('Error in get project endpoint:', error)
    sendInternalServerError(res)
  }
})

// POST /project/budget - Create new project
router.post('/project/budget', async (req, res) => {
  try {
    const projectData = req.body

    // Validate required fields
    const validation = validateProjectData(projectData)
    if (!validation.valid) {
      return sendBadRequestResponse(res, validation.error)
    }

    // Check if project already exists
    const exists = await projectExists(projectData.projectId)
    if (exists) {
      return sendConflictResponse(res, 'Project with this ID already exists')
    }

    // Create new project
    const createdProject = await createProject(projectData)

    sendCreatedResponse(res, createdProject)
  } catch (error) {
    console.error('Error in create project endpoint:', error)
    sendInternalServerError(res)
  }
})

// PUT /project/budget/:id - Update project
router.put('/project/budget/:id', async (req, res) => {
  try {
    const validation = validateProjectId(req.params.id)
    if (!validation.valid) {
      return sendBadRequestResponse(res, validation.error)
    }

    const updateData = req.body

    // Validate required fields (excluding projectId)
    const updateValidation = validateUpdateData(updateData)
    if (!updateValidation.valid) {
      return sendBadRequestResponse(res, updateValidation.error)
    }

    // Check if project exists
    const exists = await projectExists(validation.projectId)
    if (!exists) {
      return sendNotFoundResponse(res, 'Project not found')
    }

    // Update project
    const result = await updateProject(validation.projectId, updateData)

    sendResponse(res, 200, result)
  } catch (error) {
    console.error('Error in update project endpoint:', error)
    sendInternalServerError(res)
  }
})

// DELETE /project/budget/:id - Delete project
router.delete('/project/budget/:id', async (req, res) => {
  try {
    const validation = validateProjectId(req.params.id)
    if (!validation.valid) {
      return sendBadRequestResponse(res, validation.error)
    }

    // Check if project exists
    const exists = await projectExists(validation.projectId)
    if (!exists) {
      return sendNotFoundResponse(res, 'Project not found')
    }

    // Delete project
    const result = await deleteProject(validation.projectId)

    sendResponse(res, 200, result)
  } catch (error) {
    console.error('Error in delete project endpoint:', error)
    sendInternalServerError(res)
  }
})

module.exports = router
