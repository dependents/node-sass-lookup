const path = require('path');

module.exports = function() {
  return {
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), './test/fixtures')
      }
    }
  };
};
