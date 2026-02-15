/**
 * 宇航工具箱 - 后台服务脚本
 * @description 处理Chrome侧边栏展示和上下文菜单，支持持久化状态管理
 */

// ==================== 持久化状态管理 ====================

// 全局状态存储
let persistentState = {
  isInitialized: false,
  lastActiveTime: Date.now(),
  sessionData: {},
  userSettings: {},
  operationHistory: []
};

// 保持后台脚本活跃的心跳机制
function keepAlive() {
  // 创建一个定时器来保持service worker活跃
  chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
}

// 监听定时器事件
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    persistentState.lastActiveTime = Date.now();
    console.log('Background script keepAlive:', new Date().toISOString());
    
    // 定期清理过期数据
    cleanupExpiredData();
  }
});

// 清理过期数据
function cleanupExpiredData() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24小时
  
  // 清理过期的操作历史
  persistentState.operationHistory = persistentState.operationHistory.filter(
    item => (now - item.timestamp) < maxAge
  );
  
  // 保存清理后的状态
  savePersistentState();
}

// 保存持久化状态到存储
function savePersistentState() {
  chrome.storage.local.set({ 
    persistentState: persistentState 
  }).catch(error => {
    console.error('Failed to save persistent state:', error);
  });
}

// 加载持久化状态
function loadPersistentState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['persistentState'], (result) => {
      if (result.persistentState) {
        persistentState = { ...persistentState, ...result.persistentState };
        console.log('Loaded persistent state:', persistentState);
      }
      persistentState.isInitialized = true;
      persistentState.lastActiveTime = Date.now();
      resolve(persistentState);
    });
  });
}

// 记录操作历史
function recordOperation(operation, data = {}) {
  const record = {
    timestamp: Date.now(),
    operation: operation,
    data: data
  };
  
  persistentState.operationHistory.push(record);
  
  // 限制历史记录数量
  if (persistentState.operationHistory.length > 100) {
    persistentState.operationHistory = persistentState.operationHistory.slice(-50);
  }
  
  savePersistentState();
}

// 获取会话数据
function getSessionData(key) {
  return persistentState.sessionData[key];
}

// 设置会话数据
function setSessionData(key, value) {
  persistentState.sessionData[key] = value;
  savePersistentState();
}

// ==================== 持久化状态管理结束 ====================

// ==================== 版本采集功能 ====================

/**
 * 查找或打开一个 DevOps 标签页，用于在其上下文中执行 fetch（携带 Cookie）
 * @param {string} projectId - 项目ID
 * @returns {Promise<number>} 标签页ID
 */
