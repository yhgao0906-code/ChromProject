# Research: 页面总结发送飞书

**Phase 0 Output** | **Date**: 2026-02-15

## Research Summary

No NEEDS CLARIFICATION items in Technical Context. All technology choices are predetermined by the existing project (user requirement: "技术栈和原项目保持一致"). Research focused on integration patterns and best practices.

---

## R1: 飞书自定义机器人 Webhook API

**Decision**: 使用飞书自定义机器人 Webhook 发送 interactive 卡片消息

**Rationale**: Chrome 扩展运行在浏览器环境，无法使用 Lark MCP。Webhook 是最简单的集成方式，仅需 HTTP POST，无需 OAuth 认证流程。用户明确要求与每日代码评审 skill 的机器人配置相同，该 skill 的备选方案即为 Webhook。

**Alternatives considered**:
- Lark Open API (需要 app_id/app_secret 认证，增加复杂度，违反 YAGNI 原则)
- Lark MCP (Chrome 扩展无法使用 MCP 协议)

**Key findings**:
- Webhook endpoint: `POST https://open.feishu.cn/open-apis/bot/v2/hook/{token}`
- Content-Type: `application/json`
- 消息类型: `msg_type: "interactive"`，`card` 字段包含 raw card JSON
- 卡片 JSON 结构: `{ config, header, elements }`，不使用 template_id 格式
- 飞书卡片 Markdown 不支持表格语法 `| col |`，使用行内文本
- 成功响应: `{ "StatusCode": 0, "StatusMessage": "success" }`
- 错误响应: StatusCode 非 0，StatusMessage 包含错误描述
- 频率限制: 每分钟约 100 条消息（单机器人），对单用户扩展不构成问题

---

## R2: 页面内容提取机制

**Decision**: 复用现有 content.js 中的 `processGetPageContent()` 函数

**Rationale**: 该函数已实现智能内容提取（优先 article > main > #content > body 减去导航/页脚），并限制 50000 字符。sidepanel.js 中的总结功能已有调用该机制的完整流程。

**Alternatives considered**:
- 新建独立的内容提取函数（重复代码，违反 DRY 原则）
- 使用 Readability.js 库（引入新依赖，违反 YAGNI 原则）

**Key findings**:
- 现有流程: sidepanel → `chrome.tabs.sendMessage(tabId, {action: 'get_page_content'})` → content.js 提取 → `chrome.runtime.sendMessage({action: 'summarize', selectedText, isFullPage: true})` → background → sidepanel
- 提取优先级: `article` > `main` > `#content, .content, [role="main"]` > `body`（排除 nav/header/footer）
- 已有 50000 字符截断
- 返回格式: `标题：${pageTitle}\n\n${mainContent}`

---

## R3: AI 总结适配

**Decision**: 复用现有 `DeepSeekAPI.summarizeText()` 方法，不创建新方法

**Rationale**: 现有 `summarizeText()` 已处理多模型适配（DeepSeek/Spark），输出格式（结构化要点）适合作为飞书卡片内容。无需为飞书场景创建独立的总结方法。

**Alternatives considered**:
- 创建 `summarizeForLark()` 专用方法（过度工程化，总结结果差异不大）
- 修改现有提示词（会影响已有总结功能）

**Key findings**:
- `summarizeText()` 返回 `{ content, executionTime }`
- 输出为结构化中文摘要，使用段落和要点列表
- 温度 0.3，max_tokens 2000
- 该输出可直接嵌入飞书卡片的 markdown 元素中

---

## R4: Webhook URL 验证与存储

**Decision**: Webhook URL 存储在 `chrome.storage.local` 的 `larkWebhookUrl` 键下，使用正则验证格式

**Rationale**: 与现有 API Key 存储方式一致（`chrome.storage.local`），简单直接。正则验证确保用户输入的是有效的飞书 Webhook URL 格式。

**Alternatives considered**:
- 存储在 modelConfigs 对象中（语义不匹配，Webhook 非模型配置）
- 不做格式验证（用户体验差，难以发现错误配置）

**Key findings**:
- 验证正则: `/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[a-zA-Z0-9-]+$/`
- 存储键: `larkWebhookUrl`
- 在设置面板中增加飞书 Webhook 配置项（输入框 + 保存逻辑集成到现有保存按钮）
