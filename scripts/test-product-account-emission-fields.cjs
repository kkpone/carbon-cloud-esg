const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const BigNumber = require('bignumber.js');
const getMiniDecimal = require('@rc-component/mini-decimal').default;

const root = path.resolve(__dirname, '..');
const account = 'src/views/carbonFootprint3/FootprintAccount';
const mainData = 'src/components/CarbonFootprintAccount/BuildModelMainData';
const factor = 'src/components/FormilyUtil/FormilyFactor';
const submodule = 'src/views/subModules/CarbonFootprintModel';
const transport = `${submodule}/components/EmissionSourceDrawer`;

// Evaluate real declarations/JSX without loading the application's services or styles.
function parse(file) {
  const absolute = path.isAbsolute(file) ? file : path.join(root, file);
  return ts.createSourceFile(
    absolute,
    fs.readFileSync(absolute, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function evaluate(source, globals = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
    },
  });
  vm.runInNewContext(outputText, { exports, React, ...globals });
  return exports;
}

function declarations(file, names, globals = {}) {
  const source = parse(file);
  const code = names
    .map(name => {
      const declaration = source.statements.find(node =>
        ts.isVariableStatement(node)
          ? node.declarationList.declarations.some(
              item => item.name.getText(source) === name,
            )
          : node.name?.getText(source) === name,
      );
      assert.ok(declaration, `Missing ${name} in ${file}`);
      return declaration.getText(source);
    })
    .join('\n');
  return evaluate(`${code}\nexports.result = { ${names.join(', ')} };`, globals)
    .result;
}

