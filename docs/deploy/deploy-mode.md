# 部署域名分流

同一份构建产物同时部署在 `agent*.carbonstop.com` 与 `ccloud*.carbonstop.com`，运行时根据 hostname 决定产品形态。形态差异集中在三个位置：`src/config/deploy.ts`、路由 `scope` 元数据、`src/index.tsx` 与 `src/App.tsx` 的装配。

## 判定规则

优先级从高到低：

1. `REACT_APP_DEPLOY_MODE=agent|cloud`（仅本地或临时验证使用，生产不配置）
2. URL 参数 `?deployMode=agent|cloud`
3. hostname：`^agent` → agent，`^ccloud` → cloud
4. 兜底：cloud（白标、`saas*`、`localhost`、IP 均按云端 SaaS 处理）

```ts
import { DEPLOY_MODE, isAgentDeploy, isAgentHost } from '@src/config/deploy';
```

## 本地调试

```bash
REACT_APP_DEPLOY_MODE=agent pnpm start
REACT_APP_DEPLOY_MODE=cloud pnpm start
```

也可以在已有服务上直接加参数切换：`http://localhost:3000/?deployMode=cloud`（仅在页面首次加载时生效）。

## 路由 scope

`src/router/config.ts` 的 `RouteBase` 支持：

```ts
scope?: 'agent' | 'cloud' | Array<'agent' | 'cloud'>;
```

- 缺省 = 两端都可用
- 过滤点：`menuRoutes()`、`flattenRoute()`（覆盖 `layoutRouteList`、`businessRouteList`、`FlattedMenuRoutes`）
- 已标注：小碳专属路由（`/system/carbonAgent` 及其 team、OAuth、SSO、分享、因子、邀请）为 `agent`；`/energyCarbon` 及其子路由为 `cloud`

新增页面时按用途显式标注，未标注会被 `npm run lint` 中的 `check-deploy-mode` 之外的人工评审遗漏，注意自查。

## 守卫行为

`src/App.tsx` 的 `DeployScopeGuard`：

| 场景 | 行为 |
| --- | --- |
| agent 域名访问非小碳路径 | 302 到 `/system/carbonAgent`（保留 query） |
| agent 域名访问小碳路径、共享页（分享登录、企业碳核算分享、`/agreement`） | 放行 |
| cloud 域名访问小碳专属路径 | 302 到 `/work/index` |

## 装配差异

| 能力 | agent | cloud |
| --- | --- | --- |
| `FeishuLoginGate`（飞书登录门禁） | 挂载 | 不挂载 |
| 文档标题 | `I18N.carbonAgent.carbonCloud` | `I18N.carbonFootprint3.carbonCloud` |
| 路由 scope 过滤 | 仅 agent + 通用 | 仅 cloud + 通用 |
| 移动端落地页 | 无 | 有（按视口触发） |

## 硬编码 hostname 检查

`npm run lint` 会执行 `scripts/check-deploy-mode.mjs`，拦截 `window.location.hostname`、`location.hostname`、`location.host` 的直接使用（`src/config/deploy.ts` 除外）。`new URL(url).hostname` 这类解析外部链接的用法不受限制。

## 排查

- 页面形态不对：先确认访问域名是否命中 `^agent` / `^ccloud`，再检查是否有 `?deployMode=` 或 `REACT_APP_DEPLOY_MODE` 覆盖。
- 路由 404：检查目标路由是否被 `scope` 过滤，以及 `check-deploy-mode` 是否放行。
- 本地表现与线上不一致：线上只按 hostname 判定，本地默认兜底 cloud。
