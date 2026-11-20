# master × feat-agent 合并方案（2026-10-28）

> 状态：代码合并完成（P0–P4、P3-b 全部完成，待双域名 QA 与收口 P5/P7）
> 工作分支：`merge/master-20261028`（自 `feat-agent` 起）
> 快照 tag：`pre-merge/20261028/master`、`pre-merge/20261028/feat-agent`
> 台账：`docs/plans/merge-20261028/conflict-ledger.csv`（128 条）、`docs/plans/merge-20261028/master-only-files.csv`（367 条）

## 1. 决策记录

| 编号 | 决策 | 结论 |
| --- | --- | --- |
| D1 | 终态拓扑 | **方案 A**：合并到 `feat-agent` → `master` 快进到同一 commit；`agent*` 与 `ccloud*` 两个域名都由主干出包 |
| D2 | 两套小碳实现 | **收敛为一套，以 agent 侧（`src/views/system/carbonAgent`）为准**；master 的 `src/components/CarbonAgent` 不保留为长期第二实现，云端嵌入式入口改为复用 agent 实现（见 P5） |
| D3 | Lint 门禁 | **oxlint**（沿用 master 的 `npm run lint` = `oxlint ./src --quiet`）；eslint 依赖与 `.eslintrc.js` 在代码合并完成后清理（见 P5） |
| D4 | 域名分派 | `agentxxxx.carbonstop.com` → agent；`ccloudxxxx.carbonstop.com` → cloud；未知域名/白标/localhost **兜底 cloud**；本地可用 `REACT_APP_DEPLOY_MODE` 覆盖 |
| D5 | 环境变量 | 各环境沿用各自原有值；两侧取值不同的项（WPS 凭证、SAAS 地址）通过 `*_AGENT` 覆盖变量按 deploy mode 运行时解析，基础值以 cloud 侧为准 |
| D6 | 合并窗口 | 允许冻结 `master` / `feat-agent` 3–5 天；期间只允许在 `merge/master-20261028` 上作业 |

## 2. 现状盘点

| 指标 | 数值 |
| --- | --- |
| 分叉点 | `b64643669`（2026-07-08，merge base） |
| master 领先 | 237 个提交 |
| feat-agent 领先 | 641 个提交 |
| 树差异 | 1491 个文件：仅 feat-agent 690、仅 master 367、双方都改 423、重命名 11；+196,655 / −74,748 |
| 试合并冲突 | **128 个文件**：`add/add` 67、`content` 61；按体量 ≤20 行 54、21–100 行 42、101–400 行 19、>400 行 13 |

冲突分布（按目录）：`cbamOperationReport` 18、`src/components` 18（其中 `CarbonFootprintAccount` 10）、`carbonFootprint3` 17、`cbam` 15、`cbamMonitor` 10、`enterpriseCarbonAccount2` 8、`lang/*` 19（en-US 7 / zh-CN 7 / zh-TW 5）、`views/system` 4、`src/router` 3、`src/api` 2，其余为 `App.tsx`、`layout`、`utils`、`rsbuild.config.ts`、`.env.development`、`.env.pre`、`pnpm-lock.yaml`、`AGENTS.md`。

关键事实：

1. **feat-agent 在视图层是超集**：master 独有的视图目录只有 `energyCarbon`（187 文件）、`cbamPrecursor`（13）、`cbamOverview`（6）、`mobileLanding`（2），其余独有均为组件/资源/测试级别。
2. **存在两套小碳实现**：master 的 `src/components/CarbonAgent`（39 文件，嵌入碳足迹建模）与 feat-agent 的 `src/views/system/carbonAgent`（447 文件，独立产品）。按 D2 收敛到后者。
3. **大量冲突是同一改动被两侧各打一遍**（同 subject、不同 hash、日期相近，如「接入认证材料配置与运输数据复用」两侧同日不同 hash），因此既不能 `-X ours/-X theirs` 一把梭，也不该把 128 个冲突全部当语义冲突硬啃——按第 4 节分区规则批量裁决，只有 13 个大冲突需要逐个人工。

## 3. 目标架构：一套代码 + 运行时域名分流

一个构建产物同时部署到 `agent*` 与 `ccloud*`，**运行时按 hostname 决定产品形态**。

### 3.1 单一入口：`src/config/deploy.ts`（新增）

