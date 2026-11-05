module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        transform: { react: { runtime: 'automatic' } },
      },
    }],
  },
  transformIgnorePatterns: [
    // Allow pnpm's intermediate directory before checking the actual package path.
    'node_modules/(?!\\.pnpm/|(?:lowlight|devlop|is-plain-obj|unist-.*|vfile.*|unified|bail|trough|remark.*|markdown.*|micromark.*|decode-named-character-reference|character-entities|property-information|hast-.*|space-separated-tokens|comma-separated-tokens|mdast-util-.*|ccount|escape-string-regexp|@tiptap.*)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
  ],
  moduleDirectories: ['node_modules', '<rootDir>'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
}
