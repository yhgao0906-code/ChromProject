# Quickstart: 页面总结发送飞书

**Phase 1 Output** | **Date**: 2026-02-15

## Prerequisites

1. Chrome 浏览器，已启用 Developer Mode
2. 宇航工具箱扩展已加载（Load unpacked）
3. 至少一个 AI 模型的 API Key 已配置（DeepSeek 或讯飞星火）
4. 飞书群聊自定义机器人已创建，并获取了 Webhook 地址

## Setup

### 1. 配置飞书 Webhook

1. 打开宇航工具箱侧边栏
2. 点击设置按钮（齿轮图标）
3. 在"飞书 Webhook 地址"输入框中粘贴 Webhook URL
   - 格式: `https://open.feishu.cn/open-apis/bot/v2/hook/{your-token}`
4. 点击"保存"

### 2. 使用功能

1. 打开任意网页
2. 打开宇航工具箱侧边栏
3. 切换到"飞书分享"标签页
4. 点击"总结并发送"按钮
5. 等待操作完成（通常 10-20 秒）
6. 查看飞书群聊确认消息已送达

## Verification Checklist

- [ ] 设置面板中可以输入和保存飞书 Webhook URL
- [ ] 重新打开侧边栏后 Webhook URL 仍然保留
- [ ] 输入无效 URL 时显示格式错误提示
- [ ] 未配置 Webhook 时点击按钮提示先配置
- [ ] 普通网页点击"总结并发送"后，飞书群聊收到卡片消息
- [ ] 卡片消息包含页面标题、摘要内容、"查看原文"按钮
- [ ] 点击"查看原文"按钮可以跳转到原始页面
- [ ] 空白页面或纯图片页面提示"无可总结内容"
- [ ] 网络断开时显示网络错误提示
- [ ] 操作过程中显示加载状态，可以取消操作

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "请先配置飞书 Webhook 地址" | 在设置面板中配置有效的 Webhook URL |
| "Webhook 地址无效" | 确认 URL 格式为 `https://open.feishu.cn/open-apis/bot/v2/hook/...` |
| "当前页面无可总结的文本内容" | 页面可能是空白页或纯图片页面 |
| "AI 总结失败" | 检查 AI 模型 API Key 是否有效 |
| "发送失败：网络错误" | 检查网络连接 |
| 卡片消息未出现在群聊中 | 确认机器人未被群管理员禁用，Webhook 未失效 |

## Development Notes

### 修改文件列表

| File | Changes |
|------|---------|
| `sidepanel.html` | 添加"飞书分享"标签按钮和内容区域；设置面板添加 Webhook 输入框 |
| `sidepanel.js` | 添加飞书分享按钮事件处理、Webhook 配置保存/加载、卡片消息构建和发送逻辑 |
| `styles.css` | 新标签页元素样式（如有需要） |
| `manifest.json` | 版本号递增 |

### 测试方法

手动浏览器验证（与原项目一致）：
1. 修改代码后，在 `chrome://extensions/` 重新加载扩展
2. 关闭并重新打开侧边栏
3. 按上述验证清单逐项测试