```ts
export type DeployMode = 'agent' | 'cloud';

const AGENT_HOST = /^agent/i;   // agent / agenttest / agent-pre / agentxxxx
const CLOUD_HOST = /^ccloud/i;  // ccloud / ccloud-a-test / ccloudxxxx

// 优先级：REACT_APP_DEPLOY_MODE > ?deployMode= > hostname > 兜底 cloud
export function resolveDeployMode(
  hostname?: string,
  envOverride?: string,
  search?: string,
): DeployMode;

export const DEPLOY_MODE: DeployMode;
export function isAgentHost(hostname?: string): boolean;
export function isCloudHost(hostname?: string): boolean;
```

规则：

- `REACT_APP_DEPLOY_MODE=agent|cloud`（仅本地/临时验证使用，生产不配置）
- `?deployMode=cloud` 便于本地快速切换
- hostname 命中 `^agent` → agent；命中 `^ccloud` → cloud；其它（白标、`saas*`、`localhost`、IP）→ **cloud**
- **业务代码禁止直接读 `window.location.hostname`**，统一走本模块；`src/views/system/carbonAgent/ccdbFactor.ts`、`src/App.tsx` 的硬编码 host 列表一并替换

### 3.2 路由分流：`scope` 元数据

在 `src/router/config.ts` 的 `RouteBase` 增加：

```ts
// 缺省 = 两端都可用
scope?: DeployMode | DeployMode[];
```

- 过滤点：`menuRoutes()`（同时覆盖 `LayoutSideBar`、`router/utils` 的消费方）、`getLayoutRouteList()`、`getBusinessRouteList()`
- 标注范围：agent-only = `carbonAgent`、`carbonAgentTeam`、SSO/OAuth/device、`carbonAgentShare`、`carbonAgentFactor`、`carbonAgentProjectInvite`；cloud-only = `cbamOverview`、`cbamPrecursor`、`energyCarbon`、`supplyChain/Dashboard`、CCDB 因子公告相关页

### 3.3 守卫统一：`DeployScopeGuard`

替换现有 `AgentTestDomainGuard`：

- **agent 域名**：仅放行 `/system/carbonAgent`、`/system/carbonAgent/team/**`、SSO/OAuth/device、`/share/agent/*`、`/factors/*`、`/agent/project/invite/*`、`/agreement`，其余 302 到 `/system/carbonAgent`
- **cloud 域名**：反向屏蔽 agent-only 路径，302 到 `/work/index`
- 移动端：cloud 域名沿用 master 的 `MobileLanding`；agent 域名维持现状

### 3.4 Provider 级装配

| Provider / 行为 | agent | cloud | 说明 |
| --- | --- | --- | --- |
| `FeishuLoginGate` | ✅ | ❌ | 未核验飞书身份时会 `Cancel` 所有请求，cloud 域名**必须不挂载** |
| `CarbonAgentProvider`（云端嵌入式小碳） | ❌ | ✅ | P5 收敛为 agent 实现后重新接入 |
| `AICarbonFloatingProvider` | 现状保留 | ✅ | |
| `LocaleProvider` + `localePath` | ✅ | ✅ | 默认无 locale 前缀，兼容云端老链接 |
| Sentry | ✅ | ✅ | release 标记带 deploy mode |
| `MobileLanding` | ❌ | ✅ | 仅 cloud |

### 3.5 环境变量（D5）

两侧取值不同的项，保留两侧原值并以 `*_AGENT` 覆盖：

| 变量 | 用途 | cloud（基础值，沿用 master） | agent（覆盖值，沿用 feat-agent） |
| --- | --- | --- | --- |
| `REACT_APP_WPS_APP_ID` / `*_AGENT` | WPS WebOffice App | `AK20260324DQFHBL`（prod/pre） | `SX20260320WBXYDI` |
| `REACT_APP_WPS_API_URL` / `*_AGENT` | WPS 服务地址 | `https://wps-api.carbonstop.com` | `https://wps-api-pre.carbonstop.com` |
| `REACT_APP_SAAS_URL` / `*_AGENT` | SaaS 基址（跨域链接） | `https://ccloud.carbonstop.com` 等 | 缺省回退基础值 |
| `REACT_APP_DEPLOY_MODE` | 本地强制模式 | 不配置 | 不配置 |

其余变量保持单值，按环境（dev / test / pre / prod）各自维持现状。

### 3.6 治理

