const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const { createRequire } = require('node:module');
// Kiwi ships extensionless ES modules; compile them for the Node test runner.
function loadKiwi(filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = createRequire(filename);
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, {
    filename,
  })(
    id =>
      id.startsWith('.')
        ? loadKiwi(path.resolve(path.dirname(filename), `${id}.js`))
        : localRequire(id),
    module,
    module.exports,
  );
  return module.exports;
}
const KiwiIntl = loadKiwi(require.resolve('kiwi-intl')).default;

function dictionary(locale, name) {
  const filename = path.resolve(
    __dirname,
    `../../src/lang/${locale}/${name}.ts`,
  );
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(module,exports){${output}\n})`, { filename })(
    module,
    module.exports,
  );
  return module.exports.default;
}
const resources = Object.fromEntries(
  ['zh-CN', 'zh-TW', 'en-US'].map(locale => [
    locale,
    Object.fromEntries(
      ['carbonAgent', 'productCarbonFootprintAI', 'carbonFootprint3'].map(
        name => [name, dictionary(locale, name)],
      ),
    ),
  ]),
);
const I18N = KiwiIntl.init('zh-CN', resources);
module.exports = { I18N, resources };