function jsx(file, tag, globals) {
  const source = parse(file);
  const matches = [];
  function visit(node) {
    if (
      ts.isJsxElement(node) &&
      node.openingElement.tagName.getText(source) === tag
    ) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(matches.length, 1, `Expected one ${tag} in ${file}`);
  return evaluate(`exports.element = (${matches[0].getText(source)});`, globals)
    .element;
}

const messages = new Proxy({}, { get: (_, key) => String(key) });
const I18N = {
  carbonFootprint: messages,
  carbonFootprint3: messages,
  emission: messages,
  template: (message, args) => `${message}:${JSON.stringify(args)}`,
};
const constants = declarations(
  'src/views/carbonFootprint3/discharge/process/constant.ts',
  [
    'MAX_DECIMAL_PLACE',
    'EMISSION_AMOUNT_MAX_DECIMAL_PLACE',
    'AGENT_EMISSION_AMOUNT_MAX_DECIMAL_PLACE',
  ],
);
const precision = declarations(
  `${mainData}/measurementPrecisionContext.ts`,
  [
    'DEFAULT_MEASUREMENT_PRECISION',
    'PRODUCT_ACCOUNT_MEASUREMENT_PRECISION',
    'MeasurementPrecisionContext',
  ],
  { ...constants, createContext: React.createContext },
);
const {
  ShowFactorTypeContext,
  CustomFactorReuseContext,
  PROCESS_CUSTOM_FACTOR_REUSE_ENABLED,
} = declarations(
  `${factor}/context.ts`,
  [
    'ShowFactorTypeContext',
    'CustomFactorReuseContext',
    'PROCESS_CUSTOM_FACTOR_REUSE_ENABLED',
  ],
  {
    createContext: React.createContext,
  },
);
const { FactorTypeDisplayContext } = declarations(
  `${submodule}/formilyComponents/FormilyFactor/context.ts`,
  ['FactorTypeDisplayContext'],
  {
    createContext: React.createContext,
  },
);
const regs = declarations('src/utils/regs.ts', [
  'REGEXP_MORE_ZERO_DECIMALS',
  'regexpDecimalsNum',
]);
const { RegAccountValue, genNumberValidator } = declarations(
  'src/views/carbonFootprint3/util/index.tsx',
  ['RegAccountValue', 'genNumberValidator'],
  { ...regs, I18N, BigNumber },
);
const transportModule = declarations(
  `${transport}/transportSchema.tsx`,
  [
    'ETransportType',
    'ECalculationType',
    'transportTypeEnum',
    'calculationTypeEnum',
    'factorObjModelEmissionApiValidator',
    'factorObjDefaultValidator',
    'transportSchema',
  ],
  { I18N, titleTip: label => label, initFormilyInput: () => ({}) },
);
const transportUtils = declarations(
  `${transport}/transportUtil.ts`,
  ['unitNameMap', 'TransportListTransToService', 'serviceToForm'],
  { ...transportModule, I18N, console: { log() {} } },
);

for (const file of [
  'src/views/carbonFootprint3/discharge/ModelLibrary/Management/index.tsx',
  'src/views/carbonFootprint3/discharge/process/details/index.tsx',
  'src/views/carbonFootprint3/discharge/process/details/EmissionSourceModal/index.tsx',
  'src/views/supplyChain/components/ProcessCarbonData/index.tsx',
  'src/views/supplyChain/components/CarbonData/AccountProductModal/index.tsx',
]) {
  test(`related product-account entry scopes nine decimals: ${file}`, () => {
    const seen = [];
    const accountInfo = { id: 42 };
    function Probe(props) {
      seen.push({
        config: React.useContext(precision.MeasurementPrecisionContext),
        factor: React.useContext(ShowFactorTypeContext),
        props,
      });
      return null;
    }
    const element = jsx(file, 'MeasurementPrecisionContext.Provider', {
      ...precision,
      ShowFactorTypeContext,
      CustomFactorReuseContext,
      PROCESS_CUSTOM_FACTOR_REUSE_ENABLED,
      isDetail: false,
      content: React.createElement(Probe),
      modal: React.createElement(Probe),
      BuildModelList: Probe,
      accountInfo,
    });
    renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        element,
        React.createElement(Probe),
      ),
    );
    assert.equal(seen.length, 2);
    const { config } = seen[0];
    assert.equal(config, precision.PRODUCT_ACCOUNT_MEASUREMENT_PRECISION);
    assert.equal(config.amountDecimalPlace, 9);
    assert.equal(config.productWeightDecimalPlace, 9);
    assert.equal(RegAccountValue('1.123456789', config.amountDecimalPlace), '');
    assert.notEqual(
      RegAccountValue('1.1234567891', config.amountDecimalPlace),
      '',
    );
    const cargo = transportFields(config).productWeight.properties.amount;
    assert.equal(cargo['x-component-props'].precision, 9);
    assert.equal(cargo['x-component-props'].stringMode, true);
    assert.equal(seen[1].config, precision.DEFAULT_MEASUREMENT_PRECISION);
    assert.equal(seen[1].config.amountDecimalPlace, 6);
    assert.equal(seen[1].config.productWeightDecimalPlace, 6);
    if (file.includes('AccountProductModal')) {
      assert.equal(seen[0].factor, true);
      assert.equal(seen[0].props.accountInfo, accountInfo);
      assert.equal(seen[0].props.isDetail, true);
      assert.equal(seen[0].props.onlyCreateFactor, true);
    }
  });
}

const { getDecimalValue } = declarations(
  require.resolve('rc-input-number/lib/InputNumber'),
  ['getDecimalValue'],
);

function transportFields(options) {
  return transportModule.transportSchema(options).properties
    .accountEmissionTransportList.items.properties.gridWrapper.properties;
}

test('quick/process consumption accept nine decimals below the maximum, not the maximum itself', () => {
  const processValidator = genNumberValidator({
    max: 10000000000,
    decimalPlace: 9,
  });
  for (const value of ['0.000000001', '1.123456789', '9999999999.999999999']) {
    assert.equal(RegAccountValue(value, 9), '', value);
    assert.equal(processValidator(value), '', value);
  }
  for (const value of [
    '1.1234567891',
    '10000000000',
    '10000000000.000000001',
    '-1',
    'invalid',
  ]) {
    assert.notEqual(RegAccountValue(value, 9), '', value);
    assert.notEqual(processValidator(value), '', value);
  }
});