- 新增 `scripts/check-deploy-mode.mjs`：扫描 `src/**`，除 `src/config/deploy.ts` 外出现 `location.hostname` / `location.host` 直接失败
- `AGENTS.md` 增补：域名差异只能通过 `src/config/deploy.ts` + 路由 `scope` 表达，禁止新增 hostname 判断与按域名复制的组件
- 文档：`docs/deploy/deploy-mode.md`（域名差异矩阵与排查手册）

## 4. 冲突分区与裁决规则

| 区 | 主要内容 | 默认取 | 处理方式 |
| --- | --- | --- | --- |
| ① agent 产品与基建 | `views/system/carbonAgent/**`、`agentSsoCallback`、`FeishuLoginGate`、`feishuSession`、`localePath`、`clipboard`、`limitNumberInputDigits`、`ccdbReferral`、`LocaleProvider`、`App.tsx`、`index.tsx` | feat-agent | 先全量取 agent 侧，再补 mode 守卫与 gate |
| ② 云端独有新增（367 个） | `energyCarbon`（187）、`cbamOverview`、`cbamPrecursor`、`mobileLanding`、`supplyChain/Dashboard`、`components/CarbonAgent`（39）、`FilePreviewModal`、`SavedFactorManager`、`SearchFactor` 偏好、`CarbonFootprintAccount` 新增子模块、`CCDB/Home` 公告、`work/AgentBanner`、`Certification/SiteMaterial`、`tests/carbon-agent` | 自动带入 | 已核实：367 个文件**全部是 master 在分叉点之后的新增**，feat-agent 从未持有，也无一例“feat-agent 删除过”的文件（无 `modify/delete` 冲突），因此 merge 会自动带入，**不需要 `git checkout`**；P2 的工作是分诊 + 接线（路由、菜单、`scope`、调用点） |
| ③ 两侧都已删除的旧实现 | `enterpriseCarbonAccount2/CBAM/**` 等 | 保持删除 | 该类路径在合并前就已从两侧同时移除（CBAM 已迁至 `src/views/cbam`），merge 后状态不变，无需处理 |
| ④ 双线共改 | `carbonFootprint3`、`CarbonFootprintAccount`、`cbam`、`cbamMonitor`、`cbamOperationReport`、`Certification`、`enterpriseCarbonAccount2`、`CCDB`、`login` | 逐文件判定 | 原则：**一份实现能服务两端就不分叉**；CBAM 以 master 为基线（8–10 月重构更完整：数据概览、前体、凭证、定价、完成度），把 feat-agent 侧 agent 相关增强（精度/因子类型展示、`MonitorFileUpload`、嵌入面板保存栏）落成开关 |
| ⑤ i18n | `lang/{en-US,zh-CN,zh-TW}` 19 个冲突 + 各模块新增 | 并集 | 同名 key 随 ④ 裁决；合并后跑 kiwi 校验、清孤儿 key、扫描新增中文 |
| ⑥ 工程配置 | `package.json`、`pnpm-lock.yaml`、`rsbuild.config.ts`、`.env.*`、`tsconfig*` | 见下 | `package.json` = feat-agent 依赖 + master 新增（`dayjs`/`zod`/`oxlint`），`scripts` 取 master；lock 用 `pnpm install` 重新生成；`.env.*` 按 3.5 处理；linter 取 oxlint |

### 4.1 需要逐个人工的大冲突（13 个）

| 文件 | 两侧差异行 | 建议基线 |
| --- | --- | --- |
| `pnpm-lock.yaml` | 20522 | 重新生成 |
| `src/views/cbamMonitor/components/ConfigSections.tsx` | 2818 | master（PFC/定价）+ agent 校验 |
| `src/lang/{en-US,zh-CN,zh-TW}/carbonAgent.ts` | 1952 / 1815 / 1802 | 并集 |
| `src/views/cbamOperationReport/ReportInfo/index.tsx` | 1215 | 语义合并 |
| `src/views/enterpriseCarbonAccount2/accounting/fillData/components/AccountEmissions/index.tsx` | 757 | master + agent 精度 |
| `src/views/carbonFootprint3/component/EmissionSourceDrawer/index.tsx` | 688 | 语义合并（同日双份） |
| `src/components/FileUploadDrawer/index.tsx` | 539 | master |
| `src/views/cbamOperationReport/ReportInfo/components/Co2EvidenceModal/index.tsx` | 516 | master（凭证管理） |
| `src/views/cbamMonitor/Plan/index.tsx` | 507 | master |
| `src/views/cbamOperationReport/completion.ts` | 407 | master |
| `src/views/Certification/.../ApplayCertification/index.tsx` | 394 | 语义合并 |
| `src/views/carbonFootprint3/.../AccountInfo/index.tsx` | 330 | master |
| `src/components/CarbonFootprintAccount/.../QuickTable/index.tsx` | 361 | 语义合并 |

