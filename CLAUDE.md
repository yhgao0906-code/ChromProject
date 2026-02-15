# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

宇航工具箱 (Yuhang Toolbox) is a Chrome browser extension (Manifest V3) that provides AI-powered utilities including JSON conversion, translation, text summarization, and Markdown-to-Word conversion. All AI features are powered by DeepSeek/讯飞星火 LLM APIs.

## Build & Package

```bash
# Package the extension for distribution
./pack.sh
```

This creates a versioned zip file (e.g., `yuhang-toolbox-v1.8.0.zip`) containing all required files. Version is extracted from `manifest.json`.

## Development

### Loading the Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder

### Testing Changes
- Reload the extension in `chrome://extensions/` after modifying `background.js` or `manifest.json`
- For `sidepanel.js`, `content.js`, or UI changes, close and reopen the side panel
- API changes in `api-service.js` require side panel refresh

## Architecture

### Core Files
- **manifest.json** - Extension configuration (Manifest V3), permissions, and entry points
- **background.js** - Service worker handling: side panel management, context menus, proxy/interception rules, persistent state via chrome.storage
- **sidepanel.html/js** - Main UI rendered in Chrome's side panel
- **content.js** - Injected into web pages; handles text selection and form data filling
- **api-service.js** - `DeepSeekAPI` class managing LLM API calls (DeepSeek V3, 讯飞星火), model configuration, streaming responses
- **styles.css** - Space-themed UI styling

### Communication Flow
1. User interacts with side panel UI (`sidepanel.js`)
2. Side panel sends messages to background script via `chrome.runtime.sendMessage`
3. For page content operations, background script relays to content script
4. API calls are made directly from `api-service.js` (instantiated in side panel)

### Key Permissions
- `sidePanel` - Side panel display
- `webRequest`, `proxy`, `declarativeNetRequest` - URL interception and proxy features
- `storage` - Persistent settings and state
- `contextMenus` - Right-click menu integration

### Third-Party Libraries (lib/)
- `docx.min.js` - Word document generation
- `marked.min.js` - Markdown parsing
- `xlsx.full.min.js` - Excel file handling
- `chart.min.js` - Chart rendering
- `FileSaver.min.js` - File download helper

### Vue Components (vue/)
Contains Vue.js components for specific features, loaded dynamically when needed.

## API Configuration

The extension supports multiple LLM providers:
- DeepSeek V3 (default): `https://maas-api.cn-huabei-1.xf-yun.com/v1`
- 讯飞星火轻量: Same base URL, different model ID

API keys and model configs are stored in `chrome.storage.local` under `modelConfigs`.