test('default six-decimal/zero rules stay unchanged; inclusive maximum comparison is exact', () => {
  const processValidator = genNumberValidator({
    max: 10000000000,
    decimalPlace: 6,
  });
  for (const value of ['', '0.000001', '123.123456', '9999999999.999999']) {
    assert.equal(RegAccountValue(value), '', value);
    assert.equal(processValidator(value), '', value);
  }
  assert.notEqual(RegAccountValue('0'), '');
  assert.equal(processValidator('0'), '');
  assert.notEqual(RegAccountValue('1.123456789'), '');
  assert.notEqual(processValidator('1.123456789'), '');
  const inclusive = genNumberValidator({
    max: 10000000000,
    decimalPlace: 9,
    includeMax: true,
  });
  assert.equal(inclusive('10000000000'), '');
  assert.notEqual(inclusive('10000000000.000000001'), '');
});

test('cargo weight uses lossless string mode only when higher precision is requested', () => {
  const defaults = transportFields();
  const highPrecision = transportFields({ productWeightDecimalPlace: 9 });
  const normal = defaults.productWeight.properties.amount['x-component-props'];
  const high =
    highPrecision.productWeight.properties.amount['x-component-props'];
  assert.equal(normal.precision, 6);
  assert.equal(normal.min, 0.000001);
  assert.equal(Boolean(normal.stringMode), false);
  assert.equal(high.precision, 9);
  assert.equal(high.min, 0.000000001);
  assert.equal(high.stringMode, true);
  const decimal = getMiniDecimal('12345678.123456789');
  assert.equal(getDecimalValue(high.stringMode, decimal), '12345678.123456789');
  assert.equal(
    typeof getDecimalValue(normal.stringMode, getMiniDecimal('1.123456')),
    'number',
  );
  for (const fields of [defaults, highPrecision]) {
    assert.equal(fields.distance['x-component-props'].precision, 6);
    assert.equal(
      fields.quantityUnit.properties.quantity['x-component-props'].precision,
      6,
    );
  }
});

test('cargo weight survives road/railway/air/sea form conversion and JSON serialization unchanged', () => {
  const { ECalculationType, ETransportType } = transportModule;
  const { TransportListTransToService, serviceToForm } = transportUtils;
  for (const value of [
    ETransportType.road,
    ETransportType.railway,
    ETransportType.air,
    ETransportType.sea,
  ]) {
    const row = {
      transportType: value,
      way: ECalculationType.byWeight,
      amount: '12345678.123456789',
      distance: 1,
      unitCode: '2',
      factorObj: { matchWay: 1, rate: '1', unit: 'kgCO2e/kgkm' },
    };
    const payload = JSON.parse(
      JSON.stringify(TransportListTransToService([row])),
    );
    assert.equal(payload[0].amount, row.amount);
    assert.equal(serviceToForm(payload)[0].amount, row.amount);
  }
});

test('model-check source drawer receives nine decimals without changing sibling defaults or drawer callbacks', () => {
  const seen = [];
  function EmissionSourceDrawer(props) {
    seen.push({
      config: React.useContext(precision.MeasurementPrecisionContext),
      props,
    });
    return null;
  }
  const events = [];
  const element = jsx(
    `${account}/component/AccountInfoBuildModel/BuildModelDescribe/CheckModalData.tsx`,
    'MeasurementPrecisionContext.Provider',
    {
      ...precision,
      ShowFactorTypeContext,
      CustomFactorReuseContext,
      PROCESS_CUSTOM_FACTOR_REUSE_ENABLED,
      GwpScopeContext: React.createContext(false),
      EcoinventGeographyContext: React.createContext(true),
      TransportReuseEnabledContext: React.createContext(true),
      enableAgentEmissionFields: true,
      EmissionSourceDrawer,
      initValues: undefined,
      emissionVisible: true,
      accountId: 42,
      emissionProps: { data: { id: 7, stage: 1 }, current: 0, total: 2 },
      closeEmissionDrawer: () => events.push('close'),
      changeEmissionPage: page => events.push(page),
      setEmissionVisible: value => events.push(value),
      updateModelCheckData: () => events.push('update'),
    },
  );
  renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      element,
      React.createElement(EmissionSourceDrawer),
    ),
  );
  assert.equal(seen[0].config, precision.PRODUCT_ACCOUNT_MEASUREMENT_PRECISION);
  assert.equal(seen[0].config.amountDecimalPlace, 9);
  assert.equal(seen[0].config.productWeightDecimalPlace, 9);
  assert.equal(seen[1].config, precision.DEFAULT_MEASUREMENT_PRECISION);
  assert.equal(seen[1].config.amountDecimalPlace, 6);
  assert.equal(seen[0].props.accountId, 42);
  assert.equal(seen[0].props.emissionSourceId, 7);
  seen[0].props.onSuccess();
  seen[0].props.onClose();
  assert.deepEqual(events, [1, 'update', 'close']);
});

