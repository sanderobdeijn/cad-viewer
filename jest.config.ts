import type { Config } from 'jest'

type ProjectConfig = Exclude<NonNullable<Config['projects']>[number], string>

/** Packages vendored from mlightcad/realdwg-web; tested in their own project. */
const REALDWG_PACKAGES = ['common', 'geometry-engine', 'graphic-interface']

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
    '/node_modules/(?!.*(rbush|quickselect|three/build/three))'
  ],
  testPathIgnorePatterns: [
    '/e2e/',
    '/__tests__/helpers/',
    ...REALDWG_PACKAGES.map(name => `<rootDir>/packages/${name}/`)
  ],
  moduleNameMapper: {
    '^lodash-es$': 'lodash',
    // Resolve these to one copy each, so every package sees the same classes.
    '^@mlightcad/(common|geometry-engine|graphic-interface)$':
      '<rootDir>/packages/$1/src/index.ts',
    '^@mlightcad/cad-simple-viewer$':
      '<rootDir>/packages/cad-simple-viewer/src/index.ts',
    '^@mlightcad/cad-simple-viewer/icons$':
      '<rootDir>/packages/cad-simple-viewer/src/ui/icons.ts',
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

// The realdwg-web packages rely on `@ts-expect-error` for unused params, so
// they need the strict unused checks the shared jest tsconfig turns off. They
// run as their own project because ts-jest caches type-check state per worker.
const realdwgProject: ProjectConfig = {
  displayName: 'realdwg',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: REALDWG_PACKAGES.map(name => `<rootDir>/packages/${name}`),
  moduleNameMapper: {
    '^@mlightcad/(common|geometry-engine|graphic-interface)$':
      '<rootDir>/packages/$1/src/index.ts'
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.strict.json'
      }
    ]
  }
}

const config: Config = {
  verbose: true,
  projects: [packagesProject, realdwgProject]
}

export default config
