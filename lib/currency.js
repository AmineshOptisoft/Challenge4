const https = require('https')
const config = require('../config')

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6'
const API_KEY = config.currency.apiKey || 'b2c3388fb59cad9fada6e3f8'

function convertCurrency(fromCurrency, toCurrency, amount) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}/${API_KEY}/latest/${fromCurrency}`
    
    https.get(url, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          
          if (response.result === 'success') {
            const rate = response.conversion_rates[toCurrency]
            if (rate) {
              const convertedAmount = amount * rate
              resolve({
                success: true,
                fromCurrency,
                toCurrency,
                amount,
                rate,
                convertedAmount
              })
            } else {
              reject({
                success: false,
                error: `Currency ${toCurrency} not found in response`,
                errorType: 'CURRENCY_NOT_FOUND'
              })
            }
          } else {
            reject({
              success: false,
              error: `API Error: ${response.error_type || 'Unknown error'}`,
              errorType: 'API_ERROR',
              details: response
            })
          }
        } catch (error) {
          reject({
            success: false,
            error: `Failed to parse API response: ${error.message}`,
            errorType: 'PARSE_ERROR'
          })
        }
      })
    }).on('error', (error) => {
      reject({
        success: false,
        error: `Network error: ${error.message}`,
        errorType: 'NETWORK_ERROR'
      })
    })
  })
}

module.exports = {
  convertCurrency
} 