'use strict';

const path = require('node:path');
const process = require('node:process');
const mock = require('mock-fs');
const { suite } = require('uvu');
const assert = require('uvu/assert');
const lookup = require('../index.js');

const testSuite = suite('sass-lookup');

testSuite.before.each(() => {
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

testSuite.after.each(() => {
  mock.restore();
});

testSuite('throws if dependency is not supplied', () => {
  assert.throws(() => lookup({
    filename: 'example/baz.scss',
    directory: 'example'
  }), err => err instanceof Error && err.message === 'dependency is not supplied');
});

testSuite('throws if filename is not supplied', () => {
  assert.throws(() => lookup({
    dependency: '_foo',
    directory: 'example'
  }), err => err instanceof Error && err.message === 'filename is not supplied');
});

testSuite('throws if directory is not supplied', () => {
  assert.throws(() => lookup({
    dependency: '_foo',
    filename: 'example/baz.scss'
  }), err => err instanceof Error && err.message === 'directory is not supplied');
});

testSuite('handles partials with underscored files', () => {
  const expected = path.join(process.cwd(), '/example/_foo.scss');
  const actual = lookup({
    dependency: '_foo',
    filename: 'example/baz.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('handles partials with an extension', () => {
  const expected = path.join(process.cwd(), '/example/baz.scss');
  const actual = lookup({
    dependency: 'baz.scss',
    filename: 'example/styles.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('returns direct relative path when the resolved file exists', () => {
  const expected = path.join(process.cwd(), '/example/_foo.scss');
  const actual = lookup({
    dependency: '../_foo',
    filename: 'example/styles.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('deeply nested paths: handles underscored partials', () => {
  const expected = path.join(process.cwd(), '/example/nested/a/b/_b3.scss');
  const actual = lookup({
    dependency: 'a/b/b3',
    filename: 'example/nested/styles.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('deeply nested paths: handles non-underscored partials', () => {
  const expected = path.join(process.cwd(), '/example/nested/a/b/b2.scss');
  const actual = lookup({
    dependency: 'a/b/b2',
    filename: 'example/nested/styles.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('relative partials: handles one level up', () => {
  const expected = path.join(process.cwd(), '/example/nested/a/a.scss');
  const actual = lookup({
    dependency: '../a',
    filename: 'example/nested/a/b/b.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('relative partials: handles more than one level up', () => {
  const expected = path.join(process.cwd(), '/example/nested/styles.scss');
  const actual = lookup({
    dependency: '../../styles',
    filename: 'example/nested/a/b/b.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('partials within the same subdirectory: handles non-underscored partials', () => {
  const expected = path.join(process.cwd(), '/example/nested/a/b/b.scss');
  const actual = lookup({
    dependency: 'b',
    filename: 'example/nested/a/b/b2.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('partials within the same subdirectory: handles underscored partials', () => {
  const expected = path.join(process.cwd(), '/example/nested/a/b/_b3.scss');
  const actual = lookup({
    dependency: 'b3',
    filename: 'example/nested/a/b/b2.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('multiple directories: handles partials in middle directory', () => {
  const directories = ['example', 'example/nested/a/b', 'example/a'];
  const expected = path.join(process.cwd(), '/example/nested/a/b/b.scss');
  const actual = lookup({
    dependency: 'b',
    filename: 'b2.scss',
    directory: directories
  });

  assert.is(actual, expected);
});

testSuite('multiple directories: partial in last directory of list', () => {
  const directories = ['example', 'example/nested/a/b'];
  const expected = path.join(process.cwd(), '/example/nested/a/b/b.scss');
  const actual = lookup({
    dependency: 'b',
    filename: 'b2.scss',
    directory: directories
  });

  assert.is(actual, expected);
});

testSuite('multiple directories: non-partial in last directory when given list', () => {
  const directories = ['example', 'example/nested/a/b'];
  const expected = path.join(process.cwd(), '/example/nested/a/b/b2.scss');
  const actual = lookup({
    dependency: 'b2',
    filename: 'b3.scss',
    directory: directories
  });

  assert.is(actual, expected);
});

testSuite('multiple directories: handles underscored partials', () => {
  const directories = ['example', 'example/nested/a/b'];
  const expected = path.join(process.cwd(), '/example/nested/a/b/b2.scss');
  const actual = lookup({
    dependency: 'b2',
    filename: 'b3.scss',
    directory: directories
  });

  assert.is(actual, expected);
});

testSuite('returns a static fallback when not found and directory is a string', () => {
  const expected = path.join(process.cwd(), '/example/does-not-exist.scss');
  const actual = lookup({
    dependency: 'does-not-exist',
    filename: 'example/styles.scss',
    directory: 'example'
  });

  assert.is(actual, expected);
});

testSuite('handle paths with ~, test for the webpack alias', () => {
  // enhanced-resolve needs a real file system to work
  mock.restore();
  const expected = path.join(process.cwd(), '/test/fixtures/foo.scss');
  const actual = lookup({
    dependency: '~@/foo.scss',
    filename: './fixtures/tilde.scss',
    directory: 'fixtures',
    webpackConfig: path.join(__dirname, './fixtures/webpack.config.js')
  });

  assert.is(actual, expected);
});

testSuite('webpack alias returns empty string when webpack config cannot load', () => {
  const actual = lookup({
    dependency: '~@/foo.scss',
    filename: './fixtures/tilde.scss',
    directory: 'fixtures',
    webpackConfig: path.join(__dirname, './fixtures/missing.config.js')
  });

  assert.is(actual, '');
});

testSuite('webpack alias returns empty string when dependency cannot be resolved', () => {
  // enhanced-resolve needs a real file system to work
  mock.restore();
  const actual = lookup({
    dependency: '~@/missing.scss',
    filename: './fixtures/tilde.scss',
    directory: 'fixtures',
    webpackConfig: path.join(__dirname, './fixtures/webpack.config.js')
  });

  assert.is(actual, '');
});

testSuite('webpack config can be a function', () => {
  // enhanced-resolve needs a real file system to work
  mock.restore();
  const expected = path.join(process.cwd(), '/test/fixtures/foo.scss');
  const actual = lookup({
    dependency: '~@/foo.scss',
    filename: './fixtures/tilde.scss',
    directory: 'fixtures',
    webpackConfig: path.join(__dirname, './fixtures/webpack.config.function.js')
  });

  assert.is(actual, expected);
});

testSuite('webpack config can be an array', () => {
  // enhanced-resolve needs a real file system to work
  mock.restore();
  const expected = path.join(process.cwd(), '/test/fixtures/foo.scss');
  const actual = lookup({
    dependency: '~@/foo.scss',
    filename: './fixtures/tilde.scss',
    directory: 'fixtures',
    webpackConfig: path.join(__dirname, './fixtures/webpack.config.array.js')
  });

  assert.is(actual, expected);
});

testSuite.run();
