import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { debuglog } from 'node:util';
import enhancedResolve from 'enhanced-resolve';

const require = createRequire(import.meta.url);

const debug = debuglog('sass-lookup');

/**
 * Determines the resolved dependency path according to
 * the Sass compiler's dependency lookup behavior
 *
 * @param  {Object} options
 * @param  {String} options.dependency - the import name
 * @param  {String} options.filename - the file containing the import
 * @param  {String|Array<String>} options.directory - the location(s) of all sass files
 * @return {String}
 */
export default function lookup({ dependency, filename, directory, webpackConfig } = {}) {
  if (dependency === undefined) throw new Error('dependency is not supplied');
  if (filename === undefined) throw new Error('filename is not supplied');
  if (directory === undefined) throw new Error('directory is not supplied');

  const WEBPACK_ALIAS_FLAG = '~';
  if (dependency.startsWith(WEBPACK_ALIAS_FLAG) && Boolean(webpackConfig)) {
    const webpackDependency = dependency.replace(WEBPACK_ALIAS_FLAG, '');
    return resolveWebpackAliasDependency(webpackDependency, webpackConfig);
  }

  // Use the file's extension if necessary
  const extension = path.extname(dependency) ? '' : path.extname(filename);

  if (!path.isAbsolute(dependency)) {
    const sassDependency = path.resolve(filename, dependency) + extension;
    if (fs.existsSync(sassDependency)) {
      return sassDependency;
    }
  }

  // `path.basename` in case the dependency is slashed: a/b/c should be a/b/_c.scss
  const isSlashed = dependency.includes('/');
  const deependencyDir = isSlashed ? path.dirname(dependency) : '';
  const dependencyName = (isSlashed ? path.basename(dependency) : dependency) + extension;
  const fileDirectory = path.dirname(filename);
  const searchDirectory = path.resolve(fileDirectory, deependencyDir);

  const relativeToFile = findDependency(searchDirectory, dependencyName);
  if (relativeToFile) {
    return relativeToFile;
  }

  const directories = Array.isArray(directory) ? directory : [directory];

  for (const dir of directories) {
    const searchDirectory = path.resolve(dir, deependencyDir);
    const relativeToDir = findDependency(searchDirectory, dependencyName);
    if (relativeToDir) {
      return relativeToDir;
    }
  }

  // Old versions returned a static path, if one could not be found.
  // Do the same, if `directory` is not an array
  if (typeof directory === 'string') {
    return path.resolve(directory, deependencyDir, dependencyName);
  }
}

function resolveWebpackAliasDependency(dependency, webpackConfig) {
  let loadedConfig;
  const resolvedConfigPath = path.resolve(webpackConfig);

  try {
    loadedConfig = loadWebpackConfig(resolvedConfigPath);
  } catch(error) {
    debug(`error loading the webpack config at ${resolvedConfigPath}\n${error.stack}`);
    return '';
  }

  try {
    const resolveConfig = { ...loadedConfig.resolve };
    const resolver = enhancedResolve.create.sync(resolveConfig);
    return resolver(process.cwd(), dependency);
  } catch(error) {
    debug(`error resolving the webpack alias ${dependency}\n${error.stack}`);
    return '';
  }
}

function loadWebpackConfig(webpackConfigPath) {
  let loadedConfig = require(webpackConfigPath);

  // Node's require(esm) returns a namespace object. Unwrap default when present.
  if (loadedConfig && typeof loadedConfig === 'object' && 'default' in loadedConfig) {
    loadedConfig = loadedConfig.default;
  }

  if (typeof loadedConfig === 'function') {
    loadedConfig = loadedConfig();
  } else if (Array.isArray(loadedConfig)) {
    loadedConfig = loadedConfig[0];
  }

  return loadedConfig;
}

function findDependency(searchDirectory, dependencyName) {
  const nonPartialPath = path.resolve(searchDirectory, dependencyName);
  if (fs.existsSync(nonPartialPath)) {
    return nonPartialPath;
  }

  const partialsPath = path.resolve(searchDirectory, `_${dependencyName}`);
  if (fs.existsSync(partialsPath)) {
    return partialsPath;
  }
}
