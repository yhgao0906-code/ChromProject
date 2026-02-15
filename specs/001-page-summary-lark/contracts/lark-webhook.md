# API Contract: 飞书 Webhook 卡片消息

**Phase 1 Output** | **Date**: 2026-02-15

## Endpoint

```
POST https://open.feishu.cn/open-apis/bot/v2/hook/{webhook_token}
```

## Request

### Headers

| Header | Value |
|--------|-------|
| Content-Type | `application/json` |

### Body

```json
{
  "msg_type": "interactive",
  "card": {
    "config": {
      "wide_screen_mode": true
    },
    "header": {
      "title": {
        "tag": "plain_text",
        "content": "📄 页面总结分享"
      },
      "template": "blue"
    },
    "elements": [
      {
        "tag": "markdown",
        "content": "**页面标题**: Example Page Title\n\n---\n\nAI 生成的摘要内容...\n\n要点1\n要点2"
      },
      {
        "tag": "action",
        "actions": [
          {
            "tag": "button",
            "text": {
              "tag": "plain_text",
              "content": "查看原文"
            },
            "type": "primary",
            "url": "https://example.com/page"
          }
        ]
      }
    ]
  }
}
```

### Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| msg_type | string | Yes | 固定值 `"interactive"` |
| card | object | Yes | 卡片消息内容 |
| card.config | object | Yes | 卡片配置 |
| card.config.wide_screen_mode | boolean | Yes | 固定 `true`，宽屏模式 |
| card.header | object | Yes | 卡片头部 |
| card.header.title | object | Yes | 标题对象 |
| card.header.title.tag | string | Yes | 固定 `"plain_text"` |
| card.header.title.content | string | Yes | 卡片标题文本 |
| card.header.template | string | Yes | 主题色，使用 `"blue"` |
| card.elements | array | Yes | 卡片内容元素数组 |

### Card Elements

**Element 1: Markdown 内容**

```json
{
  "tag": "markdown",
  "content": "**页面标题**: {pageTitle}\n\n---\n\n{summaryContent}"
}
```

- `{pageTitle}`: 从 `document.title` 获取
- `{summaryContent}`: 从 `DeepSeekAPI.summarizeText()` 返回的 `content` 字段
- Markdown 限制: 不支持表格语法 `| col |`，使用换行和列表格式

**Element 2: Action 按钮**

```json
{
  "tag": "action",
  "actions": [{
    "tag": "button",
    "text": { "tag": "plain_text", "content": "查看原文" },
    "type": "primary",
    "url": "{pageUrl}"
  }]
}
```

- `{pageUrl}`: 从 `chrome.tabs.query` 获取当前标签页 URL

## Response

### Success (StatusCode 0)

```json
{
  "StatusCode": 0,
  "StatusMessage": "success",
  "code": 0,
  "data": {},
  "msg": "success"
}
```

### Error

```json
{
  "StatusCode": 19001,
  "StatusMessage": "param invalid: incoming webhook access token invalid",
  "code": 19001,
  "data": {},
  "msg": "param invalid: incoming webhook access token invalid"
}
```

### Common Error Codes

| StatusCode | StatusMessage | 用户提示 |
|------------|---------------|---------|
| 19001 | incoming webhook access token invalid | Webhook 地址无效，请检查配置 |
| 19002 | incoming webhook not allowed | 该机器人不允许 Webhook 调用 |
| 19021 | request too frequent | 发送太频繁，请稍后再试 |
| 9499 | system busy | 飞书服务繁忙，请稍后重试 |
| Network Error | fetch 抛出异常 | 网络错误，请检查网络连接 |

## Integration Notes

- **CORS**: Chrome 扩展的 side panel 页面可以通过 fetch 直接请求外部 URL（受 host_permissions 控制）。`<all_urls>` 已在 manifest.json 中声明，无需额外配置。
- **禁止使用 template_id 格式**: `{"type":"template","data":{"template_id":"xxx"}}` 会导致发送失败。必须使用 raw card JSON（直接包含 config/header/elements）。
- **禁止使用 post 富文本格式**: 不会以卡片形式渲染。
