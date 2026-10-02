/**
 * metro.config.js makes three claims the app silently depends on. Each has
 * the same failure mode: the bundle builds fine on this machine today and
 * breaks after an Expo upgrade, in CI or on a store build, with a resolution
 * error that reads like a missing dependency.
 */
const path = require('node:path');

const config = require('../../metro.config.js');

const workspaceRoot = path.resolve(__dirname, '../../../..');

describe('metro monorepo configuration', () => {
  it('watches the workspace root so package edits trigger a reload', () => {
    expect(config.watchFolders).toContain(workspaceRoot);
  });

  it('resolves from the hoisted root node_modules as well as the local one', () => {
    expect(config.resolver.nodeModulesPaths).toEqual([
      path.resolve(workspaceRoot, 'apps/mobile/node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ]);
  });

  it('has package exports enabled, which @mythos/* subpaths require', () => {
    // `@mythos/core/character` is an "exports" subpath with no file on disk
    // at that path; with this off, every such import fails to resolve.
    expect(config.resolver.unstable_enablePackageExports).toBe(true);
  });
});
