/**
 * 部署域名分流守卫：业务代码禁止直接读取 hostname。
 *
 * agent* 与 ccloud* 两个域名共用同一份构建产物，形态差异只能通过
 * src/config/deploy.ts 暴露的 DEPLOY_MODE / scope 表达。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const ALLOWED_FILES = new Set(['src/config/deploy.ts']);
const SOURCE_PATTERN = /\.(ts|tsx)$/;
const FORBIDDEN = [
  { pattern: /window\.location\.hostname/, label: 'window.location.hostname' },
  { pattern: /(^|[^.\w])location\.hostname/, label: 'location.hostname' },
  { pattern: /(^|[^.\w])location\.host\b/, label: 'location.host' },
];

const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!SOURCE_PATTERN.test(entry.name)) continue;
    if (ALLOWED_FILES.has(fullPath)) continue;

    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const rule of FORBIDDEN) {
        if (rule.pattern.test(line)) {
          violations.push(
            `${fullPath}:${index + 1}  ${rule.label}  ${line.trim()}`,
          );
        }
      }
    });
  }
}

walk(ROOT);

if (violations.length > 0) {
  console.error('部署域名判断必须收敛到 src/config/deploy.ts：');
  violations.forEach(item => console.error(`  ${item}`));
  process.exit(1);
}

console.log('deploy-mode check passed');
