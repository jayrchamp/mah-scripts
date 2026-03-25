'use strict'

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'helpers/**/*.js',
    'actions/**/*.js',
    '!**/node_modules/**'
  ]
}