## 5. 执行阶段

| 阶段 | 内容 | 工期 | 验收 |
| --- | --- | --- | --- |
| **P0 冻结与基线** | 打 tag、建 `merge/master-20261028`、公告冻结；抓 `agenttest` / `ccloud-a-test` 基线页面清单与截图 | 0.5d | 基线可复现 |
| **P1 合并骨架** | `git merge --no-commit --no-ff master`；128 个冲突**先全量取 feat-agent**（`git checkout --ours`）落成合并提交；确认可编译、可起服务 | 1d | `npx oxlint ./src --quiet` 通过；`pnpm start` 可起；台账状态全部置 `resolved_ours` |
| **P2 分诊与接线** | 367 个 master 新增文件由 merge 自动带入，按 `master-only-files.csv` 分诊：`keep_and_wire`（242）补路由/菜单/`scope` 与调用点，`review`（110）逐项确认与 feat-agent 同名实现的关系，`keep`（15）直接保留；每批一次 lint | 1.5d | 云端 4 大模块可从路由进入；`master-only-files.csv` 全部有结论 |
| **P3 双线共改三方合并** | 13 个大冲突逐个人工 + 其余 ④ 类按规则批量；每个文件以 merge-base 为基底做语义合并 | 2.5d | 台账 ④ 类全部 `resolved_both` 并有 review 记录 |
| **P4 域名分流落地** | `deploy.ts`、`scope` 标注、`DeployScopeGuard`、Provider 装配、title/logo/favicon、跨域链接去硬编码、`ccdbFactor` 改造、`check-deploy-mode.mjs` | 1.5d | `REACT_APP_DEPLOY_MODE=agent\|cloud` 两种形态本地跑通 |
| **P5 小碳收敛 + i18n 清理** | 抽出 agent 侧可复用组件（Composer/Messages/protocol）供云端嵌入式入口使用，删除 `src/components/CarbonAgent` 与重复实现，迁移 `tests/carbon-agent/*`；三语言并集与孤儿 key 清理；删除 eslint 依赖与 `.eslintrc.js` | 2d | 仅剩一套小碳实现；`npm run lint`（oxlint）通过 |
| **P6 回归验证** | 自动化 + 手工矩阵 + 双域名部署回归（见第 6 节） | 1.5d | 两端 checklist 全绿，与基线截图对比无回归 |
| **P7 收口** | 合入 `master`、`feat-agent` 对齐同 commit、Jenkins `ALLOWED_DOMAINS` / `targetDomainMap` 更新、`AGENTS.md` 增补、`docs/deploy/deploy-mode.md` | 0.5d | 两端域名同分支出包成功 |

合计约 11 人日；2 人并行（P2/P3 与 P4/P5 拆开）约 6–7 天。

### 5.1 P1 的刻意设计

先把 128 个冲突全部解析为 feat-agent 侧，提交出一个「agent 侧 + master 非冲突新增」的可运行基线，再把 master 的语义按簇分批补回。好处：

- 合并提交不再是一个不可审的巨型 diff，而是一条**逐簇可 review、可单独回滚**的提交链
- 每个阶段都有可运行、可部署的中间态，回归问题时能二分定位
- 避免"边合边改"导致的冲突反复

## 6. 验证矩阵

### 6.1 自动化

| 项 | 命令 | 说明 |
| --- | --- | --- |
| Lint | `npm run lint`（oxlint） | AGENTS.md 指定的唯一代码校验方式，**禁止用 `npm run build` 校验** |
| 类型 | `npx tsc --noEmit -p tsconfig.json` | 非构建校验 |
| 单测（feat-agent 侧） | `node --test scripts/test-*.cjs` | 无网络依赖，转译源码后断言 |
| 单测（master 侧） | `node --test tests/carbon-agent/*.test.cjs` | P5 迁移路径后需同步修改 |
| 域名守卫 | `node scripts/check-deploy-mode.mjs` | P4 新增 |

