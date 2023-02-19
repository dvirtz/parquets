import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest',
  testRegex: '(test\/(?!utils).*|(\.|\/)(test|spec))\.(jsx?|tsx?)$',
  testPathIgnorePatterns: [
    '<rootDir>/build_'
  ],
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  testTimeout: process.env.DEBUG_MODE ? 999999 : 5000
};

export default config;
