process.env.NODE_ENV = 'test'

// Import all endpoint tests
require('./health.test')
require('./currency.test')
require('./projects.test')
require('./integration.test')