async function getOrCreateDevOpsTab(projectId) {
  // 先查找已有的 DevOps 标签页
  const tabs = await chrome.tabs.query({});
  const existingTab = tabs.find(tab =>
    tab.url && tab.url.includes('console.devops.iflytek.com')
  );

  if (existingTab) {
    console.log('找到已有的 DevOps 标签页:', existingTab.id);
    return existingTab.id;
  }

  // 没有打开的 DevOps 页面，创建一个新的
  console.log('没有找到 DevOps 标签页，正在创建...');
  const newTab = await chrome.tabs.create({
    url: `http://console.devops.iflytek.com/ipipeline/application?projectId=${projectId}`,
    active: false  // 在后台打开
  });

  // 等待页面加载完成
  await new Promise((resolve) => {
    const listener = (tabId, changeInfo) => {
      if (tabId === newTab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // 超时保护
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });

  return newTab.id;
}

/**
 * 在 DevOps 标签页上下文中执行 fetch 获取构建历史
 * 这样可以携带用户的登录 Cookie
 * @param {number} tabId - 标签页ID
 * @param {string} projectId - 项目ID
 * @param {string} appId - 应用ID
 * @param {string} branchName - 分支名称
 * @param {string} serviceName - 服务名称
 * @returns {Promise} 版本信息
 */
async function fetchBuildHistoryViaTab(tabId, projectId, appId, branchName, serviceName) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async (projectId, appId, branchName, serviceName) => {
        // 此函数在 DevOps 标签页的上下文中执行，自动携带 Cookie
        const baseUrl = window.location.origin || 'http://console.devops.iflytek.com';

        // 尝试多种可能的 API 端点
        const apiEndpoints = [
          `/api/ipipeline/build/history?projectId=${projectId}&appId=${appId}&pageNum=1&pageSize=50`,
          `/api/ipipeline/app/${appId}/builds?projectId=${projectId}&page=1&size=50`,
          `/api/v1/ipipeline/builds?projectId=${projectId}&appId=${appId}&pageNum=1&pageSize=50`,
          `/ipipeline/api/build/list?projectId=${projectId}&appId=${appId}&pageNum=1&pageSize=50`,
          `/api/build/history?projectId=${projectId}&appId=${appId}&page=1&pageSize=50`,
          `/api/ipipeline/bulidhistory?projectId=${projectId}&appId=${appId}&pageNum=1&pageSize=50`
        ];

        // 先尝试拦截方式：打开构建历史页面的 iframe 来触发 API 请求
        // 但更简单的方式是直接尝试 API

        for (const endpoint of apiEndpoints) {
          try {
            console.log(`[版本采集] 尝试 API: ${baseUrl}${endpoint}`);
            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json, text/plain, */*'
              }
            });

            if (!response.ok) {
              console.log(`[版本采集] ${endpoint} 返回状态: ${response.status}`);
              continue;
            }

            const text = await response.text();
            let data;
            try {
              data = JSON.parse(text);
            } catch (e) {
              console.log(`[版本采集] ${endpoint} 返回非 JSON`);
              continue;
            }

            console.log(`[版本采集] API 响应:`, data);

            // 尝试从不同的数据结构中获取构建列表
            let builds = null;
            if (data && data.data && Array.isArray(data.data.list)) {
              builds = data.data.list;
            } else if (data && data.data && Array.isArray(data.data.records)) {
              builds = data.data.records;
            } else if (data && Array.isArray(data.data)) {
              builds = data.data;
            } else if (data && Array.isArray(data.list)) {
              builds = data.list;
            } else if (Array.isArray(data)) {
              builds = data;
            }

            if (builds && builds.length > 0) {
              // 查找匹配分支的构建记录（优先找构建成功的）
              const matchingBuild = builds.find(build => {
                const buildBranch = build.branch || build.branchName || build.gitBranch || '';
                const buildStatus = (build.status || build.buildStatus || '').toString();
                const branchMatch = buildBranch.includes(branchName) || branchName.includes(buildBranch);
                const isSuccess = ['成功', 'success', 'SUCCESS', 'SUCCEEDED'].includes(buildStatus) || build.success === true;
                return branchMatch && isSuccess;
              });

              const anyMatchingBuild = matchingBuild || builds.find(build => {
                const buildBranch = build.branch || build.branchName || build.gitBranch || '';
                return buildBranch.includes(branchName) || branchName.includes(buildBranch);
              });

              if (anyMatchingBuild) {
                return {
                  serviceName, appId, status: 'success',
                  version: anyMatchingBuild.version || anyMatchingBuild.buildVersion || anyMatchingBuild.versionNo || anyMatchingBuild.buildNo,
                  branch: anyMatchingBuild.branch || anyMatchingBuild.branchName || anyMatchingBuild.gitBranch,
                  buildTime: anyMatchingBuild.startTime || anyMatchingBuild.createTime || anyMatchingBuild.buildTime
                };
              } else {
                return { serviceName, appId, status: 'no-record', version: null, branch: branchName };
              }
            }
          } catch (error) {
            console.log(`[版本采集] ${endpoint} 出错:`, error.message);
            continue;
          }
        }

        // API 都失败了，尝试打开构建历史页面并从 DOM 读取
        try {
          console.log('[版本采集] API 方式失败，尝试打开页面并读取 DOM...');
          // 创建一个隐藏的 iframe 来加载构建历史页面
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = `${baseUrl}/ipipeline/bulidhistory?projectId=${projectId}&appId=${appId}`;
          document.body.appendChild(iframe);

          // 等待 iframe 加载
          await new Promise((resolve) => {
            iframe.onload = resolve;
            setTimeout(resolve, 8000); // 超时保护
          });

          // 等待额外时间让 SPA 渲染
          await new Promise(resolve => setTimeout(resolve, 3000));

          // 尝试从 iframe 中读取数据
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const rows = iframeDoc.querySelectorAll('table tbody tr, .ant-table-tbody tr, .el-table__body tr');

            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 2) {
                const version = cells[0]?.textContent?.trim() || '';
                const branch = cells[1]?.textContent?.trim() || '';

                if (branch && (branch.includes(branchName) || branchName.includes(branch))) {
                  document.body.removeChild(iframe);
                  return { serviceName, appId, status: 'success', version, branch };
                }
              }
            }
          } catch (e) {
            console.log('[版本采集] 跨域无法访问 iframe:', e.message);
          }

          document.body.removeChild(iframe);
        } catch (e) {
          console.log('[版本采集] iframe 方式失败:', e.message);
        }

        return { serviceName, appId, status: 'error', error: '所有获取方式均失败，请检查网络', version: null, branch: branchName };
      },
      args: [projectId, appId, branchName, serviceName]
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }

    return {
      serviceName, appId, status: 'error',
      error: '脚本执行无返回结果', version: null, branch: branchName
    };
  } catch (error) {
    console.error(`[版本采集] executeScript 失败 (${serviceName}):`, error);
    return {
      serviceName, appId, status: 'error',
      error: error.message, version: null, branch: branchName
    };
  }
}

/**
 * 批量采集多个服务的版本号
 * @param {string} projectId - 项目ID
 * @param {Array} services - 服务列表 [{name, appId}]
 * @param {string} branchName - 分支名称
 * @returns {Promise<Array>} 版本信息数组
 */
async function batchFetchBuildHistory(projectId, services, branchName) {
  // 获取或创建 DevOps 标签页
  const tabId = await getOrCreateDevOpsTab(projectId);
  console.log('使用 DevOps 标签页:', tabId);

  const results = [];
  for (const service of services) {
    if (!service.appId) {
      results.push({
        serviceName: service.name,
        appId: '',
        status: 'error',
        error: '未配置 appId',
        version: null,
        branch: branchName
      });
      continue;
    }

    console.log(`正在采集: ${service.name} (appId: ${service.appId})`);
    const result = await fetchBuildHistoryViaTab(tabId, projectId, service.appId, branchName, service.name);
    results.push(result);
  }

  return results;
}

// ==================== 版本采集功能结束 ====================

// 插件安装或更新时初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated, initializing...');
  
  // 加载持久化状态
  await loadPersistentState();
  
  // 启动心跳机制
  keepAlive();
  
  // 记录安装/更新操作
  recordOperation('extension_installed', { 
    version: chrome.runtime.getManifest().version,
    reason: 'install'
  });
  
  initializeSidePanel();
  
  // 强制清除所有动态规则
  chrome.declarativeNetRequest.getDynamicRules().then(existingRules => {
    const ruleIdsToRemove = existingRules.map(rule => rule.id);
    if (ruleIdsToRemove.length > 0) {
      return chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove
      });
    }
    return Promise.resolve();
  }).then(() => {
    console.log('Cleared all dynamic rules on install');
    // 延迟初始化代理功能
    setTimeout(() => {
      loadProxyConfig();
    }, 1000);
  }).catch(error => {
    console.error('Error clearing rules on install:', error);
    // 即使清除失败，也继续初始化
    setTimeout(() => {
      loadProxyConfig();
    }, 1000);
  });
});

// 浏览器启动时初始化
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser startup, initializing extension...');
  
  // 加载持久化状态
  await loadPersistentState();
  
  // 启动心跳机制
  keepAlive();
  
  // 记录启动操作
  recordOperation('browser_startup', { 
    timestamp: Date.now()
  });
  
  initializeSidePanel();
  
  // 延迟初始化代理功能
  setTimeout(() => {
    loadProxyConfig();
  }, 1000);
});

