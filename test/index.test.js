import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import lookup from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');
const example = path.join(fixtures, 'example');

describe('sass-lookup', () => {
  it('throws if dependency is not supplied', () => {
    expect(() => lookup({
      filename: path.join(example, 'baz.scss'),
      directory: example
    })).toThrow(new Error('dependency is not supplied'));
  });

  it('throws if filename is not supplied', () => {
    expect(() => lookup({
      dependency: '_foo',
      directory: example
    })).toThrow(new Error('filename is not supplied'));
  });

  it('throws if directory is not supplied', () => {
    expect(() => lookup({
      dependency: '_foo',
      filename: path.join(example, 'baz.scss')
    })).toThrow(new Error('directory is not supplied'));
  });

  it('handles partials with underscored files', () => {
    const expected = path.join(example, '_foo.scss');
    const actual = lookup({
      dependency: '_foo',
      filename: path.join(example, 'baz.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('handles partials with an extension', () => {
    const expected = path.join(example, 'baz.scss');
    const actual = lookup({
      dependency: 'baz.scss',
      filename: path.join(example, 'styles.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('returns direct relative path when the resolved file exists', () => {
    const expected = path.join(example, '_foo.scss');
    const actual = lookup({
      dependency: '../_foo',
      filename: path.join(example, 'styles.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('deeply nested paths: handles underscored partials', () => {
    const expected = path.join(example, 'nested/a/b/_b3.scss');
    const actual = lookup({
      dependency: 'a/b/b3',
      filename: path.join(example, 'nested/styles.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('deeply nested paths: handles non-underscored partials', () => {
    const expected = path.join(example, 'nested/a/b/b2.scss');
    const actual = lookup({
      dependency: 'a/b/b2',
      filename: path.join(example, 'nested/styles.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('relative partials: handles one level up', () => {
    const expected = path.join(example, 'nested/a/a.scss');
    const actual = lookup({
      dependency: '../a',
      filename: path.join(example, 'nested/a/b/b.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('relative partials: handles more than one level up', () => {
    const expected = path.join(example, 'nested/styles.scss');
    const actual = lookup({
      dependency: '../../styles',
      filename: path.join(example, 'nested/a/b/b.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('partials within the same subdirectory: handles non-underscored partials', () => {
    const expected = path.join(example, 'nested/a/b/b.scss');
    const actual = lookup({
      dependency: 'b',
      filename: path.join(example, 'nested/a/b/b2.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('partials within the same subdirectory: handles underscored partials', () => {
    const expected = path.join(example, 'nested/a/b/_b3.scss');
    const actual = lookup({
      dependency: 'b3',
      filename: path.join(example, 'nested/a/b/b2.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: handles partials in middle directory', () => {
    const directories = [example, path.join(example, 'nested/a/b'), path.join(example, 'a')];
    const expected = path.join(example, 'nested/a/b/b.scss');
    const actual = lookup({
      dependency: 'b',
      filename: path.join(example, 'baz.scss'),
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: partial in last directory of list', () => {
    const directories = [example, path.join(example, 'nested/a/b')];
    const expected = path.join(example, 'nested/a/b/b.scss');
    const actual = lookup({
      dependency: 'b',
      filename: path.join(example, 'baz.scss'),
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: non-partial in last directory when given list', () => {
    const directories = [example, path.join(example, 'nested/a/b')];
    const expected = path.join(example, 'nested/a/b/b2.scss');
    const actual = lookup({
      dependency: 'b2',
      filename: path.join(example, 'baz.scss'),
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: handles underscored partials', () => {
    const directories = [example, path.join(example, 'nested/a/b')];
    const expected = path.join(example, 'nested/a/b/_b3.scss');
    const actual = lookup({
      dependency: 'b3',
      filename: path.join(example, 'baz.scss'),
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('returns a static fallback when not found and directory is a string', () => {
    const expected = path.join(example, 'does-not-exist.scss');
    const actual = lookup({
      dependency: 'does-not-exist',
      filename: path.join(example, 'styles.scss'),
      directory: example
    });

    expect(actual).toBe(expected);
  });

  it('returns undefined when not found and directory is an array', () => {
    const actual = lookup({
      dependency: 'does-not-exist',
      filename: path.join(example, 'styles.scss'),
      directory: [example, path.join(example, 'nested')]
    });

    expect(actual).toBeUndefined();
  });

  it('handle paths with ~, test for the webpack alias', () => {
    const expected = path.join(fixtures, 'foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: path.join(fixtures, 'tilde.scss'),
      directory: fixtures,
      webpackConfig: path.join(__dirname, 'fixtures/webpack.config.js')
    });

    expect(actual).toBe(expected);
  });

  it('webpack alias returns empty string when webpack config cannot load', () => {
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: path.join(fixtures, 'tilde.scss'),
      directory: fixtures,
      webpackConfig: path.join(__dirname, 'fixtures/missing.config.js')
    });

    expect(actual).toBe('');
  });

  it('webpack alias returns empty string when dependency cannot be resolved', () => {
    const actual = lookup({
      dependency: '~@/missing.scss',
      filename: path.join(fixtures, 'tilde.scss'),
      directory: fixtures,
      webpackConfig: path.join(__dirname, 'fixtures/webpack.config.js')
    });

    expect(actual).toBe('');
  });

  it('webpack config can be a function', () => {
    const expected = path.join(fixtures, 'foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: path.join(fixtures, 'tilde.scss'),
      directory: fixtures,
      webpackConfig: path.join(__dirname, 'fixtures/webpack.config.function.js')
    });

    expect(actual).toBe(expected);
  });

  it('webpack config can be an array', () => {
    const expected = path.join(fixtures, 'foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: path.join(fixtures, 'tilde.scss'),
      directory: fixtures,
      webpackConfig: path.join(__dirname, 'fixtures/webpack.config.array.js')
    });

    expect(actual).toBe(expected);
  });

  it('webpack config can be an esm default export', () => {
    const expected = path.join(fixtures, 'foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: path.join(fixtures, 'tilde.scss'),
      directory: fixtures,
      webpackConfig: path.join(__dirname, 'fixtures/webpack.config.esm.mjs')
    });

    expect(actual).toBe(expected);
  });
});
