# Implementation Plan: 页面总结发送飞书

**Branch**: `001-page-summary-lark` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-page-summary-lark/spec.md`

## Summary

在宇航工具箱 Chrome 扩展中添加"飞书分享"功能标签页，实现一键提取当前页面内容、调用 AI 生成摘要总结、并通过飞书自定义机器人 Webhook 发送卡片消息到群聊。技术栈与原项目保持一致：Vanilla JS、Chrome Manifest V3、DeepSeekAPI 类复用。

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), Chrome Manifest V3
**Primary Dependencies**: Chrome Extensions API (sidePanel, tabs, storage, runtime), DeepSeekAPI (api-service.js), 飞书 Webhook API
**Storage**: `chrome.storage.local` (Webhook URL 配置持久化)
**Testing**: 手动浏览器验证（与原项目一致，无自动化测试框架）
**Target Platform**: Chrome 浏览器扩展 (Manifest V3)
**Project Type**: Chrome Extension (single project, no build step)
**Performance Goals**: 整个流程（提取→总结→发送）30 秒内完成（普通页面）
**Constraints**: CSP 限制 `'self'` + `'wasm-unsafe-eval'`；无内联脚本；service worker 非持久化
**Scale/Scope**: 单用户浏览器扩展，单 Webhook 配置

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Manifest V3 Compliance | PASS | Webhook POST 通过 fetch 发送，`open.feishu.cn` 已被 `<all_urls>` host_permissions 覆盖。无新权限需求。 |
| II. API Key Security | PASS | Webhook URL 存储在 `chrome.storage.local`，与 API Key 存储方式一致。不引入新的凭据存储机制。AI 调用复用 DeepSeekAPI。 |
| III. User Privacy | PASS | 页面内容仅用于即时 AI 总结请求，不额外持久化。发送到飞书是用户主动触发的操作。 |
| IV. Separation of Concerns | PASS | UI 逻辑在 sidepanel.js/html，页面内容提取复用 content.js，AI 调用复用 api-service.js，Webhook 发送逻辑在 sidepanel.js 中（直接 fetch 调用，属于 UI 交互逻辑的一部分）。 |
| V. Simplicity & YAGNI | PASS | 一键流程，无预览/编辑步骤。不引入新的第三方库。不添加投机性功能（如多 Webhook、发送历史等）。 |

**Gate Result**: ALL PASS — 无需 Complexity Tracking 条目。

## Project Structure

### Documentation (this feature)

```text
specs/001-page-summary-lark/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── lark-webhook.md  # Webhook API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Existing files to modify (no new files needed)
sidepanel.html           # Add "飞书分享" tab button + tab content section; settings panel add Webhook input
sidepanel.js             # Add lark-share button handler, Webhook POST, settings save/load for Webhook URL
styles.css               # Add styles for lark-share tab elements (if needed, follow existing patterns)
manifest.json            # Version bump only (host_permissions already cover feishu.cn via <all_urls>)
```

**Structure Decision**: No new files needed. All changes integrate into existing files following the extension's established patterns (Principle IV: Separation of Concerns). The Webhook HTTP POST is handled directly in `sidepanel.js` as it is a UI-triggered action, consistent with how other direct API calls (like DeepSeekAPI) are made from the side panel.

## Constitution Re-Check (Post Phase 1 Design)

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Manifest V3 Compliance | PASS | 不新增权限，不修改 CSP。Webhook fetch 从 side panel 页面发起，受 host_permissions 保护。 |
| II. API Key Security | PASS | Webhook URL 存储在 `chrome.storage.local` 键 `larkWebhookUrl`，与现有 `modelConfigs` 存储方式一致。AI 调用复用 DeepSeekAPI，不引入新凭据机制。 |
| III. User Privacy | PASS | 页面内容仅用于当次 AI 请求，不持久化。发送到飞书是用户主动点击触发。 |
| IV. Separation of Concerns | PASS | 不新增文件。HTML 增加 UI 结构，JS 增加事件处理逻辑，复用 content.js 的页面提取和 api-service.js 的 AI 调用。 |
| V. Simplicity & YAGNI | PASS | 无新依赖，无投机性功能，一键流程。复用现有 `summarizeText()` 方法，不创建新的总结函数。 |

**Post-Design Gate Result**: ALL PASS

## Complexity Tracking

> No violations. All five constitution principles are satisfied without deviation.
