#!/usr/bin/env node

'use strict';

const program = require('commander');
const lookup = require('../index.js');
const { version } = require('../package.json');

program
  .version(version)
  .usage('[options] <path>')
  .option('-f, --filename [path]', 'file containing the dependency')
  .option('-d, --directory [path]', 'location of all sass files')
  .parse();

const dependency = program.args[0];
const { filename, directory } = program.opts();

console.log(lookup(dependency, filename, directory));