### 6.2 手工与部署

| 域名 | 必测 |
| --- | --- |
| `agenttest.carbonstop.com` | 登录（飞书/手机号 18602353734 + 000000）、小碳对话、团队管理、分享页、因子会话、SSO 回调、越权路径重定向 |
| `ccloud-a-test.carbonstop.com` | 工作台、企业碳核算、碳足迹建模（含嵌入式小碳）、CBAM 监测/运营报告/数据概览/前体、认证、供应链、能碳、CCDB 因子公告、移动端落地页、越权路径重定向 |

对比 P0 基线截图；两端各出一份 checklist 并归档到 `docs/plans/merge-20261028/qa-*.md`。

## 7. 风险与回退

1. **`src/api/request.ts` 反向依赖 agent 视图**（`views/system/carbonAgent/monitor/json`、`team/errors`）：合并后抽为 agent 专用初始化模块，仅 `DEPLOY_MODE === 'agent'` 时启用，避免飞书/工作区逻辑污染云端请求。
2. **一个产物服务两个域名**：任一端回归失败即整体回退。全部阶段在独立分支 + 测试域名完成，`master` / `feat-agent` 在 P7 前保持不动；上线前留 tag 回退点。
3. **两套小碳收敛成本**：若 P5 评估超 2 人日，先以 adapter 保留云端嵌入式入口，删除重复实现另起 PR，不阻塞本次合并（但不得新增第二实现的分支开发）。
4. **locale 前缀改变 URL**：需实测云端无前缀老链接仍可用（`localePath` 默认无前缀，风险可控）。
5. **linter 迁移噪声**：P1–P4 期间以 `npx oxlint ./src --quiet` 为准，eslint 配置暂留；P5 统一删除。若 oxlint 在 agent 代码上报错量过大，先 `--deny-warnings` 降级为告警并登记待修清单。
6. **环境变量取值**：WPS 凭证按 D5 双值保留，配置缺失时回退基础值并在启动时 `console.warn`。

## 8. 附录

- `docs/plans/merge-20261028/conflict-ledger.csv`：128 条冲突台账（路径、类型、体量、两侧最后提交、分区、默认裁决、状态）
- `docs/plans/merge-20261028/master-only-files.csv`：367 个 master 新增文件的分诊表（`keep` 15 / `keep_and_wire` 242 / `review` 110），含分组、类型与处理建议

## 9. 执行记录

