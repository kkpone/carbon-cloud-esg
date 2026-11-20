# i18n 并集报告（2026-10-28）

## 做法

1. 命名空间并集：`src/lang/{en-US,zh-CN,zh-TW}/index.ts` 以 feat-agent 结构为基底，补入 master 独有的 `common`、`energyCarbon`、`cbamPrecursor`、`importFile`（每语言 4 个）。
2. 模块并通过 TypeScript AST 完成，按基准侧合并、缺失键追加、同键保留基准值：
   - 基准 = feat-agent：`carbonAgent.ts`（+116 键/语言）、`ccdb.ts`（+16 键/语言）
   - 基准 = master：`cbamMonitor.ts`（+53 键/语言）、`cbamOperationReport.ts`（+15 键/语言）、`Certification.ts`、`ilcd.ts`（master 为超集）
3. 校验：把 lang 编译为 CommonJS 后扫描 `src/**` 的 `I18N.<ns>.<key>` 用法，缺失键从 223 降到 16。

## 结果

| 指标 | 合并前 | 合并后 |
| --- | --- | --- |
| 命名空间缺失导致的 tsc 错误 | ~1360 | 0 |
| tsc 错误总数 | 2517 | 868（master 基线 858、feat-agent 基线 729） |
| 源码中引用但 lang 未定义的键 | 223 | 16（master 同样缺失，属存量） |

## 同键不同值（保留基准侧，待 P3-b 复核）

| 文件 | 键 | 采用值 | 另一侧值 |
| --- | --- | --- | --- |
| en-US/carbonAgent.ts | addRow | `Add a row` | `Add row` |
| en-US/carbonAgent.ts | fileTooLarge | `{val1} exceeds 20MB, cannot upload` | `Each file must be no larger than 20 MB` |
| zh-CN/carbonAgent.ts | addRow | `添加一行` | `添加行` |
| zh-CN/carbonAgent.ts | fileTooLarge | `{val1} 超过 20MB，无法上传` | `单个文件不能超过 20 MB` |
| zh-TW/carbonAgent.ts | addRow | `新增一行` | `添加行` |
| zh-TW/carbonAgent.ts | fileTooLarge | `{val1} 超過 20MB，無法上傳` | `單個文件不能超過 20 MB` |
| zh-TW/ilcd.ts | emissionDescriptionMatchLabel | `智能匹配` | `智慧匹配` |

`carbonAgent.fileTooLarge` 两侧占位符语义不同（master 侧带 `{val1}`，feat-agent 侧为静态文案），P5 删除 master 版 `components/CarbonAgent` 后需确认最终调用方传入的参数。

## 存量缺口（master 与 feat-agent 均缺失，不属本次合并回归）

`components.auditConfiguration`、`components.auditRecords`、`components.reviewProcess`、`components.reviewRemarks`、`components.reviewStage`、`components.reviewTime`、`components.reviewer`、`components.supplierData`、`components.unitConversionRatio`、`dashborad.fileName`、`dashborad.remarks`、`esg.noPermission`、`carbonAccount.add`、`subModules.certNoticeSiteFileDefaultBody`、`subModules.certNoticeSiteFileDefaultEmailTitle`、`createI18nLabelMap` 中的 `I18N.xxx` 占位用法。