// 初始化侧边栏和上下文菜单
function initializeSidePanel() {
  // 设置侧边栏按钮
  chrome.sidePanel.setOptions({
    path: 'sidepanel.html',
    enabled: true
  }).then(() => {
    console.log('侧边栏选项设置成功');
  }).catch(error => {
    console.error('设置侧边栏选项时出错:', error);
  });
  
  // 添加右键菜单
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '宇航工具箱: 翻译选中文本',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'summarize-selection',
    title: '宇航工具箱: 总结选中文本',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'convert-to-json',
    title: '宇航工具箱: 转换为JSON',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'summarize-page',
    title: '宇航工具箱: 总结当前页面',
    contexts: ['page']
  });
}

// 处理插件图标点击事件，打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  console.log('插件图标被点击，打开侧边栏');
  try {
    // 首先尝试在当前窗口打开侧边栏
    chrome.sidePanel.open({ tabId: tab.id })
      .then(() => {
        console.log('侧边栏已成功打开（使用tabId）');
      })
      .catch(error => {
        console.error('使用tabId打开侧边栏时出错:', error);
        
        // 如果失败，尝试使用windowId打开
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
          .then(() => {
            console.log('侧边栏已成功打开（使用windowId）');
          })
          .catch(err => {
            console.error('使用windowId打开侧边栏时出错:', err);
            
            // 第三种方法：重新设置并尝试激活
            chrome.sidePanel.setOptions({
              path: 'sidepanel.html',
              enabled: true
            }).then(() => {
              console.log('侧边栏选项已重新设置');
              // 延迟100ms后再次尝试打开
              setTimeout(() => {
                chrome.sidePanel.open()
                  .then(() => console.log('延迟后成功打开侧边栏'))
                  .catch(delayErr => console.error('延迟后打开侧边栏失败:', delayErr));
              }, 100);
            }).catch(setErr => {
              console.error('设置侧边栏选项时出错:', setErr);
            });
          });
      });
  } catch (error) {
    console.error('尝试打开侧边栏时发生异常:', error);
  }
});

