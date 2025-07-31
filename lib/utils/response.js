// Helper function to send success response
function sendResponse(res, statusCode, data) {
  res.status(statusCode).json(data)
}

// Helper function to send error response
function sendError(res, statusCode, message) {
  res.status(statusCode).json({
    success: false,
    error: message
  })
}

// Helper function to send success response with data
function sendSuccessResponse(res, data) {
  res.status(200).json({
    success: true,
    data: data
  })
}

// Helper function to send created response
function sendCreatedResponse(res, data) {
  res.status(201).json(data)
}

// Helper function to send not found response
function sendNotFoundResponse(res, message = 'Resource not found') {
  res.status(404).json({
    success: false,
    error: message
  })
}

// Helper function to send bad request response
function sendBadRequestResponse(res, message = 'Bad request') {
  res.status(400).json({
    success: false,
    error: message
  })
}

// Helper function to send conflict response
function sendConflictResponse(res, message = 'Resource conflict') {
  res.status(409).json({
    success: false,
    error: message
  })
}

// Helper function to send internal server error response
function sendInternalServerError(res, message = 'Internal server error') {
  res.status(500).json({
    success: false,
    error: message
  })
}

module.exports = {
  sendResponse,
  sendError,
  sendSuccessResponse,
  sendCreatedResponse,
  sendNotFoundResponse,
  sendBadRequestResponse,
  sendConflictResponse,
  sendInternalServerError
} 