import path from 'node:path';
import process from 'node:process';

export default {
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './test/fixtures')
    }
  }
};
