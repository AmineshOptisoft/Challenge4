// Internal dependencies
const db = require('../db')

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

// Helper function to check if table exists (for SQLite)
async function tableExists(tableName) {
  try {
    const sql = 'SELECT name FROM sqlite_master WHERE type="table" AND name=?'
    const result = await executeQuery(sql, [tableName])
    return result.length > 0
  } catch (error) {
    // For MySQL, try a different approach
    try {
      const sql = 'SHOW TABLES LIKE ?'
      const result = await executeQuery(sql, [tableName])
      return result.length > 0
    } catch (mysqlError) {
      return false
    }
  }
}

// Helper function to get table row count
async function getTableRowCount(tableName) {
  const sql = `SELECT COUNT(*) as count FROM ${tableName}`
  const result = await executeQuery(sql)
  return result[0].count
}

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    // Delete test projects (IDs > 10000)
    const sql = 'DELETE FROM project WHERE projectId > 10000'
    await executeQuery(sql)
    return { success: true, message: 'Test data cleaned up' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

module.exports = {
  executeQuery,
  tableExists,
  getTableRowCount,
  cleanupTestData
} 