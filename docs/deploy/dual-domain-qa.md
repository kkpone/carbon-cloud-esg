# 双域名部署验证清单（A2）

同一份产物服务两个域名，形态由 hostname 决定（见 `docs/deploy/deploy-mode.md`）
。本清单用于部署到测试域名后的回归。

## 部署方式

Jenkins 目前只覆盖测试域名（`Jenkinsfile` 的 `ALLOWED_DOMAINS`）：

| 提交信息标记                                          | 目标域名                         | 分支要求            |
| ----------------------------------------------------- | -------------------------------- | ------------------- |
| `[build-agenttest]` / `[build-agent]`                 | `agenttest.carbonstop.com`       | 单亲提交、直接 push |
| `[build-a]` / `[build-b]` / `[build-c]` / `[build-d]` | `ccloud-<x>-test.carbonstop.com` | 同上                |

生产/预发域名
（`agent.carbonstop.com`、`agent-pre.carbonstop.com`、`ccloud.carbonstop.com`）
不在本 Jenkinsfile 中，需要确认是否由另一条流水线发布。

## 部署前检查（本地）

1. `npm run lint`：oxlint 0 error（当前 122 个存量 error，见技术债）且
   `check-deploy-mode` 通过。
2. `npx tsc --noEmit`：无新增错误（当前 784）。
3. `node --test tests/carbon-agent/*.test.cjs`：19/19 通过。
4. `node --test scripts/test-*.cjs`：无新增失败（当前 223 通过 / 20 失败，基线
   205 / 27）。
5. 确认部署 commit 已包含 `src/config/deploy.ts`、`src/App.tsx` 的 Provider 修复
   、`rsbuild.config.ts` 的 define。

## agenttest.carbonstop.com（agent 形态）

| 检查项                                                  | 预期                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 访问 `/`                                                | 302 到 `/system/carbonAgent`                                                  |
| 标题                                                    | Carbon Agent                                                                  |
| 登录                                                    | 飞书入口可用；手机号 18602353734 / 000000 可登录                              |
| 菜单                                                    | 仅小碳入口（新对话/产品碳足迹/企业碳核算/CBAM/因子库/关注企业）               |
| 访问 `/work/index`、`/energyCarbon/*`、`/cbam/overview` | 302 回 `/system/carbonAgent`（云端路径被守卫拦截）                            |
| 分享页 `/share/agent/:id`、`/factors/:id`               | 可直接打开                                                                    |
| WPS 预览                                                | 使用 `REACT_APP_WPS_APP_ID_AGENT` / `REACT_APP_WPS_API_URL_AGENT`（pre 应用） |
| 控制台                                                  | 无 `CarbonAgentProvider is required`、无 `process is not defined`             |

## ccloud-a-test.carbonstop.com（cloud 形态）

| 检查项       | 预期                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------- |
| 访问 `/`     | 未登录跳登录页；登录后进 `/work/index`                                                       |
| 标题         | 碳云                                                                                         |
| 菜单         | 工作台/产品碳足迹/企业碳核算/CBAM/供应链碳管理/碳账户/因子库/…/能源管理/组织管理             |
| 能源管理     | `/energyCarbon/energyConsumptionQuery/query` 可打开                                          |
| CBAM         | 数据概览 `/cbam/overview`、监测 `/cbam/monitor`、报告 `/cbam/operationReport` 可打开且无空白 |
| 产品碳足迹   | `/carbonFootprint3/footprintAccount` 渲染，内嵌 Carbon Agent 输入框可用                      |
| 供应链看板   | `/supplyChain/dashboard` 有数据（已知控制台 `Maximum update depth exceeded` 属 master 存量） |
| 小碳专属路径 | `/system/carbonAgent`、`/factors/*`、`/share/agent/*` 302 到 `/work/index`                   |
| WPS 预览     | 使用 `REACT_APP_WPS_APP_ID`（生产应用）                                                      |
| 移动端       | 窄视口访问 `/` 进入 MobileLanding                                                            |

## 回滚

- 代码回滚点：`pre-merge/20261028/master`、`pre-merge/20261028/feat-agent`。
- 域名层面：Jenkins 重新构建上一版本 commit 即可，两个域名可独立回滚。

## 执行记录（2026-10-28）

部署源码：分支 `merge/master-20261028`（`4c5631896`，已 push 到 origin）。域名
：`ccloud-a-test.carbonstop.com`、`agent-a-test.carbonstop.com`。

### ccloud-a-test（cloud 形态）

| 检查项                                       | 结果                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| 未登录访问 `/`                               | 302 到 `/system/login?redirectURL=...`，标题「碳云」                     |
| 手机号 + 验证码登录                          | 成功，跳转 `/work/index`，token 写入 localStorage                        |
| 刷新页面                                     | 保持登录（URL 仍为 `/work/index`）                                       |
| `/system/carbonAgent`                        | 302 到 `/system/login?redirectURL=/work/index`（守卫拦截小碳专属路径）   |
| `/work/index`                                | 通过，菜单含 能源管理、CBAM、供应链碳管理                                |
| `/energyCarbon/energyConsumptionQuery/query` | 通过                                                                     |
| `/cbam/overview`、`/cbam/monitor`            | 通过                                                                     |
| `/carbonFootprint3/footprintAccount`         | 通过（含嵌入式 Carbon Agent 入口，无 `CarbonAgentProvider is required`） |
| `/CCDB/Home`                                 | 通过（因子更新公告可见）                                                 |
| `/supplyChain/dashboard`                     | 通过（已知存量 `Maximum update depth exceeded`）                         |

