# Data Model: 页面总结发送飞书

**Phase 1 Output** | **Date**: 2026-02-15

## Entities

### 1. Page Content (运行时对象，不持久化)

从当前标签页提取的页面信息。

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| pageTitle | string | 页面标题 | `document.title` |
| pageUrl | string | 页面 URL | `window.location.href` (从 `chrome.tabs.query` 获取) |
| bodyText | string | 页面正文内容 (已截断) | `processGetPageContent()` in content.js |

**Validation**:
- `bodyText` 不为空且长度 > 50 字符（否则视为无可总结内容）
- `bodyText` 最大 50000 字符（content.js 已处理截断）

**Lifecycle**: 提取后仅在当前操作中使用，操作完成后丢弃。不持久化。

---

### 2. Page Summary (运行时对象，不持久化)

AI 生成的页面摘要。

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| content | string | AI 生成的中文摘要文本 | `DeepSeekAPI.summarizeText()` |
| executionTime | number | AI 调用耗时(ms) | `DeepSeekAPI.summarizeText()` |

**Lifecycle**: AI 调用返回后使用，构建卡片消息后丢弃。不持久化。

---

### 3. Lark Card Message (运行时对象，不持久化)

发送到飞书的卡片消息结构。

| Field | Type | Description |
|-------|------|-------------|
| msg_type | string (const) | 固定值 `"interactive"` |
| card.config | object | `{ wide_screen_mode: true }` |
| card.header | object | 包含标题和模板颜色 |
| card.header.title | object | `{ tag: "plain_text", content: "📄 页面总结分享" }` |
| card.header.template | string | `"blue"` |
| card.elements | array | 包含摘要内容和原文链接按钮 |

**Card Elements 结构**:

```json
[
  {
    "tag": "markdown",
    "content": "**页面标题**: {pageTitle}\n\n---\n\n{summaryContent}"
  },
  {
    "tag": "action",
    "actions": [
      {
        "tag": "button",
        "text": { "tag": "plain_text", "content": "查看原文" },
        "type": "primary",
        "url": "{pageUrl}"
      }
    ]
  }
]
```

**Lifecycle**: 构建后通过 Webhook POST 发送，发送后丢弃。

---

### 4. Webhook Config (持久化配置)

用户配置的飞书 Webhook 地址。

| Field | Type | Description | Storage Key |
|-------|------|-------------|-------------|
| webhookUrl | string | 飞书自定义机器人 Webhook URL | `larkWebhookUrl` |

**Validation**:
- 必须匹配正则: `/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\/[a-zA-Z0-9-]+$/`
- 不得为空

**Storage**: `chrome.storage.local.set({ larkWebhookUrl: url })`

**Lifecycle**: 用户配置后持久化，跨会话保留。用户可在设置面板中修改。

---

## State Transitions

```text
[Idle]
  → 用户点击"总结并发送"
  → 检查 Webhook 配置 → 未配置 → [Error: 提示配置]
  → 已配置 → [Loading: 正在提取页面内容...]
  → 提取成功 → [Loading: 正在生成总结...]
    → 提取失败/内容为空 → [Error: 无可总结内容]
  → 总结成功 → [Loading: 正在发送到飞书...]
    → 总结失败 → [Error: AI 总结失败]
  → 发送成功 → [Success: 发送成功] → 3s 后 → [Idle]
    → 发送失败 → [Error: Webhook 错误信息，允许重试]
```

## Relationships

```text
Page Content ──(input)──→ DeepSeekAPI.summarizeText() ──(output)──→ Page Summary
Page Summary + Page Content.pageTitle + Page Content.pageUrl ──(compose)──→ Lark Card Message
Lark Card Message ──(POST)──→ Webhook Config.webhookUrl
```
