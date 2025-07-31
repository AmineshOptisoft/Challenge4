const https = require('https')
const config = require('../config')

const API_BASE_URL = 'https://v6.exchangerate-api.com/v6'
const API_KEY = config.currency.apiKey || 'b2c3388fb59cad9fada6e3f8'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

function convertCurrency(fromCurrency, toCurrency, amount, retryCount = 0) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}/${API_KEY}/latest/${fromCurrency}`
    
    const makeRequest = () => {
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
        // Retry logic for network errors
        if (retryCount < MAX_RETRIES && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
          console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES})...`)
          setTimeout(() => {
            convertCurrency(fromCurrency, toCurrency, amount, retryCount + 1)
              .then(resolve)
              .catch(reject)
          }, RETRY_DELAY * (retryCount + 1))
        } else {
          reject({
            success: false,
            error: `Network error: ${error.message}`,
            errorType: 'NETWORK_ERROR',
            retries: retryCount
          })
        }
      })
    }
    
    makeRequest()
  })
}

// Graceful degradation - fallback rates for common currencies
const FALLBACK_RATES = {
  'USD': {
    'TTD': 6.75,
    'EUR': 0.85,
    'GBP': 0.73
  },
  'EUR': {
    'TTD': 7.94,
    'USD': 1.18,
    'GBP': 0.86
  },
  'GBP': {
    'TTD': 9.23,
    'USD': 1.37,
    'EUR': 1.16
  }
}

function convertCurrencyWithFallback(fromCurrency, toCurrency, amount) {
  return convertCurrency(fromCurrency, toCurrency, amount)
    .catch(error => {
      // If API fails, try fallback rates
      if (FALLBACK_RATES[fromCurrency] && FALLBACK_RATES[fromCurrency][toCurrency]) {
        const rate = FALLBACK_RATES[fromCurrency][toCurrency]
        const convertedAmount = amount * rate
        return {
          success: true,
          fromCurrency,
          toCurrency,
          amount,
          rate,
          convertedAmount,
          fallback: true
        }
      }
      throw error
    })
}

module.exports = {
  convertCurrency,
  convertCurrencyWithFallback
} 