### agent-a-test（agent 形态）

| 检查项              | 结果                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| 访问 `/`            | 302 到 `/system/carbonAgent`，标题「Carbon Agent」                                               |
| 首页渲染            | 通过（新对话/产品碳足迹/企业碳核算/CBAM/因子库/关注企业，未登录态提示「登录后可用」）            |
| `/work/index`       | 302 回 `/system/carbonAgent`（云端路径被拦截）                                                   |
| `/energyCarbon/...` | 302 回 `/system/carbonAgent`                                                                     |
| `/system/login`     | 同样被守卫重定向到 `/system/carbonAgent`（该路径不在 agent 白名单，登录走小碳自有登录弹窗/飞书） |
| 登录态深度回归      | 未完成：登录弹窗按钮未被自动化点击命中，需人工或补选择器                                         |

### 两端共同现象

- 每次加载都会向 `POST /` 发一次统计 beacon（`src/utils/statistics.ts` 默认
  `baseUri` 为 origin 且未配置 url），nginx 返回 405。该文件与 master 一致，属存
  量问题，不影响功能。

### 补充：agent 域名登录态验证（2026-10-28）

通过首页左下角「未登录」入口打开登录弹窗，手机号 18602353734 + 验证码 000000 登
录成功：页面显示「企业碳核算测试组织 团队版」、历史会话与个性化推荐，无控制台错
误。

未覆盖：两端 WPS 文档预览（需要打开具体附件）、移动端落地页、分享页跨域打开。

### A3 收口状态

- `merge/master-20261028` 已推送（`4c5631896` 起）。
- 本地 `master` 已快进到 `30de76b3f`，但远端 `master` 受保护
  ，`git push origin master` 被拒
  （`You are not allowed to push code to protected branches`），需通过 Merge
  Request 合并：
  `http://gitlab-py.tzj.pub/fe/new_carbon_cloud/-/merge_requests/new?merge_request%5Bsource_branch%5D=merge%2Fmaster-20261028`

## 完整回测记录（2026-10-28，第二轮）

### ccloud-a-test.carbonstop.com（cloud）

| 页面                                                                  | 结果                                                                                         |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 工作台 `/work/index`                                                  | 通过                                                                                         |
| 产品碳足迹 `/carbonFootprint3/footprintAccount`                       | 通过                                                                                         |
| 企业碳核算-数据看板 `/enterpriseCarbonAccounting/accounting`          | 渲染通过；控制台有未捕获 promise rejection（axios 响应对象、status 200，业务码错误未 catch） |
| 企业碳核算-核算组织 `/enterpriseCarbonAccounting/carbonDischargeList` | 通过                                                                                         |
| CBAM 数据概览 `/cbam/overview`                                        | 通过                                                                                         |
| CBAM 监测管理 `/cbam/monitor`                                         | 通过                                                                                         |
| CBAM 报告管理 `/cbam/operationReport`                                 | 通过                                                                                         |
| CBAM 核算管理 `/cbam/report`                                          | 通过                                                                                         |
| CCDB `/CCDB/Home`                                                     | 通过                                                                                         |
| 供应链看板 `/supplyChain/dashboard`                                   | 通过（存量 `Maximum update depth exceeded` 属 master）                                       |
| 认证服务 `/Certification`                                             | 通过（占位页）                                                                               |
| 登录/刷新保持登录                                                     | 通过                                                                                         |
| 小碳专属路径拦截                                                      | 通过（`/system/carbonAgent` → 登录并回跳 `/work/index`）                                     |

### agent-a-test.carbonstop.com（agent）

| 项                               | 结果                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 首页 `/` → `/system/carbonAgent` | 通过，标题 Carbon Agent                                                                                                |
| 登录（首页弹窗）                 | 通过，显示「企业碳核算测试组织 团队版」                                                                                |
| 产品碳足迹入口                   | 通过（核算管理列表，含矿泉水核算数据）                                                                                 |
| 企业碳核算入口                   | 通过（核算管理表）                                                                                                     |
| CBAM 入口                        | 通过（文件管理，暂无文件）                                                                                             |
| 关注的企业入口                   | 通过（国能国源电力等企业卡片）                                                                                         |
| 云端路径 `/work/index`           | 通过（302 回小碳首页）                                                                                                 |
| **因子库入口**                   | **失败**：点击「因子库」后登录态被清除（`COMPANY_ID` 从 localStorage 移除，页面回到「未登录 登录后可用」），可稳定复现 |
| 历史会话点击                     | 未验证成功（自动化点击命中的是容器，未触发会话打开）                                                                   |
| 团队版入口                       | 未验证成功（同上）                                                                                                     |

### 待修复（按优先级）

1. **P1** agent 域名点击「因子库」导致登出（可复现）。需确认是合并引入还是
   feat-agent 既有行为。
2. **P2** cloud 企业碳核算数据看板存在未捕获的业务错误 promise（接口 200 + 业务
   码失败未 catch）。
3. **P3** 两端每次加载 `POST /` 统计 beacon 返回
   405（`src/utils/statistics.ts`，与 master 一致）。