// 处理上下文菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // 获取选中文本
  const selectedText = info.selectionText;
  
  // 根据不同菜单项执行不同操作
  switch (info.menuItemId) {
    case 'translate-selection':
      // 打开侧边栏并发送消息指示翻译功能
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      });
      chrome.tabs.sendMessage(tab.id, { 
        action: 'translate', 
        text: selectedText 
      }, response => {
        console.log('翻译请求已发送', response);
      });
      break;
      
    case 'summarize-selection':
      // 打开侧边栏并发送消息指示总结功能
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      });
      chrome.tabs.sendMessage(tab.id, { 
        action: 'summarize', 
        text: selectedText 
      }, response => {
        console.log('总结请求已发送', response);
      });
      break;
      
    case 'convert-to-json':
      // 打开侧边栏并发送消息指示JSON转换功能
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      });
      chrome.tabs.sendMessage(tab.id, { 
        action: 'convert-json', 
        text: selectedText 
      }, response => {
        console.log('JSON转换请求已发送', response);
      });
      break;
      
    case 'summarize-page':
      // 打开侧边栏并请求获取整个页面内容
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      });
      chrome.tabs.sendMessage(tab.id, { 
        action: 'get_page_content'
      }, response => {
        console.log('页面内容请求已发送', response);
      });
      break;
  }
});

