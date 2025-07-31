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

// Helper function to validate currency conversion request
function validateCurrencyRequest(data) {
  const { year, projectName, currency } = data
  
  if (!year || !projectName || !currency) {
    return { 
      valid: false, 
      error: 'Missing required fields: year, projectName, currency' 
    }
  }
  
  if (typeof year !== 'number' || year < 1900 || year > 2100) {
    return { 
      valid: false, 
      error: 'Invalid year: must be a number between 1900 and 2100' 
    }
  }
  
  if (typeof projectName !== 'string' || projectName.trim().length === 0) {
    return { 
      valid: false, 
      error: 'Invalid projectName: must be a non-empty string' 
    }
  }
  
  if (typeof currency !== 'string' || currency.trim().length === 0) {
    return { 
      valid: false, 
      error: 'Invalid currency: must be a non-empty string' 
    }
  }
  
  return { valid: true }
}

// Helper function to validate project ID
function validateProjectId(id) {
  const projectId = parseInt(id)
  
  if (isNaN(projectId)) {
    return { valid: false, error: 'Invalid project ID' }
  }
  
  if (projectId <= 0) {
    return { valid: false, error: 'Project ID must be a positive number' }
  }
  
  return { valid: true, projectId }
}

// Helper function to validate update data (excludes projectId)
function validateUpdateData(data) {
  const validation = validateProjectData(data)
  if (!validation.valid) {
    return validation
  }
  
  return { valid: true }
}

module.exports = {
  validateProjectData,
  validateCurrencyRequest,
  validateProjectId,
  validateUpdateData
} 