test('template preview enables main canvas factor type while preserving submodule list configuration and read-only preview', () => {
  const EmissionDescriptionPreviewContext = React.createContext(false);
  const seen = [];
  const subSeen = [];
  function SubmoduleCard() {
    subSeen.push(React.useContext(FactorTypeDisplayContext));
    return null;
  }
  function CarbonFootprintModel(props) {
    seen.push({
      factor: React.useContext(ShowFactorTypeContext),
      description: React.useContext(EmissionDescriptionPreviewContext),
      props,
    });
    return React.createElement(
      FactorTypeDisplayContext.Provider,
      { value: props.factorTypeDisplay },
      React.createElement(SubmoduleCard),
    );
  }
  const { factorTypeDisplay } = declarations(
    `${account}/SelectModel/index.tsx`,
    ['factorTypeDisplay'],
    { I18N },
  );
  const element = jsx(
    `${account}/SelectModel/index.tsx`,
    'EmissionDescriptionPreviewContext.Provider',
    {
      EmissionDescriptionPreviewContext,
      ShowFactorTypeContext,
      CarbonFootprintModel,
      factorTypeDisplay,
      modelInfo: { id: 42, industry: '[["A"]]' },
      setModelDetailvisible() {},
    },
  );
  renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      element,
      React.createElement(CarbonFootprintModel),
    ),
  );
  assert.equal(seen[0].factor, true);
  assert.equal(seen[0].description, true);
  assert.equal(seen[0].props.readPretty, true);
  assert.equal(seen[0].props.info.id, 42);
  assert.equal(subSeen[0], factorTypeDisplay);
  assert.equal(seen[1].factor, false);
  assert.equal(subSeen[1], undefined);
});

test('account/share list and canvas retain nine decimals and pass through permissions and snapshot parameters', () => {
  const { BuildModelDescribeSet } = declarations(
    `${account}/component/AccountInfoBuildModel/constant.ts`,
    ['BuildModelDescribeSet'],
  );
  const { API_EXTRA_PARAMS_SNAPFLAG } = declarations(
    `${mainData}/constant.ts`,
    ['API_EXTRA_PARAMS_SNAPFLAG'],
  );
  const seen = [];
  function Content(props) {
    seen.push({
      config: React.useContext(precision.MeasurementPrecisionContext),
      props,
    });
    return null;
  }
  const { BuildModelMainData } = declarations(
    `${mainData}/index.tsx`,
    ['BuildModelMainDataContent', 'BuildModelMainData'],
    {
      ...precision,
      ...BuildModelDescribeSet,
      AllocationAccountContext: React.createContext(undefined),
      TransportReuseEnabledContext: React.createContext(true),
      memo: React.memo,
      style: {},
      BuildModelList: Content,
      BuildModelVisual: Content,
    },
  );
  for (const switchMain of [
    BuildModelDescribeSet.LIST,
    BuildModelDescribeSet.VISUAL,
  ]) {
    for (const snapFlag of [
      undefined,
      API_EXTRA_PARAMS_SNAPFLAG.SHARE,
      API_EXTRA_PARAMS_SNAPFLAG.ACCOUNT_SHARE_EDIT,
    ]) {
      for (const isDetail of [false, true]) {
        const apiExtraParams = { snapFlag };
        renderToStaticMarkup(
          React.createElement(BuildModelMainData, {
            switchMain,
            isDetail,
            apiExtraParams,
            accountInfo: { id: 42 },
          }),
        );
        const result = seen.at(-1);
        assert.equal(
          result.config,
          precision.PRODUCT_ACCOUNT_MEASUREMENT_PRECISION,
        );
        assert.equal(result.props.isDetail, isDetail);
        assert.equal(result.props.apiExtraParams, apiExtraParams);
      }
    }
  }
  assert.equal(seen.length, 12);
});
