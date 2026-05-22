import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import mock from 'mock-fs';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach
} from 'vitest';
import lookup from '../index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('sass-lookup', () => {
  beforeEach(() => {
    mock({
      example: {
        '_foo.scss': 'body { color: purple; }',
        'baz.scss': '@import "_foo";',
        'styles.scss': '@import "_foo";\n@import "baz.scss";',
        stylesUnderscore: '@import "foo";',

        nested: {
          'styles.scss': '@import "a/b/b3";\n@import "a/b/b2";',
          a: {
            'a.scss': '@import "../styles";',
            b: {
              '_b3.scss': '',
              'b.scss': '@import "../../styles";\n@import "../a";',
              'b2.scss': '@import "b";\n@import "b3";'
            }
          }
        }
      }
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it('throws if dependency is not supplied', () => {
    expect(() => lookup({
      filename: 'example/baz.scss',
      directory: 'example'
    })).toThrow(new Error('dependency is not supplied'));
  });

  it('throws if filename is not supplied', () => {
    expect(() => lookup({
      dependency: '_foo',
      directory: 'example'
    })).toThrow(new Error('filename is not supplied'));
  });

  it('throws if directory is not supplied', () => {
    expect(() => lookup({
      dependency: '_foo',
      filename: 'example/baz.scss'
    })).toThrow(new Error('directory is not supplied'));
  });

  it('handles partials with underscored files', () => {
    const expected = path.join(process.cwd(), '/example/_foo.scss');
    const actual = lookup({
      dependency: '_foo',
      filename: 'example/baz.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('handles partials with an extension', () => {
    const expected = path.join(process.cwd(), '/example/baz.scss');
    const actual = lookup({
      dependency: 'baz.scss',
      filename: 'example/styles.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('returns direct relative path when the resolved file exists', () => {
    const expected = path.join(process.cwd(), '/example/_foo.scss');
    const actual = lookup({
      dependency: '../_foo',
      filename: 'example/styles.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('deeply nested paths: handles underscored partials', () => {
    const expected = path.join(process.cwd(), '/example/nested/a/b/_b3.scss');
    const actual = lookup({
      dependency: 'a/b/b3',
      filename: 'example/nested/styles.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('deeply nested paths: handles non-underscored partials', () => {
    const expected = path.join(process.cwd(), '/example/nested/a/b/b2.scss');
    const actual = lookup({
      dependency: 'a/b/b2',
      filename: 'example/nested/styles.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('relative partials: handles one level up', () => {
    const expected = path.join(process.cwd(), '/example/nested/a/a.scss');
    const actual = lookup({
      dependency: '../a',
      filename: 'example/nested/a/b/b.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('relative partials: handles more than one level up', () => {
    const expected = path.join(process.cwd(), '/example/nested/styles.scss');
    const actual = lookup({
      dependency: '../../styles',
      filename: 'example/nested/a/b/b.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('partials within the same subdirectory: handles non-underscored partials', () => {
    const expected = path.join(process.cwd(), '/example/nested/a/b/b.scss');
    const actual = lookup({
      dependency: 'b',
      filename: 'example/nested/a/b/b2.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('partials within the same subdirectory: handles underscored partials', () => {
    const expected = path.join(process.cwd(), '/example/nested/a/b/_b3.scss');
    const actual = lookup({
      dependency: 'b3',
      filename: 'example/nested/a/b/b2.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: handles partials in middle directory', () => {
    const directories = ['example', 'example/nested/a/b', 'example/a'];
    const expected = path.join(process.cwd(), '/example/nested/a/b/b.scss');
    const actual = lookup({
      dependency: 'b',
      filename: 'b2.scss',
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: partial in last directory of list', () => {
    const directories = ['example', 'example/nested/a/b'];
    const expected = path.join(process.cwd(), '/example/nested/a/b/b.scss');
    const actual = lookup({
      dependency: 'b',
      filename: 'b2.scss',
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: non-partial in last directory when given list', () => {
    const directories = ['example', 'example/nested/a/b'];
    const expected = path.join(process.cwd(), '/example/nested/a/b/b2.scss');
    const actual = lookup({
      dependency: 'b2',
      filename: 'b3.scss',
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('multiple directories: handles underscored partials', () => {
    const directories = ['example', 'example/nested/a/b'];
    const expected = path.join(process.cwd(), '/example/nested/a/b/b2.scss');
    const actual = lookup({
      dependency: 'b2',
      filename: 'b3.scss',
      directory: directories
    });

    expect(actual).toBe(expected);
  });

  it('returns a static fallback when not found and directory is a string', () => {
    const expected = path.join(process.cwd(), '/example/does-not-exist.scss');
    const actual = lookup({
      dependency: 'does-not-exist',
      filename: 'example/styles.scss',
      directory: 'example'
    });

    expect(actual).toBe(expected);
  });

  it('returns undefined when not found and directory is an array', () => {
    const actual = lookup({
      dependency: 'does-not-exist',
      filename: 'example/styles.scss',
      directory: ['example', 'example/nested']
    });

    expect(actual).toBeUndefined();
  });

  it('handle paths with ~, test for the webpack alias', () => {
    mock.restore();
    const expected = path.join(process.cwd(), '/test/fixtures/foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: './fixtures/tilde.scss',
      directory: 'fixtures',
      webpackConfig: path.join(__dirname, './fixtures/webpack.config.js')
    });

    expect(actual).toBe(expected);
  });

  it('webpack alias returns empty string when webpack config cannot load', () => {
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: './fixtures/tilde.scss',
      directory: 'fixtures',
      webpackConfig: path.join(__dirname, './fixtures/missing.config.js')
    });

    expect(actual).toBe('');
  });

  it('webpack alias returns empty string when dependency cannot be resolved', () => {
    mock.restore();
    const actual = lookup({
      dependency: '~@/missing.scss',
      filename: './fixtures/tilde.scss',
      directory: 'fixtures',
      webpackConfig: path.join(__dirname, './fixtures/webpack.config.js')
    });

    expect(actual).toBe('');
  });

  it('webpack config can be a function', () => {
    mock.restore();
    const expected = path.join(process.cwd(), '/test/fixtures/foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: './fixtures/tilde.scss',
      directory: 'fixtures',
      webpackConfig: path.join(__dirname, './fixtures/webpack.config.function.js')
    });

    expect(actual).toBe(expected);
  });

  it('webpack config can be an array', () => {
    mock.restore();
    const expected = path.join(process.cwd(), '/test/fixtures/foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: './fixtures/tilde.scss',
      directory: 'fixtures',
      webpackConfig: path.join(__dirname, './fixtures/webpack.config.array.js')
    });

    expect(actual).toBe(expected);
  });

  it('webpack config can be an esm default export', () => {
    mock.restore();
    const expected = path.join(process.cwd(), '/test/fixtures/foo.scss');
    const actual = lookup({
      dependency: '~@/foo.scss',
      filename: './fixtures/tilde.scss',
      directory: 'fixtures',
      webpackConfig: path.join(__dirname, './fixtures/webpack.config.esm.mjs')
    });

    expect(actual).toBe(expected);
  });
});
