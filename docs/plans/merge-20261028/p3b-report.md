# P3-b 大冲突合并记录（2026-10-28）

## 处理方式

13 个大冲突按目录分 4 簇并行处理，规则：master 侧业务为基线，保留 feat-agent 侧被小碳复用的能力（`embedded`/`readonly`/`refreshKey`、agent 预览数据源、精度与因子类型展示）。

| 簇 | 文件 | 结果 |
| --- | --- | --- |
| cbamMonitor | `components/ConfigSections.tsx`、`Plan/index.tsx` | master 的 PFC 适用性/默认工厂/面包屑 + feat 的嵌入面板、字符串 ID、`mergeWith` 保留 null |
| cbamOperationReport | `ReportInfo`、`Co2EvidenceModal`、`ConditionInfo`、`ProductionInfo` | master 的报告期跨年校验、`ReportOverview` 定价页签 + feat 的 embedded/refreshKey/serverUpdatePending |
| 小碳与云端共用 | `EmissionSourceDrawer`、`AccountInfo`、`ApplayCertification` | master 的因子偏好阶段、`useCarbonAgent`、现场认证材料 + feat 的预览 props 与数据源 |
| 建模与上传 | `AccountEmissions`、`FileUploadDrawer`、`QuickTable`、`AccessoryDrawer/EmissionDrawer` | master 的填报人列/批量指派、文件预览、拖拽排序 + feat 的精度限制、agent 预览布局 |

## 跨文件补齐

- `cbamOperationReport/{service,types}.ts`：补回 `getOperationReportOverview`、`saveOperationReportPricing`、`OperationReportOverview`、`OperationPricingPayload`、`OperationFreeAllocationItem`；请求选项统一为 feat 的 `silentResponseError`
- `cbamMonitor/validation.ts`：补回 `isAluminumCnCode`、`hasAluminumProcess` 导出
- `QuickTable/{service,type}.ts`、`QuickTable/index.module.less`：补回拖拽排序接口、参数类型与样式类
- `AccessoryDrawer/EmissionDrawer/type.ts`：`Emission` 增加 `accountEmissionTransportList`

## 指标

| 项 | 合并前 | 现在 |
| --- | --- | --- |
| tsc 错误 | 868 | 864 |
| oxlint 错误 | 126 | 127 |
| 台账剩余未处理 | 93 | 74 |

## 已知问题

- oxlint 127 个错误中，新进入的 1 个为 master 代码里的嵌套三元（`ReportInfo`/`ProductionInfo`），与 master 基线同源，列 P5 统一清理
- `ReportInfo`（2085 行）、`ProductionInfo`（3923 行）、`ConfigSections`（3227 行）超出 2000 行约定，属存量，需在后续拆分
- `AccountEmissions` 的填报人筛选依赖 `orgId`/`isLightUser` 等入参，当前调用方未传（已设为可选），人员列表退化为公司级
