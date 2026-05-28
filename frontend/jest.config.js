module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Tells Jest to ignore CSS file styling imports instead of crashing
    '\\.css$': '<rootDir>/src/__mocks__/styleMock.js',
    // Mocks any raster assets or layout graphics if loaded later
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom']
};