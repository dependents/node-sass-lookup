#!/usr/bin/env node

import { program } from 'commander';
import lookup from '../index.js';
import pkg from '../package.json' with { type: 'json' };

const { name, description, version } = pkg;

program
  .name(name)
  .description(description)
  .version(version)
  .argument('<path>', 'the path to partial/dependency to examine')
  .usage('[options] <path>')
  .option('-f, --filename [path]', 'file containing the dependency')
  .option('-d, --directory [path]', 'location of all sass files')
  .showHelpAfterError()
  .parse();

const dependency = program.args[0];
const { filename, directory } = program.opts();

console.log(lookup({ dependency, filename, directory }));