// 与内容脚本和侧边栏之间的通信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 处理ping消息（用于检测后台脚本是否就绪）
  if (message.action === 'ping') {
    sendResponse({ success: true, message: 'pong' });
    return true;
  }
  
  // 记录消息操作
  recordOperation('message_received', {
    action: message.action,
    from: message.from,
    timestamp: Date.now()
  });
  
  // 处理状态恢复请求
  if (message.action === 'requestPersistentState') {
    console.log('Sending persistent state to sidepanel');
    sendResponse({
      success: true,
      state: persistentState
    });
    return true;
  }
  
  // 处理状态保存请求
  if (message.action === 'savePersistentState') {
    if (message.data) {
      persistentState.sessionData = { ...persistentState.sessionData, ...message.data };
      savePersistentState();
      console.log('Saved persistent state from sidepanel');
    }
    sendResponse({ success: true });
    return true;
  }
  
  // 处理代理配置更新（优先处理，避免被其他响应覆盖）
  if (message.action === 'updateProxyConfig') {
    console.log('=== Received Proxy Config Update ===');
    console.log('New config:', message.config);
    console.log('isRuleUse:', message.config.isRuleUse);
    console.log('Number of rules:', message.config.ruleTableData ? message.config.ruleTableData.length : 0);
    
    currentProxyConfig = message.config;
    chrome.storage.local.set({ proxyConfig: currentProxyConfig });
    
    // 根据配置设置或取消代理
    if (currentProxyConfig.proxyEnable) {
      setProxy(currentProxyConfig);
    } else {
      unsetProxy();
    }
    
    // 更新declarativeNetRequest规则（异步执行）
    setTimeout(() => {
      updateRedirectRules().catch(error => {
        console.error('Error updating redirect rules:', error);
      });
    }, 100);
    
    console.log('Proxy config updated successfully');
    sendResponse({ success: true });
    return true; // 保持异步响应通道开放
  }
  
  // 处理清除代理规则
  if (message.action === 'clearProxyRules') {
    chrome.declarativeNetRequest.getDynamicRules().then(existingRules => {
      const ruleIdsToRemove = existingRules.map(rule => rule.id);
      
      if (ruleIdsToRemove.length > 0) {
        return chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove
        }).then(() => {
          console.log('Manually cleared all proxy rules:', ruleIdsToRemove);
          sendResponse({ success: true, clearedRules: ruleIdsToRemove.length });
        });
      } else {
        console.log('No rules to clear');
        sendResponse({ success: true, clearedRules: 0 });
      }
    }).catch(error => {
      console.error('Error clearing rules:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持异步响应通道开放
  }
  
  // 处理测试代理规则
  if (message.action === 'testProxyRules') {
    console.log('=== Proxy Rules Test ===');
    console.log('Current config:', currentProxyConfig);
    console.log('Test config:', message.config);
    
    // 获取当前的declarativeNetRequest规则
    chrome.declarativeNetRequest.getDynamicRules().then(rules => {
      console.log('Current dynamic rules:', rules);
      
            // 测试多个URL
      const testUrls = [
        'http://172.29.249.4:8001/gateway/haic-c-clinical/v1/pt/clinical/outpatient/reception/searchVisitPatients',
        'http://172.29.249.4:8001/gateway/haic-c-material/v1/some/api/endpoint',
        'http://172.29.249.4:8001/gateway/haic-c-basic/v1/another/api/endpoint'
      ];
      console.log('Testing URLs:', testUrls);
    
            // 测试每个动态规则
      rules.forEach(rule => {
        console.log(`Testing dynamic rule ${rule.id}:`);
        console.log(`  Regex filter: ${rule.condition.regexFilter}`);
        console.log(`  Substitution: ${rule.action.redirect.regexSubstitution}`);
        
        // 测试每个URL
        testUrls.forEach(testUrl => {
          console.log(`  Testing URL: ${testUrl}`);
          try {
            const regex = new RegExp(rule.condition.regexFilter);
            const matches = testUrl.match(regex);
            console.log(`    Regex matches: ${!!matches}`);
            if (matches) {
              console.log(`    Match groups:`, matches);
              // 手动构建替换结果
              let result = rule.action.redirect.regexSubstitution;
              matches.forEach((match, index) => {
                result = result.replace(new RegExp(`\\\\${index}`, 'g'), match);
              });
              console.log(`    Manual substitution result: ${result}`);
            }
          } catch (e) {
            console.error(`    Regex test failed:`, e);
          }
        });
      });
    
            // 检查配置规则
      message.config.ruleTableData.forEach((rule, index) => {
        if (rule.isUse && rule.beforeStr && rule.afterStr) {
          console.log(`Testing config rule ${index + 1}:`);
          console.log(`  Before: "${rule.beforeStr}"`);
          console.log(`  After: "${rule.afterStr}"`);
          
          // 测试每个URL
          testUrls.forEach(testUrl => {
            console.log(`  Testing URL: ${testUrl}`);
            console.log(`    URL contains before string: ${testUrl.includes(rule.beforeStr)}`);
            console.log(`    URL contains after string: ${testUrl.includes(rule.afterStr)}`);
            
            if (testUrl.includes(rule.beforeStr) && !testUrl.includes(rule.afterStr)) {
              const newUrl = testUrl.replace(rule.beforeStr, rule.afterStr);
              console.log(`    Would redirect to: ${newUrl}`);
            } else if (testUrl.includes(rule.afterStr)) {
              console.log(`    URL already contains target string - no redirect needed`);
            } else {
              console.log(`    URL does not match this rule`);
            }
          });
        }
      });
    
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Error getting dynamic rules:', error);
      sendResponse({ success: false, error: error.message });
    });

    return true; // 保持异步响应通道开放
  }

  // 批量采集版本号（新方案：在 DevOps 标签页上下文中 fetch）
  if (message.action === 'batchFetchVersions') {
    console.log('=== Batch Fetching Versions ===');
    console.log('Project ID:', message.projectId);
    console.log('Branch Name:', message.branchName);
    console.log('Services:', message.services?.length);

    batchFetchBuildHistory(message.projectId, message.services, message.branchName)
      .then(results => {
        console.log('Batch fetch results:', results);
        sendResponse({ success: true, data: results });
      })
      .catch(error => {
        console.error('Batch fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  // 单个服务版本采集（保留兼容）
  if (message.action === 'getVersionFromTab') {
    console.log('=== Getting Version From Tab (Legacy) ===');
    console.log('Tab ID:', message.tabId);
    console.log('Branch Name:', message.branchName);

    chrome.tabs.sendMessage(message.tabId, {
      action: 'getDevOpsBuildData',
      branchName: message.branchName
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message to tab:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
        return;
      }

      if (response && response.success && response.data && response.data.length > 0) {
        // 找到匹配的构建记录，取第一个（最新的）
        const build = response.data[0];
        sendResponse({
          success: true,
          data: {
            serviceName: message.serviceName,
            appId: message.appId,
            status: 'success',
            version: build.version,
            branch: build.branch,
            buildTime: build.buildTime,
            commit: build.commit
          }
        });
      } else if (response && response.success) {
        // 没有找到匹配的记录
        sendResponse({
          success: true,
          data: {
            serviceName: message.serviceName,
            appId: message.appId,
            status: 'no-record',
            version: null,
            branch: message.branchName
          }
        });
      } else {
        sendResponse({
          success: false,
          error: response?.error || '获取数据失败'
        });
      }
    });

    return true;
  }

  // 处理版本采集请求（通过 DevOps 标签页上下文 fetch）
  if (message.action === 'fetchBuildHistory') {
    console.log('=== Fetching Build History (Single) ===');
    console.log('Project ID:', message.projectId);
    console.log('App ID:', message.appId);
    console.log('Branch Name:', message.branchName);
    console.log('Service Name:', message.serviceName);

    (async () => {
      try {
        const tabId = await getOrCreateDevOpsTab(message.projectId);
        const result = await fetchBuildHistoryViaTab(tabId, message.projectId, message.appId, message.branchName, message.serviceName);
        console.log('Build history result:', result);
        sendResponse({ success: true, data: result });
      } catch (error) {
        console.error('Error fetching build history:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // 保持异步响应通道开放
  }

  // 对于非代理相关的消息，确认消息已收到
  sendResponse({ received: true });

  // 处理来自侧边栏的用户数据填充请求
  if (message.from === 'sidepanel' && message.action === 'fill_user_data') {
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      if (tabs[0]) {
        try {
          // 先尝试直接发送消息
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'fill_user_data',
            userData: message.userData
          }, response => {
            // 如果收到响应，说明content script已加载
            if (response) {
              console.log('正常发送填充用户数据请求');
              return;
            }
            
            // 如果没有收到响应，可能content script未加载
            console.log('未收到响应，尝试动态注入内容脚本');
            
            // 动态注入内容脚本
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js']
            }).then(() => {
              console.log('内容脚本已动态注入');
              
              // 等待脚本加载完成后再次发送消息
              setTimeout(() => {
                chrome.tabs.sendMessage(tabs[0].id, { 
                  action: 'fill_user_data',
                  userData: message.userData
                }, secondResponse => {
                  console.log('二次尝试发送填充请求', secondResponse);
                });
              }, 200);
            }).catch(error => {
              console.error('动态注入内容脚本失败:', error);
              // 通知侧边栏出错
              chrome.runtime.sendMessage({
                from: 'background',
                to: 'sidepanel',
                action: 'error',
                error: '无法注入内容脚本: ' + error.message
              });
            });
          });
        } catch (error) {
          console.error('处理填充用户数据请求时出错:', error);
          // 通知侧边栏出错
          chrome.runtime.sendMessage({
            from: 'background',
            to: 'sidepanel',
            action: 'error',
            error: '处理填充用户数据请求失败: ' + error.message
          });
        }
      } else {
        // 如果没有活动标签页，向侧边栏发送错误消息
        chrome.runtime.sendMessage({
          from: 'background',
          to: 'sidepanel',
          action: 'error',
          error: '无法获取当前标签页'
        });
      }
    });
  }
  
  // 处理来自侧边栏的请求页面内容消息
  if (message.from === 'sidepanel' && message.action === 'request_page_content') {
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        // 向活动标签页发送获取内容的请求
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'get_page_content'
        }, response => {
          console.log('向内容脚本请求页面内容', response);
        });
      } else {
        // 如果没有活动标签页，向侧边栏发送错误消息
        chrome.runtime.sendMessage({
          from: 'background',
          to: 'sidepanel',
          action: 'error',
          error: '无法获取当前页面内容'
        });
      }
    });
  }
  
  // 处理来自内容脚本的消息
  if (message.from === 'content') {
    // 处理错误消息
    if (message.action === 'error') {
      console.error('内容脚本错误:', message.error);
      // 将错误消息转发给侧边栏
      chrome.runtime.sendMessage({
        from: 'background',
        to: 'sidepanel',
        action: 'error',
        error: message.error
      });
      return;
    }
    
    // 处理正常消息（包括包含文本的内容）
    if (message.selectedText) {
      // 转发选中的文本到侧边栏
      chrome.runtime.sendMessage({
        from: 'background',
        to: 'sidepanel',
        action: message.action || 'update_selection',
        text: message.selectedText,
        autoExecute: message.autoExecute || false,
        isFullPage: message.isFullPage || false
      }, response => {
        console.log('转发消息到侧边栏', response);
      });
    }
  }
  
  // 注释：代理相关的消息处理已移到消息监听器开头，避免被 received: true 响应覆盖
});

