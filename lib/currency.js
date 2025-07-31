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
              reject(new Error(`Currency ${toCurrency} not found in response`))
            }
          } else {
            reject(new Error(`API Error: ${response.error_type || 'Unknown error'}`))
          }
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`))
        }
      })
    }).on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`))
    })
  })
}

module.exports = {
  convertCurrency
} 