import type { Config } from 'jest'

type ProjectConfig = Exclude<NonNullable<Config['projects']>[number], string>

const packagesProject: ProjectConfig = {
  displayName: 'packages',
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json'
      }
    ],
    '^.+\\.js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true
        }
      }
    ]
  },
  transformIgnorePatterns: [
    // three@0.186's CJS entry re-exports ESM (`three.module.js` / `three.core.js`).
    '/node_modules/(?!.*(mtext-parser|rbush|quickselect|three/build/three))'
  ],
  testPathIgnorePatterns: [
    '/e2e/',
    '/__tests__/helpers/',
    '<rootDir>/packages/data-model/'
  ],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
    '^@mlightcad/cad-simple-viewer$':
      '<rootDir>/packages/cad-simple-viewer/src/index.ts',
    '^@mlightcad/cad-simple-viewer/icons$':
      '<rootDir>/packages/cad-simple-viewer/src/ui/icons.ts',
    '^@mlightcad/cad-simple-viewer/find$':
      '<rootDir>/packages/cad-simple-viewer/src/find/index.ts',
    '^three/examples/jsm/lines/LineMaterial\\.js$':
      '<rootDir>/test/mocks/three/LineMaterial.js',
    '^three/examples/jsm/lines/LineSegments2\\.js$':
      '<rootDir>/test/mocks/three/LineSegments2.js',
    '^three/examples/jsm/lines/LineSegmentsGeometry\\.js$':
      '<rootDir>/test/mocks/three/LineSegmentsGeometry.js',
    '^three/examples/jsm/renderers/CSS2DRenderer\\.js$':
      '<rootDir>/test/mocks/three/CSS2DRenderer.js',
    '^three/examples/jsm/utils/BufferGeometryUtils\\.js$':
      '<rootDir>/test/mocks/three/BufferGeometryUtils.js',
    '^three/examples/jsm/controls/OrbitControls(\\.js)?$':
      '<rootDir>/test/mocks/three/OrbitControls.js'
  }
}

// data-model relies on `@ts-expect-error` for unused params, so it needs the
// strict unused checks the shared jest tsconfig turns off. It runs as its own
// project because ts-jest caches type-check state per worker.
const dataModelProject: ProjectConfig = {
  displayName: 'data-model',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages/data-model'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/packages/data-model/tsconfig.jest.json'
      }
    ]
  }
}

const config: Config = {
  verbose: true,
  projects: [packagesProject, dataModelProject]
}

export default config