| 阶段 | 日期 | 结果 |
| --- | --- | --- |
| P0 | 2026-10-28 | 快照 tag `pre-merge/20261028/master`、`pre-merge/20261028/feat-agent`；工作分支 `merge/master-20261028` 自 `feat-agent` 起 |
| 文档 | 2026-10-28 | 方案 + 台账 `95746e391` |
| P1 | 2026-10-28 | merge 提交 `bdc0df077`（parents `95746e391` / `352017c47`）；128 个冲突全部解析为 feat-agent 侧；367 个 master 新增文件自动带入；合并后 `src` 5207 个文件（agent 产品 443、`energyCarbon` 187、`components/CarbonAgent` 39） |
| P1 校验 | 2026-10-28 | `oxlint` 126 errors / 3501 warnings（基线：master 28、feat-agent 252）；`.eslintrc.js`/`.eslintignore` 因 master 迁移 oxlint 被 merge 删除；`pnpm install --lockfile-only` 重新生成锁文件（含 `dayjs` / `zod` / `oxlint`） |
| P3-a | 2026-10-28 | i18n 并集：3 语言补 `common`/`energyCarbon`/`cbamPrecursor`/`importFile` 命名空间；6 个冲突模块按基准侧合并（`carbonAgent`/`ccdb` 以 agent 为基准，`cbamMonitor`/`cbamOperationReport`/`Certification`/`ilcd` 以 master 为基准）；源码引用缺失键 223 → 16（均为两端存量）；tsc 2517 → 868（master 858、feat-agent 729）。报告见 `i18n-merge-report.md` |
| P2 | 2026-10-28 | 云端模块接线：恢复 `cbamOverview`/`cbamPrecursor`/`cbamMonitor`/`cbamOperationReport` 路由（`scope: 'cloud'`）与 `cbamPrecursor`/`cbamOverview` 路由常量；云端工作台恢复 `AgentBanner` 入口；移动端落地页仅 cloud 生效；`energyCarbon` 与供应链看板路由随 merge 自动恢复；tsc 868（无新增） |
| P3-b（进行中） | 2026-10-28 | 13 个大冲突：`completion.ts` 取 master（唯一调用方 API 不变）；其余按簇并行处理：cbamMonitor（ConfigSections、Plan）、cbamOperationReport（ReportInfo、Co2EvidenceModal、ConditionInfo、ProductionInfo）、小碳/云端共用（EmissionSourceDrawer、AccountInfo、ApplayCertification）、建模与上传（AccountEmissions、FileUploadDrawer、QuickTable、EmissionDrawer）。剩余小冲突按「行集合包含关系」机械判定 12 个、完全一致 2 个，其余逐个人工 |
| P3-b 收尾 | 2026-10-28 | 60 个共用模块按簇并行核对；33 个文件确认 feat 已含 master 语义保持原样；补齐 `SavedFactorPicker` 回归（恢复本地删除流程）、`CheckModalData` 的 `ShowFactorTypeContext` 提供者、zh-TW 缺失的 13 个词条、`fileTooLarge` 占位符文案 |
| P6-a 回归 | 2026-10-28 | `scripts/test-*.cjs`：223 通过 / 21 失败（feat-agent 基线 205 / 27，无新增失败）；`tests/carbon-agent/*.test.cjs`：19/19 通过（修复 2 个测试桩与 1 个词条）；tsc 868 → 829；oxlint 126 → 123 |
| P4 补充 | 2026-10-28 | WPS 凭证按域名双值解析（`*_AGENT` 覆盖，`.env.development` / `.env.pre` 写入两套值）；`skipErrorToast` 与 `silentResponseError` 双写兼容；本地代理支持两侧变量名；菜单补回 CBAM/能碳图标与供应链激活路径；布局补回 CBAM 路由的 noPadding/noWrapper 特例 |
| P4 | 2026-10-28 | `src/config/deploy.ts`（hostname 判定、`scope` 过滤、agent 白名单）；路由 `scope` 标注（agent 8 处、`energyCarbon` 1 处）；`DeployScopeGuard` 双向守卫（agent 未放行 → 小碳首页，cloud 访问小碳路径 → 工作台）；`FeishuLoginGate` 仅 agent 挂载；`document.title` 随域名切换；`scripts/check-deploy-mode.mjs` 接入 `npm run lint`；tsc 868（无新增）；使用文档 `docs/deploy/deploy-mode.md` |




## 10. 当前状态与剩余工作

已完成（`merge/master-20261028`）：

| 项 | 结果 |
| --- | --- |
| 冲突 | 128 个全部有结论（127 `resolved_both`、1 `resolved_master`） |
| i18n | 3 语言命名空间与词条并集；源码缺失键 223 → 0（16 个两端存量缺口另行跟踪） |
| 域名分流 | `src/config/deploy.ts`、路由 `scope`、双向守卫、WPS 双值、`check-deploy-mode` 门禁 |
| 云端接线 | `energyCarbon`、`cbamOverview`、`cbamPrecursor`、CBAM 监测/运营报告、供应链看板、移动端落地页、工作台 AgentBanner |
| 回归 | tsc 868 → 829（master 基线 858）；oxlint 126 → 123（feat-agent 基线 252）；`tests/carbon-agent` 19/19；`scripts/test-*.cjs` 223 通过 / 20 失败（feat-agent 基线 205 / 27，无新增失败） |

剩余（不在本次合并范围内）：

1. **P5 小碳收敛**：`src/components/CarbonAgent` 与 `src/views/system/carbonAgent` 仍是两套实现，短期由域名隔离；收敛需先抽出可复用的 Composer/Messages/protocol。
2. **P6 双域名 QA**：部署 `agenttest.carbonstop.com` 与 `ccloud-a-test.carbonstop.com`，按第 6 节矩阵回归（本地无法代替）。
3. **P7 收口**：`master` 快进到本分支、`feat-agent` 对齐、Jenkins 域名映射更新、`docs/deploy/deploy-mode.md` 发布。
4. **存量债务**：123 个 oxlint error 集中在 `views/system/carbonAgent`、`views/subModules`（合并前即存在）；`ReportInfo`/`ProductionInfo`/`ConfigSections` 超 2000 行；`AccountEmissions` 缺 `orgId` 入参导致人员筛选退化为公司级。

