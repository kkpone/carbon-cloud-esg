const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { I18N, resources } = require('./i18n.test-helper.cjs');

test('Agent translations have matching keys and interpolation parameters in all languages', () => {
  const source = resources['zh-CN'].carbonAgent;
  for (const [locale, resource] of Object.entries(resources)) {
    assert.deepEqual(
      Object.keys(resource.carbonAgent).sort(),
      Object.keys(source).sort(),
      locale,
    );
    for (const [key, value] of Object.entries(resource.carbonAgent)) {
      // 允许嵌套命名空间（云端嵌入式小碳的分组词条），只校验字符串词条。
      if (typeof value !== 'string') continue;
      assert.ok(value.trim(), `${locale}.${key}`);
      assert.deepEqual(
        [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(),
        [...source[key].matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(),
        `${locale}.${key}`,
      );
      if (locale === 'en-US')
        assert.doesNotMatch(value, /\p{Script=Han}/u, key);
    }
    I18N.setLang(locale);
    assert.ok(
      I18N.template(I18N.carbonAgent.deleteFieldRow, {
        field: 'Materials',
        number: 2,
      }).includes('2'),
    );
  }
  I18N.setLang('zh-CN');
});

function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap(entry =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
test('Agent UI contains no hardcoded Chinese text and all translation references exist', () => {
  const root = path.resolve(__dirname, '../..');
  const targets = files(path.join(root, 'src/components/CarbonAgent')).filter(
    file => /\.tsx?$/.test(file),
  );
  targets.push(
    path.join(
      root,
      'src/views/carbonFootprint3/FootprintAccount/ProductDetail/AddAccount/index.tsx',
    ),
  );
  for (const file of targets) {
    const source = fs.readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = node => {
      if (
        ts.isStringLiteralLike(node) ||
        ts.isJsxText(node) ||
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail
      ) {
        assert.doesNotMatch(
          node.text,
          /\p{Script=Han}/u,
          `${file}:${
            tree.getLineAndCharacterOfPosition(node.getStart()).line + 1
          }`,
        );
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    for (const match of source.matchAll(
      /I18N\.(carbonAgent|productCarbonFootprintAI|carbonFootprint3)\.([\w.]+)/g,
    )) {
      for (const [locale, resource] of Object.entries(resources)) {
        const value = match[2]
          .split('.')
          .reduce((object, key) => object?.[key], resource[match[1]]);
        assert.equal(
          typeof value,
          'string',
          `${file}: ${locale}.${match[1]}.${match[2]}`,
        );
      }
    }
  }
});
