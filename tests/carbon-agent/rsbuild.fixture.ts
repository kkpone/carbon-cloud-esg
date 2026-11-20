import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'node:path';

const root = path.resolve(__dirname, '../..');
const stubs = path.join(__dirname, 'fixture-stubs.tsx');
export default defineConfig({
  plugins: [pluginReact()],
  source: {
    aliasStrategy: 'prefer-alias',
    entry: { index: path.join(__dirname, 'browser.fixture.tsx') },
    define: { 'process.env.REACT_APP_API_URL': JSON.stringify('') },
    alias: Object.fromEntries(
      [
        '@/utils/cookie',
        '@/utils',
        '@/components/LocaleProvider',
        '@/lang/I18N',
        '@/router/route-paths',
        '@/router/route-paths/corbonFootprint3',
        '@/views/carbonFootprint3/permissions',
        '@/views/carbonFootprint3/FootprintAccount/constant',
      ]
        .map(name => [`${name}$`, stubs])
        .concat([['@', path.join(root, 'src')]]),
    ),
  },
  server: { host: '127.0.0.1', port: 3191, strictPort: true, open: false },
  html: { title: 'Carbon Agent fixture — synthetic data only' },
  output: { distPath: { root: '/tmp/carbon-agent-fixture-build' } },
});
