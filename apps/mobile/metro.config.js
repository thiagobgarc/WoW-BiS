/**
 * Metro has to be told about the monorepo twice: once so it *watches* the
 * workspace packages (otherwise editing packages/core doesn't trigger a
 * reload), and once so it *resolves* from the root node_modules that Bun
 * hoists nearly everything into.
 *
 * The @mythos/* packages export raw TypeScript with no build step, which
 * works here only because Metro babel-transforms everything it resolves,
 * node_modules included. Package `exports` subpaths (`@mythos/core/character`)
 * are already on by default in this Expo SDK — asserted in metro.test.ts so
 * a Metro upgrade that flips the default back fails a test rather than a
 * store build.
 */
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
