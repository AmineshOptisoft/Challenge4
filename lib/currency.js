const https = require('https')
const config = require('../config')

// Mock conversion rates for unsupported currencies
const mockRates = {
  TTD: 6.8, // Approximate USD to TTD rate
  // Add other unsupported currencies as needed
}

function convertCurrency(amount, fromCurrency, toCurrency, year, month, day) {
  return new Promise((resolve, reject) => {
    const apiKey = config.currency.apiKey
    if (!apiKey) return reject(new Error('Currency API key not configured'))

    // Check if we have a mock rate for this currency
    if (mockRates[toCurrency]) {
      const rate = mockRates[toCurrency]
      resolve({
        success: true,
        convertedAmount: amount * rate,
        rate,
        fromCurrency,
        toCurrency,
        date: `${year}-${month}-${day}`,
        note: 'Using mock conversion rate'
      })
      return
    }

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/history/${fromCurrency}/${year}/${month}/${day}/${amount}`
    console.log('Requesting URL:', url)

    https.get(url, (res) => {
      let data = ''

      res.on('data', chunk => {
        data += chunk
      })

      res.on('end', () => {
        try {
          if (!data) {
            return reject(new Error('Empty response from currency API'))
          }

          const response = JSON.parse(data)
          console.log('Parsed response:', response.conversion_amounts)
          console.log('Parsed response:', toCurrency, response.conversion_amounts[toCurrency])

          if (response.result === 'success') {
            const rate = response.conversion_amounts[toCurrency]
            if (rate) {
              resolve({
                success: true,
                convertedAmount: amount * rate,
                rate,
                fromCurrency,
                toCurrency,
                date: `${year}-${month}-${day}`
              })
            } else {
              // If currency not available in API, try mock rate
              if (mockRates[toCurrency]) {
                const mockRate = mockRates[toCurrency]
                resolve({
                  success: true,
                  convertedAmount: amount * mockRate,
                  rate: mockRate,
                  fromCurrency,
                  toCurrency,
                  date: `${year}-${month}-${day}`,
                  note: 'Using mock conversion rate'
                })
              } else {
                reject(new Error(`Conversion rate not available for ${toCurrency}`))
              }
            }
          } else if (response.conversion_amounts[toCurrency] === undefined) {
            reject(new Error(response['error-type'] || 'Currency conversion failed'))
          } else {
            reject(new Error(response['error-type'] || 'Currency conversion failed'))
          }
        } catch (err) {
          reject(new Error(`Invalid JSON or unexpected structure from currency API: ${err.message}`))
        }
      })
    }).on('error', (err) => {
      reject(new Error(`Currency API request failed: ${err.message}`))
    })
  })
}

module.exports = {
  convertCurrency
} 