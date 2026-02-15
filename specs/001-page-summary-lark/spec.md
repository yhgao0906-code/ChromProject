# Feature Specification: 页面总结发送飞书

**Feature Branch**: `001-page-summary-lark`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "总结页面的内容并通过机器人发送飞书消息到群聊中,飞书机器人的配置和每日代码评审skill中的机器人配置相同"

## Clarifications

### Session 2026-02-15

- Q: 功能交互流程应采用哪种模式？（A: 两个按钮并存; B: 统一两步流程含预览/编辑; C: 仅一键流程,无预览/编辑） → A: C — 仅一键流程,点击"总结并发送"直接完成全部操作,不提供预览/编辑步骤

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 一键总结当前页面并发送到飞书群 (Priority: P1)

用户在浏览网页时,打开宇航工具箱侧边栏,切换到"飞书分享"功能标签页。点击"总结并发送"按钮后,系统自动提取当前页面的文本内容,调用 AI 生成摘要总结,然后将总结内容以飞书卡片消息的形式发送到预配置的飞书群聊中。整个过程为一键操作,无需用户预览或编辑总结内容。

**Why this priority**: 这是核心功能,实现了从页面内容到飞书群聊的完整链路,提供了最直接的用户价值。

**Independent Test**: 可通过打开任意网页、点击"总结并发送"按钮,验证飞书群聊中是否收到包含页面摘要的卡片消息。

**Acceptance Scenarios**:

1. **Given** 用户已配置飞书 Webhook 地址且当前页面有文本内容, **When** 用户点击"总结并发送"按钮, **Then** 系统提取页面内容、生成 AI 总结、通过飞书 Webhook 发送卡片消息到群聊,并显示"发送成功"提示
2. **Given** 用户已配置飞书 Webhook 地址且当前页面有文本内容, **When** 系统成功发送消息, **Then** 飞书群聊中显示包含页面标题、摘要内容和原文链接的卡片消息
3. **Given** 用户未配置飞书 Webhook 地址, **When** 用户点击"总结并发送"按钮, **Then** 系统提示用户先在设置中配置 Webhook 地址

---

### User Story 2 - 配置飞书 Webhook 地址 (Priority: P1)

用户首次使用该功能时,需要在扩展设置中配置飞书群聊机器人的 Webhook 地址。配置完成后,该地址被持久化保存,后续使用无需重复配置。

**Why this priority**: 这是使用该功能的前置条件,没有正确的 Webhook 配置,核心功能无法运行。

**Independent Test**: 可通过在设置面板中输入 Webhook 地址、保存后重新打开侧边栏,验证配置是否持久化保存。

**Acceptance Scenarios**:

1. **Given** 用户打开扩展设置面板, **When** 用户在飞书 Webhook 配置项中输入有效的 Webhook URL 并保存, **Then** 系统持久化保存该配置
2. **Given** 用户已保存 Webhook 配置, **When** 用户关闭并重新打开侧边栏, **Then** 已保存的 Webhook 地址仍然存在
3. **Given** 用户输入格式无效的 Webhook URL, **When** 用户尝试保存, **Then** 系统提示 URL 格式不正确

---

### Edge Cases

- 当页面内容为空或极少（如空白页、纯图片页面）时,系统应提示"当前页面无可总结的文本内容"
- 当页面内容超长（如长篇文章）时,系统应截断到合理长度后再调用 AI 总结,避免超出模型 token 限制
- 当飞书 Webhook 请求失败（网络错误、Webhook 地址失效等）时,系统应显示明确的错误信息并允许用户重试
- 当 AI 总结调用失败时,系统应显示错误提示,不发送空消息到飞书
- 当用户在总结或发送过程中切换了浏览器标签页,操作应基于发起时的页面内容继续完成

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须能够提取当前活动标签页的页面文本内容（标题和正文）
- **FR-002**: 系统必须使用已配置的 AI 模型对页面内容生成中文摘要总结
- **FR-003**: 系统必须通过飞书自定义机器人 Webhook 将总结内容发送到群聊
- **FR-004**: 发送的飞书消息必须使用卡片消息格式（interactive 类型），包含页面标题、摘要内容和原文链接
- **FR-005**: 系统必须在扩展设置中提供飞书 Webhook 地址的配置入口
- **FR-006**: Webhook 地址配置必须持久化保存在扩展本地存储中
- **FR-007**: 系统必须对 Webhook URL 进行基本格式验证（须匹配飞书 Webhook URL 格式）
- **FR-008**: 系统必须在侧边栏中提供独立的功能标签页用于该功能
- **FR-009**: 系统必须在总结和发送过程中显示加载状态,并支持取消操作
- **FR-010**: 系统必须在发送成功或失败后给予用户明确的状态反馈
- **FR-011**: 当页面内容过长时,系统必须自动截断到模型可处理的合理长度
- **FR-012**: 整个流程为一键操作（点击"总结并发送"），系统自动完成提取、总结、发送全部步骤,无需用户中间干预

### Key Entities

- **页面内容（Page Content）**: 从当前标签页提取的信息,包含页面标题（title）、页面 URL、正文文本内容
- **页面总结（Page Summary）**: AI 生成的摘要文本,作为飞书消息的主体内容
- **飞书卡片消息（Lark Card Message）**: 发送到飞书群聊的结构化消息,包含标题、摘要、原文链接按钮
- **Webhook 配置（Webhook Config）**: 用户配置的飞书自定义机器人 Webhook 地址,持久化存储

## Assumptions

- 飞书群聊机器人已由管理员创建并获取了 Webhook 地址,用户只需在扩展中配置该地址
- 使用飞书自定义机器人 Webhook 方式发送消息（HTTP POST），而非 Lark MCP 或 Lark Open API（因为 Chrome 扩展无法使用 MCP 工具）
- Webhook URL 格式为 `https://open.feishu.cn/open-apis/bot/v2/hook/{token}`
- 飞书卡片消息格式与每日代码评审 skill 中使用的卡片格式一致：raw card JSON（含 config、header、elements），不使用 template ID 格式
- 页面内容提取复用现有 content.js 中的 `get_page_content` 消息机制
- AI 总结复用现有 DeepSeekAPI 的能力,使用当前选中的模型
- 飞书卡片消息中的 Markdown 不支持表格语法,使用行内文本格式

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户从点击"总结并发送"到飞书群聊收到消息,整个流程在 30 秒内完成（普通长度页面）
- **SC-002**: 发送到飞书的卡片消息正确包含页面标题、摘要内容和可点击的原文链接
- **SC-003**: Webhook 配置在扩展更新或浏览器重启后仍然保留
- **SC-004**: 当发送失败时,用户能看到具体错误原因并可以重试
