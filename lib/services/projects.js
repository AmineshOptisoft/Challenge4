// Internal dependencies
const { executeQuery } = require('../utils/database')

// Helper function to get project by ID
async function getProjectById(id) {
  const sql = 'SELECT * FROM project WHERE projectId = ?'
  const projects = await executeQuery(sql, [id])
  
  if (projects.length === 0) {
    return null
  }
  
  return projects[0]
}

// Helper function to get projects by name and year
async function getProjectsByNameAndYear(projectName, year) {
  const sql = 'SELECT * FROM project WHERE projectName = ? AND year = ?'
  return await executeQuery(sql, [projectName, year])
}

// Helper function to check if project exists
async function projectExists(id) {
  const sql = 'SELECT projectId FROM project WHERE projectId = ?'
  const projects = await executeQuery(sql, [id])
  return projects.length > 0
}

// Helper function to create new project
async function createProject(projectData) {
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
  return projectData
}

// Helper function to update project
async function updateProject(id, updateData) {
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
    id
  ]
  
  await executeQuery(updateSql, values)
  return { success: true, message: 'Project budget updated successfully' }
}

// Helper function to delete project
async function deleteProject(id) {
  const deleteSql = 'DELETE FROM project WHERE projectId = ?'
  await executeQuery(deleteSql, [id])
  return { success: true, message: 'Project deleted successfully' }
}

// Helper function to get all projects (for testing)
async function getAllProjects() {
  const sql = 'SELECT * FROM project'
  return await executeQuery(sql)
}

// Helper function to get project count (for testing)
async function getProjectCount() {
  const sql = 'SELECT COUNT(*) as count FROM project'
  const result = await executeQuery(sql)
  return result[0].count
}

module.exports = {
  getProjectById,
  getProjectsByNameAndYear,
  projectExists,
  createProject,
  updateProject,
  deleteProject,
  getAllProjects,
  getProjectCount
} 