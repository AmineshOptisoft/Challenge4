// External dependencies
const express = require('express')

// Internal dependencies
const { sendResponse } = require('../utils/response')

const router = express.Router()

// Health check endpoint
router.get('/ok', (req, res) => {
  sendResponse(res, 200, { ok: true })
})

module.exports = router 