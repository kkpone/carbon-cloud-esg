# Carbon Agent 验证

目标分支 `feat-carbonAI`；对话协议参考 `feat-agent-group`，不合并独立 Agent 业务
页面。运行命令均在前端仓库根目录。

- 协议测试：`node --test tests/carbon-agent/protocol.test.cjs`
- 本地组件回归
  ：`./node_modules/.bin/rsbuild dev --config tests/carbon-agent/rsbuild.fixture.ts`，
  打开 `http://127.0.0.1:3191`，点击“运行交互回归”。
- 移动端：同一测试服务打开 `/?mobilePreview`，在 390px iframe 中运行回归。页面是
  独立测试入口，不进入应用路由或发布构建。
- 构建：`./node_modules/.bin/rsbuild build --env-mode development`

测试页使用真实 React Provider、助手、输入框、表单和消息组件；只替换登录依赖与
fetch，全部为合成数据，未连接真实后端。覆盖普通打开不发送、断线数字游标恢复且
POST 一次、切换保留草稿、关闭不取消、重复提交、停止旧订阅、私有模型禁止替代会话
、无席位仍保留管理资格、切换组织清理状态。表单提交后展开“最近发送请求”可核对原
resumeRequest、数组、0 和 false，历史操作应变为禁用。

协议测试还覆盖 UTF-8/CRLF 跨分片、多行 SSE、截断流、工具重放顺序与隐藏事件
、cards/blocks 去重、最终正文校正、历史工具归属、表单默认值、必填行、恢复模板污
染路径保护、20 MB 上传限制、业务 403 不退出及身份切换时丢弃响应。

## 2026-10-23 真实后端联调

本地前端通过开发代理连接 `https://gateway-base-test.carbonstop.com`，不是模拟接
口。

- 列表提交、建模确认、结果卡和当前标签页跳转已验证。测试模型为
  `accountId=10701`、`productId=6705`，名称 `联调测试-20261023-500ml矿泉水`，包
  含 6 个排放源。
- 建模会话 `agent_1534bbffd6804437a32803c53e2abc7d` 在任务执行时刷新后通过
  trace/recover/stream 接续，未重新 POST 原消息。
- 主动切断一次真实聊天 SSE 后，同一消息 `msg_0778a8245d7642bca9f68ba7b069a0cc`
  自动请求 recover，再以 `afterStreamEventId=1235108` 订阅并完成；该轮只有一次消
  息 POST。此项通过本地代理断开前端连接验证，不代表移动设备断网已验收。
- 模型关联接续仍阻塞：重新登录后，
  `GET /footprint3/agent/carbon/models/10701/conversation` 返回 HTTP 200、业务码
  500、`AGENT_SESSION_CHANNEL_FORBIDDEN`。前端登录提交已有
  `clientType=CARBON_WEB`；需核查测试环境部署版本及服务端登录态中的
  clientType/companyType。前端未绕过渠道或私有会话校验。
- 实际因子检索曾返回内层 `mcp_tool_error: agent session auth failed`，而外层是
  tool_call_success；前端现按内层业务失败显示，并合并历史工具 start/end。服务端
  工具鉴权故障仍需核查；模型成功来自后续补齐因子后的再次确认。
- 建模确认卡改为产品、功能单位、排放源和因子摘要，按需展开；保留原始
  resumeRequest。参考 `feat-agent-group` 紧凑卡片样式。
- 协议测试 13 项、真实 React 合成接口交互回归 10 项通过，development 构建通过。
  交互回归新增完成模型恢复为 model_update，以及关联失败后重新查询原模型的用例；
  合成接口通过不能代替上述受阻的真实模型关联验收。

真实环境发布前仍需验证：

1. CARBON_WEB 登录态、已部署的 Agent 接口与持久化表/配置。
2. 列表和产品详情建模，目标会话上传，服务端读取产品及 LCA 信息。
3. 解决上述渠道校验阻塞后，验证模型关联返回原私有会话及再次对话。
4. 通用助手 handoff、模型空/非空技能、任务取消、刷新恢复、过期/额度/积分及跨组织
   权限。
5. 真实模板与快速/过程核算保存、旧批量解析建模及管理 SSO 一次性票据。
6. 移动设备软键盘、浏览器断网及反向代理下的长 SSE 连接。

仓库全量 TypeScript 检查存在既有错误（缺失 SDK 导出、依赖类型及业务页面类型等）
；须区分新增文件诊断与既有错误。`npm test` 为构建，不替代以上测试。