// ==================== 代理功能 ====================

let currentProxyConfig = {
  isRuleUse: false,
  interceptUrl: '/gateway/',
  proxyIp: '',
  proxyEnable: true,
  ruleTableData: []
};

// 加载代理配置
function loadProxyConfig() {
  try {
    chrome.storage.local.get('proxyConfig', (result) => {
      if (chrome.runtime.lastError) {
        console.log('No proxy config found, using defaults');
        return;
      }
      
      if (result.proxyConfig) {
        currentProxyConfig = { ...currentProxyConfig, ...result.proxyConfig };
        console.log('Loaded proxy config:', currentProxyConfig);
        
        // 根据配置设置代理
        if (currentProxyConfig.proxyEnable) {
          setProxy(currentProxyConfig);
        }
        
        // 更新重定向规则（异步执行，不阻塞其他功能）
        setTimeout(() => {
          updateRedirectRules().catch(error => {
            console.error('Error updating redirect rules:', error);
          });
        }, 100);
      } else {
        console.log('No proxy config found, using defaults');
      }
    });
  } catch (error) {
    console.error('Error loading proxy config:', error);
  }
}

// 判断URL是否需要拦截
function isUrlMatch(interceptRule, url) {
  try {
    const regex = new RegExp(interceptRule);
    return regex.test(url);
  } catch (e) {
    console.error('Invalid regex pattern:', interceptRule, e);
    return false;
  }
}

