// External dependencies
const express = require('express')

// Internal dependencies
const currencyRouter = require('./currency')
const projectsRouter = require('./projects')
const healthRouter = require('./health')
const conversionRouter = require('./conversion')

const router = express.Router()

// Mount all endpoint routers
router.use('/', currencyRouter)
router.use('/', projectsRouter)
router.use('/', healthRouter)
router.use('/', conversionRouter)

module.exports = router 