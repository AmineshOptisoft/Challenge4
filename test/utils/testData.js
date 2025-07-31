// Test data fixtures
const testProjects = {
  valid: {
    projectId: 10001,
    projectName: 'Test Project',
    year: 2024,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  },
  invalid: {
    projectId: 10002,
    projectName: 'Incomplete Project'
  },
  duplicate: {
    projectId: 512,
    projectName: 'Duplicate Project',
    year: 2024,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }
}

const currencyRequests = {
  valid: {
    year: 2000,
    projectName: 'Humitas Hewlett Packard',
    currency: 'TTD'
  },
  invalid: {
    year: 2000,
    projectName: 'Humitas Hewlett Packard'
  },
  nonExistent: {
    year: 2000,
    projectName: 'Non Existent Project',
    currency: 'TTD'
  }
}

const conversionRequests = {
  valid: {
    year: 2000,
    projectName: 'Peking roasted duck Chanel',
    currency: 'TTD'
  },
  invalid: {
    year: 2000,
    projectName: 'Humitas Hewlett Packard'
  },
  nonExistent: {
    year: 1999,
    projectName: 'Peking roasted duck Chanel',
    currency: 'TTD'
  }
}

const specificProjects = {
  pekingRoastedDuckChanel: {
    year: 2000,
    projectName: 'Peking roasted duck Chanel',
    currency: 'TTD'
  },
  choucrouteCartier: {
    year: 2000,
    projectName: 'Choucroute Cartier',
    currency: 'TTD'
  },
  riguaNintendo: {
    year: 2001,
    projectName: 'Rigua Nintendo',
    currency: 'TTD'
  },
  llapingachoInstagram: {
    year: 2000,
    projectName: 'Llapingacho Instagram',
    currency: 'TTD'
  }
}

const updateData = {
  valid: {
    projectName: 'Updated Project Name',
    year: 2025,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  },
  incomplete: {
    projectName: 'Updated Project Name'
  }
}

const integrationTestProject = {
  projectId: 99999,
  projectName: 'Integration Test Project',
  year: 2024,
  currency: 'EUR',
  initialBudgetLocal: 100000.0,
  budgetUsd: 120000.0,
  initialScheduleEstimateMonths: 12,
  adjustedScheduleEstimateMonths: 10,
  contingencyRate: 5.0,
  escalationRate: 2.0,
  finalBudgetUsd: 125000.0
}

module.exports = {
  testProjects,
  currencyRequests,
  conversionRequests,
  specificProjects,
  updateData,
  integrationTestProject
} 