// 根据规则正则匹配替换地址
function patternMatch(interceptRule, url) {
  let result = {
    changed: false,
    newUrl: ''
  };
  
  if (!isUrlMatch(interceptRule.interceptUrl, url)) {
    return result;
  }
  
  interceptRule.ruleTableData.forEach(item => {
    if (item.isUse && item.beforeStr && item.afterStr) {
      if (url.indexOf(item.beforeStr) > -1 && url.indexOf(item.afterStr) === -1) {
        url = url.replace(item.beforeStr, item.afterStr);
        result.changed = true;
      }
    }
  });
  
  if (result.changed) {
    result.newUrl = url;
  }
  
  return result;
}

// 设置代理
function setProxy(interceptRule) {
  if (!interceptRule.proxyEnable || !interceptRule.proxyIp) {
    unsetProxy();
    return;
  }

  const config = {
    mode: 'pac_script',
    pacScript: {
      data: buildProxyConfig(interceptRule)
    }
  };
  
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to set proxy:', chrome.runtime.lastError);
    } else {
      console.log('Proxy set:', config);
    }
  });
}

// 解除代理
function unsetProxy() {
  const config = { mode: 'direct' };
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to unset proxy:', chrome.runtime.lastError);
    } else {
      console.log('Proxy unset');
    }
  });
}

// 构造代理PAC脚本
function buildProxyConfig(interceptRule) {
  let func = 'function FindProxyForURL(url, host) { ';
  func += `if (shExpMatch(url, '${interceptRule.interceptUrl}')) { `;
  func += `return 'PROXY ${interceptRule.proxyIp}:80'; `;
  func += '} else { ';
  func += "return 'DIRECT'; ";
  func += '}';
  func += '}';
  return func;
}

// 注释：重复的消息监听器已合并到上面的主监听器中

