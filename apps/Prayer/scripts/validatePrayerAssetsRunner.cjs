#!/usr/bin/env node
const path = require('path');
const tsnode = require('ts-node');
const tsconfigPaths = require('tsconfig-paths');

const projectRoot = path.resolve(__dirname, '../../..');
const tsconfigPath = path.resolve(projectRoot, 'tsconfig.base.json');
const tsconfig = require(tsconfigPath);

tsnode.register({
  project: tsconfigPath,
  transpileOnly: false,
  compilerOptions: {
    module: 'commonjs',
  },
});

tsconfigPaths.register({
  baseUrl: path.resolve(projectRoot, tsconfig.compilerOptions?.baseUrl ?? '.'),
  paths: tsconfig.compilerOptions?.paths ?? {},
});

require('./validatePrayerAssets.ts');