## 11. 端到端回归记录（2026-10-28）

环境：本地 `rsbuild dev` + 无头 Chrome（CDP 驱动），测试账号 18602353734 / 000000，测试组织「企业碳核算测试组织」。

| 页面 | 路径 | 结果 |
| --- | --- | --- |
| 登录 + 工作台 | `/system/login` → `/work/index` | 通过；菜单含 能源管理、CBAM、供应链碳管理，AgentBanner 正常 |
| 能源管理 | `/energyCarbon/energyConsumptionQuery/query` | 通过 |
| CBAM 数据概览 | `/cbam/overview` | 通过，碳税预测/履约测算有数据 |
| CBAM 监测管理 | `/cbam/monitor` | 通过（计划总数 13 / 生效 3） |
| CBAM 报告管理列表 | `/cbam/operationReport` | 通过（报告任务 7 / 已完成 3） |
| CBAM 核算管理 | `/cbam/report` | 通过（表格有数据） |
| CBAM 运营报告新增 | `/cbam/operationReport/add` | 通过（完成度侧栏 0%，17 项待完善） |
| 产品碳足迹核算 | `/carbonFootprint3/footprintAccount` | 首轮失败，修复后通过（见下） |
| CCDB 因子库 | `/CCDB/Home` | 通过，含 master 新增的因子更新公告 |
| 认证服务 | `/Certification` | 渲染，但页面出现 `CertificationEnterpriseIndex` 字样，待确认 |
| 企业碳核算 | `/enterpriseCarbonAccounting` | 跳转 `/productIntor`（未开通/介绍页），需确认组织权限 |
| 小碳首页（登录态） | `/system/carbonAgent?deployMode=agent` | 通过，历史会话与团队版正常 |
| 供应链看板 | `/supplyChain/dashboard` | 渲染有数据，但控制台报 `Maximum update depth exceeded` |

### 回归中修复的缺陷

`CarbonAgentProvider is required`：产品碳足迹页的 `ModelingEntry` 依赖 master 的 App 级 `CarbonAgentProvider`，合并时未带入，导致页面崩溃。已在 `src/App.tsx` 按 master 结构挂载 Provider，cloud 渲染 `CarbonAgent` 面板、agent 保留原浮动入口（提交 `5180a4359`）。

### 待排查

1. `/supplyChain/dashboard` 的 `Maximum update depth exceeded`（master 新增页面，需确认是否存量）。
2. `/Certification` 页面出现路由名 `CertificationEnterpriseIndex` 文案。
3. `/enterpriseCarbonAccounting` 落在未开通页，需确认是组织权限还是路由问题。
4. 无头 Chrome 持久会话下 `Page.captureScreenshot` 超时，截图证据改用新实例获取；不影响功能判定。

### A1 补充页面与告警定性（2026-10-28 第二轮）

| 页面 | 结果 |
| --- | --- |
| `/enterpriseCarbonAccounting/accounting` | 渲染（GHG Protocol 标准、数据概览图表）；控制台有未捕获 promise rejection，对象为 `{status:200,...}` 的 axios 响应，属业务码错误未 catch，页面无白屏 |
| `/enterpriseCarbonAccounting/carbonDischargeList` | 通过（核算组织列表、分组树正常） |
| 小碳首页历史会话 | 列表与入口正常；点击历史项未跳转（该会话为「缺失对象/会话异常」状态），深度预览需人工用例 |

告警定性：

1. `/supplyChain/dashboard` 的 `Maximum update depth exceeded`：`src/views/supplyChain/Dashboard` 与 `master` **完全一致**（`git diff master -- src/views/supplyChain/Dashboard` 为空），属 master 存量问题，非本次合并引入。组件栈指向 `EnterpriseAnalysisView` 内的 antd `Select`。
2. `/Certification` 的 `CertificationEnterpriseIndex` 文案：`src/views/Certification/Enterprise/index.tsx` 本身就是占位页（只渲染该字符串），非合并问题。
3. `/enterpriseCarbonAccounting` 落在 `/productIntor`：路由配置里父路由 `redirect` 到产品介绍页，属设计行为；真实核算入口是 `/enterpriseCarbonAccounting/accounting` 与 `/carbonDischargeList`。