// 更新重定向规则
async function updateRedirectRules() {
  try {
    console.log('Updating redirect rules with config:', currentProxyConfig);
    
    // 清除现有规则
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = existingRules.map(rule => rule.id);
    
    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove
      });
      console.log('Removed existing rules:', ruleIdsToRemove);
    }

    // 如果代理配置未启用，直接返回
    if (!currentProxyConfig || !currentProxyConfig.isRuleUse) {
      console.log('Proxy rules disabled');
      return;
    }

    // 创建新的重定向规则
    const newRules = [];
    let ruleId = 1;

    console.log(`Processing ${currentProxyConfig.ruleTableData.length} rules from config`);
    
    currentProxyConfig.ruleTableData.forEach((rule, index) => {
      console.log(`Processing rule ${index + 1}:`, rule);
      
      if (rule.isUse && rule.beforeStr && rule.afterStr) {
        console.log(`  ✓ Rule ${index + 1} is active: ${rule.beforeStr} -> ${rule.afterStr}`);
        
        // 创建两个规则：一个重定向规则和一个排除规则
        
        // 1. 重定向规则：匹配包含beforeStr但不包含afterStr的URL
        const regexFilter = `^(.*)${rule.beforeStr}(.*)$`;
        
        newRules.push({
          id: ruleId,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              regexSubstitution: `\\1${rule.afterStr}\\2`
            }
          },
          condition: {
            regexFilter: regexFilter,
            resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame']
          }
        });
        
        ruleId++;
        
        // 2. 排除规则：不匹配已经包含afterStr的URL（更高优先级）
        const excludeFilter = `^.*${rule.afterStr}.*$`;
        newRules.push({
          id: ruleId,
          priority: 2, // 更高优先级
          action: {
            type: 'allow' // 允许通过，不重定向
          },
          condition: {
            regexFilter: excludeFilter,
            resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame']
          }
        });
        
        console.log(`  Created redirect rule ${ruleId - 1}: ${rule.beforeStr} -> ${rule.afterStr}`);
        console.log(`  Created exclude rule ${ruleId}: skip URLs with ${rule.afterStr}`);
        console.log(`  Redirect regex: ${regexFilter}`);
        console.log(`  Exclude regex: ${excludeFilter}`);
        ruleId++;
      } else {
        console.log(`  ✗ Rule ${index + 1} is inactive or incomplete:`, {
          isUse: rule.isUse,
          beforeStr: rule.beforeStr,
          afterStr: rule.afterStr
        });
      }
    });

    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });
      console.log('Successfully added redirect rules:', newRules.length);
      
      // 验证规则是否添加成功
      const verifyRules = await chrome.declarativeNetRequest.getDynamicRules();
      console.log('Current dynamic rules:', verifyRules);
    } else {
      console.log('No rules to add');
    }
  } catch (error) {
    console.error('Failed to update redirect rules:', error);
  }
}

// Web请求拦截 - 用于调试和监控，以及手动重定向fallback
const processedUrls = new Set(); // 防止重复处理

if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      // 检查是否有配置的规则需要应用到当前URL
      if (currentProxyConfig && currentProxyConfig.isRuleUse && currentProxyConfig.ruleTableData) {
        let shouldLog = false;
        
        // 首先检查URL是否匹配拦截规则
        if (currentProxyConfig.interceptUrl && details.url.includes(currentProxyConfig.interceptUrl.replace(/[/]/g, ''))) {
          
          currentProxyConfig.ruleTableData.forEach(rule => {
            if (rule.isUse && rule.beforeStr && details.url.includes(rule.beforeStr)) {
              if (!shouldLog) {
                console.log('Detected matching request:', details.url);
                console.log('Current proxy config:', currentProxyConfig);
                shouldLog = true;
              }
              
              console.log(`Rule should apply: ${rule.beforeStr} -> ${rule.afterStr}`);
              
              // 检查是否已经包含目标字符串
              if (!details.url.includes(rule.afterStr)) {
                const newUrl = details.url.replace(rule.beforeStr, rule.afterStr);
                console.log(`Manual redirect: ${details.url} -> ${newUrl}`);
                
                // 由于declarativeNetRequest可能不工作，尝试手动重定向
                if (!processedUrls.has(details.url)) {
                  processedUrls.add(details.url);
                  processedUrls.add(newUrl); // 防止新URL被再次处理
                  
                  // 注意：在Manifest V3中，我们不能直接返回重定向
                  // 但我们可以记录这个信息供调试使用
                  console.warn('DeclarativeNetRequest should handle this redirect');
                }
              } else {
                console.log('URL already contains target string, skipping');
              }
            }
          });
        }
      }
    },
    { urls: ['<all_urls>'] }
  );
}

// 监听declarativeNetRequest规则是否生效（如果支持的话）
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    console.log('DeclarativeNetRequest rule matched:', info);
  });
} else {
  console.log('onRuleMatchedDebug API not available');
}

// 代理配置已在 onInstalled 和 onStartup 事件中初始化

// ==================== 代理功能结束 ==================== 