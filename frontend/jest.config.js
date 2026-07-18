/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterSetup: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|avif|ico|bmp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@heroicons|date-fns|react-virtuoso|emoji-picker-react|markdown-to-jsx|isomorphic-dompurify|dompurify)/)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/android/',
  ],
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    'hooks/**/*.{js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
