/**
 * 宇航工具箱 - 侧边栏脚本
 * @description 处理插件界面交互和功能逻辑，支持状态持久化
 */

// ==================== 状态持久化管理 ====================

// 本地状态缓存
let localState = {
  currentTab: 'json-tab',
  lastInputs: {},
  lastResults: {},
  modelSettings: {},
  operationHistory: []
};

// 恢复持久化状态
async function restorePersistentState() {
  try {
    console.log('Requesting persistent state from background...');
    
    // 等待后台脚本准备就绪
    await waitForBackgroundScript();
    
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Background script response timeout'));
      }, 5000); // 5秒超时
      
      chrome.runtime.sendMessage({ 
        action: 'requestPersistentState' 
      }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    if (response && response.success && response.state) {
      console.log('Received persistent state:', response.state);
      
      // 恢复会话数据
      if (response.state.sessionData) {
        localState = { ...localState, ...response.state.sessionData };
        
        // 恢复界面状态
        restoreUIState();
      }
      
      return true;
    }
  } catch (error) {
    console.warn('Failed to restore persistent state:', error.message);
    // 不要阻止初始化，继续使用默认状态
    return false;
  }
}

// 等待后台脚本准备就绪
function waitForBackgroundScript() {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10;
    
    function checkBackground() {
      attempts++;
      
      // 发送一个简单的ping消息测试连接
      chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          if (attempts < maxAttempts) {
            setTimeout(checkBackground, 200);
          } else {
            console.warn('Background script not responding, continuing anyway...');
            resolve();
          }
        } else {
          console.log('Background script is ready');
          resolve();
        }
      });
    }
    
    checkBackground();
  });
}

// 保存状态到后台
function savePersistentState() {
  // 检查是否有有效的runtime连接
  if (!chrome.runtime || !chrome.runtime.sendMessage) {
    console.warn('Chrome runtime not available, skipping state save');
    return;
  }
  
  try {
    chrome.runtime.sendMessage({
      action: 'savePersistentState',
      data: localState
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to save persistent state:', chrome.runtime.lastError.message);
      } else {
        console.log('Persistent state saved successfully');
      }
    });
  } catch (error) {
    console.warn('Error sending save state message:', error.message);
  }
}

// 恢复UI状态
function restoreUIState() {
  try {
    // 恢复当前标签页
    if (localState.currentTab) {
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');
      
      // 移除所有活动状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // 激活保存的标签页
      const targetButton = document.querySelector(`[data-tab="${localState.currentTab}"]`);
      const targetContent = document.getElementById(localState.currentTab);
      
      if (targetButton && targetContent) {
        targetButton.classList.add('active');
        targetContent.classList.add('active');
        console.log('Restored tab:', localState.currentTab);
      }
    }
    
    // 恢复输入内容
    if (localState.lastInputs) {
      restoreInputs();
    }
    
    // 恢复结果内容
    if (localState.lastResults) {
      restoreResults();
    }
    
    console.log('UI state restored successfully');
  } catch (error) {
    console.error('Failed to restore UI state:', error);
  }
}

// 恢复输入内容
function restoreInputs() {
  try {
    // 恢复JSON输入
    if (localState.lastInputs.jsonInput) {
      const jsonInput = document.getElementById('jsonInput');
      if (jsonInput) {
        jsonInput.value = localState.lastInputs.jsonInput;
      }
    }
    
    // 恢复翻译输入
    if (localState.lastInputs.translateInput) {
      const translateInput = document.getElementById('translateInput');
      if (translateInput) {
        const placeholder = translateInput.querySelector('.selected-text-placeholder');
        if (placeholder) {
          translateInput.removeChild(placeholder);
        }
        translateInput.textContent = localState.lastInputs.translateInput;
      }
    }
    
    // 恢复总结输入
    if (localState.lastInputs.summarizeInput) {
      const summarizeInput = document.getElementById('summarizeInput');
      if (summarizeInput) {
        const placeholder = summarizeInput.querySelector('.selected-text-placeholder');
        if (placeholder) {
          summarizeInput.removeChild(placeholder);
        }
        summarizeInput.textContent = localState.lastInputs.summarizeInput;
      }
    }
    
    console.log('Inputs restored successfully');
  } catch (error) {
    console.error('Failed to restore inputs:', error);
  }
}

// 恢复结果内容
function restoreResults() {
  try {
    // 恢复JSON结果
    if (localState.lastResults.jsonResult) {
      const jsonResult = document.getElementById('jsonResult');
      if (jsonResult) {
        jsonResult.innerHTML = localState.lastResults.jsonResult;
      }
    }
    
    // 恢复翻译结果
    if (localState.lastResults.translateResult) {
      const translateResult = document.getElementById('translateResult');
      if (translateResult) {
        translateResult.innerHTML = localState.lastResults.translateResult;
      }
    }
    
    // 恢复总结结果
    if (localState.lastResults.summarizeResult) {
      const summarizeResult = document.getElementById('summarizeResult');
      if (summarizeResult) {
        summarizeResult.innerHTML = localState.lastResults.summarizeResult;
      }
    }
    
    console.log('Results restored successfully');
  } catch (error) {
    console.error('Failed to restore results:', error);
  }
}

// 保存当前输入状态
function saveCurrentInputs() {
  try {
    const jsonInput = document.getElementById('jsonInput');
    const translateInput = document.getElementById('translateInput');
    const summarizeInput = document.getElementById('summarizeInput');
    
    localState.lastInputs = {};
    
    if (jsonInput && jsonInput.value.trim()) {
      localState.lastInputs.jsonInput = jsonInput.value;
    }
    
    if (translateInput && translateInput.textContent.trim() && 
        !translateInput.querySelector('.selected-text-placeholder')) {
      localState.lastInputs.translateInput = translateInput.textContent;
    }
    
    if (summarizeInput && summarizeInput.textContent.trim() && 
        !summarizeInput.querySelector('.selected-text-placeholder')) {
      localState.lastInputs.summarizeInput = summarizeInput.textContent;
    }
    
    savePersistentState();
  } catch (error) {
    console.error('Failed to save current inputs:', error);
  }
}

// 保存当前结果状态
function saveCurrentResults() {
  try {
    const jsonResult = document.getElementById('jsonResult');
    const translateResult = document.getElementById('translateResult');
    const summarizeResult = document.getElementById('summarizeResult');
    
    localState.lastResults = {};
    
    if (jsonResult && jsonResult.innerHTML && 
        !jsonResult.innerHTML.includes('JSON结果将在这里显示')) {
      localState.lastResults.jsonResult = jsonResult.innerHTML;
    }
    
    if (translateResult && translateResult.innerHTML && 
        !translateResult.innerHTML.includes('翻译结果将在这里显示')) {
      localState.lastResults.translateResult = translateResult.innerHTML;
    }
    
    if (summarizeResult && summarizeResult.innerHTML && 
        !summarizeResult.innerHTML.includes('总结结果将在这里显示')) {
      localState.lastResults.summarizeResult = summarizeResult.innerHTML;
    }
    
    savePersistentState();
  } catch (error) {
    console.error('Failed to save current results:', error);
  }
}

// 定期保存状态
function startPeriodicSave() {
  setInterval(() => {
    saveCurrentInputs();
    saveCurrentResults();
  }, 30000); // 每30秒保存一次
}

// 页面卸载时保存状态
window.addEventListener('beforeunload', () => {
  saveCurrentInputs();
  saveCurrentResults();
  console.log('Page unloading, state saved');
});

// 页面隐藏时保存状态（用户切换标签页或最小化窗口）
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveCurrentInputs();
    saveCurrentResults();
    console.log('Page hidden, state saved');
  }
});

// 添加输入变化监听器，实时保存
function addInputChangeListeners() {
  // JSON输入框变化监听
  const jsonInput = document.getElementById('jsonInput');
  if (jsonInput) {
    let jsonInputTimeout;
    jsonInput.addEventListener('input', () => {
      clearTimeout(jsonInputTimeout);
      jsonInputTimeout = setTimeout(() => {
        saveCurrentInputs();
      }, 2000); // 2秒后保存
    });
  }
  
  // 翻译输入框变化监听
  const translateInput = document.getElementById('translateInput');
  if (translateInput) {
    let translateInputTimeout;
    translateInput.addEventListener('input', () => {
      clearTimeout(translateInputTimeout);
      translateInputTimeout = setTimeout(() => {
        saveCurrentInputs();
      }, 2000); // 2秒后保存
    });
  }
  
  // 总结输入框变化监听
  const summarizeInput = document.getElementById('summarizeInput');
  if (summarizeInput) {
    let summarizeInputTimeout;
    summarizeInput.addEventListener('input', () => {
      clearTimeout(summarizeInputTimeout);
      summarizeInputTimeout = setTimeout(() => {
        saveCurrentInputs();
      }, 2000); // 2秒后保存
    });
  }
}

// ==================== 状态持久化管理结束 ====================

// 检查依赖库是否加载完成
function checkDependencies() {
  const dependencies = {
    'Chart': typeof Chart !== 'undefined',
    'XLSX': typeof XLSX !== 'undefined',
    'marked': typeof marked !== 'undefined',
    'docx': typeof docx !== 'undefined',
    'saveAs': typeof saveAs !== 'undefined',
    'deepSeekAPI': typeof deepSeekAPI !== 'undefined',
    'libsInitialized': window.libsInitialized === true
  };
  
  const missing = Object.entries(dependencies)
    .filter(([name, loaded]) => !loaded)
    .map(([name]) => name);
  
  if (missing.length > 0) {
    console.warn('Missing dependencies:', missing);
    // 对于可选依赖，创建占位符
    if (!window.docx) {
      window.docx = {
        Document: function() { console.warn('docx library not loaded'); },
        Paragraph: function() { console.warn('docx library not loaded'); },
        Packer: { toBlob: function() { return Promise.reject('docx library not loaded'); } }
      };
    }
    if (!window.saveAs) {
      window.saveAs = function() { console.warn('FileSaver library not loaded'); };
    }
  }
  
  // 核心依赖必须加载，可选依赖可以缺失
  const criticalDeps = ['deepSeekAPI'];
  const missingCritical = missing.filter(dep => criticalDeps.includes(dep));
  
  return missingCritical.length === 0;
}

// 早期初始化，防止空白页面
(function earlyInit() {
  // 在脚本加载时立即执行，不等待DOMContentLoaded
  if (document.readyState === 'loading') {
    // DOM还在加载中，等待DOMContentLoaded
    document.addEventListener('DOMContentLoaded', waitForDependenciesAndInit);
  } else {
    // DOM已经加载完成，立即初始化
    waitForDependenciesAndInit();
  }
})();

// 等待依赖库加载完成后初始化
function waitForDependenciesAndInit() {
  let attempts = 0;
  const maxAttempts = 50; // 最多等待5秒
  
  // 立即显示页面，避免空白
  document.body.style.visibility = 'visible';
  document.body.style.opacity = '1';
  document.body.classList.add('initializing');
  
  function tryInit() {
    attempts++;
    
    // 更新状态显示
    const statusText = document.getElementById('statusText');
    if (statusText) {
      if (attempts <= 10) {
        statusText.textContent = '正在加载依赖库...';
      } else if (attempts <= 30) {
        statusText.textContent = '正在等待组件加载...';
      } else {
        statusText.textContent = '即将完成初始化...';
      }
    }
    
    if (checkDependencies()) {
      console.log('All dependencies loaded, initializing app...');
      initializeApp();
    } else if (attempts < maxAttempts) {
      console.log(`Waiting for dependencies... (${attempts}/${maxAttempts})`);
      setTimeout(tryInit, 100);
    } else {
      console.warn('Some dependencies failed to load, initializing anyway...');
      initializeApp();
    }
  }
  
  tryInit();
}

function initializeApp() {
  // 立即显示页面，避免空白
  document.body.style.visibility = 'visible';
  document.body.style.opacity = '1';
  
  // 添加初始化状态类
  document.body.classList.add('initializing');
  
  // 立即显示基本状态
  const statusText = document.getElementById('statusText');
  if (statusText) {
    statusText.textContent = '正在初始化插件...';
  }
  
  // 检查关键依赖
  if (typeof deepSeekAPI === 'undefined') {
    console.error('Critical dependency missing: deepSeekAPI');
    if (statusText) {
      statusText.textContent = '加载失败：缺少核心组件';
    }
    return;
  }
  
  // 首先尝试恢复持久化状态
  restorePersistentState().then(() => {
    if (statusText) {
      statusText.textContent = '正在初始化组件...';
    }
    // 异步初始化其他组件，避免阻塞UI
    setTimeout(initializeComponents, 0);
  }).catch(error => {
    console.error('Failed to restore persistent state:', error);
    if (statusText) {
      statusText.textContent = '正在初始化组件...';
    }
    // 即使恢复失败，也继续初始化
    setTimeout(initializeComponents, 0);
  });
}

function initializeComponents() {
  // 获取DOM元素
  const errorMessage = document.getElementById('errorMessage');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const languageTabs = document.querySelectorAll('.language-tab');
  const settingsButton = document.getElementById('settingsButton');
  const settingsPanel = document.getElementById('settingsPanel');
  const cancelSettingsButton = document.getElementById('cancelSettingsButton');
  const saveSettingsButton = document.getElementById('saveSettingsButton');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const modelSelect = document.getElementById('modelSelect');
  const headerModelSelect = document.getElementById('headerModelSelect'); // 头部模型选择器
  const currentModelName = document.getElementById('currentModelName');
  const loadingContainer = document.getElementById('loadingContainer');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const cancelOperationBtn = document.getElementById('cancelOperationBtn');
  const operationTimer = document.getElementById('operationTimer'); // 底部计时器元素
  
  // JSON转换相关元素
  const jsonInput = document.getElementById('jsonInput');
  const convertJsonButton = document.getElementById('convertJsonButton');
  const jsonResult = document.getElementById('jsonResult');
  const copyJsonButton = document.getElementById('copyJsonButton');
  const jsonExecutionTime = document.getElementById('jsonExecutionTime');
  
  // 翻译相关元素
  const translateInput = document.getElementById('translateInput');
  const translateButton = document.getElementById('translateButton');
  const translateResult = document.getElementById('translateResult');
  const copyTranslateButton = document.getElementById('copyTranslateButton');
  const translateExecutionTime = document.getElementById('translateExecutionTime');
  
  // 总结相关元素
  const summarizeInput = document.getElementById('summarizeInput');
  const summarizeButton = document.getElementById('summarizeButton');
  const summarizeResult = document.getElementById('summarizeResult');
  const copySummarizeButton = document.getElementById('copySummarizeButton');
  const summarizeExecutionTime = document.getElementById('summarizeExecutionTime');
  
  // 测试数据相关元素
  const dataCountInput = document.getElementById('dataCount');
  const generateTestDataButton = document.getElementById('generateTestDataButton');
  const testDataResult = document.getElementById('testDataResult');
  const copyTestDataButton = document.getElementById('copyTestDataButton');
  const testDataExecutionTime = document.getElementById('testDataExecutionTime');
  
  // Excel分析相关元素
  const excelFileInput = document.getElementById('excelFileInput');
  const uploadExcelButton = document.getElementById('uploadExcelButton');
  const excelAnalysisResult = document.getElementById('excelAnalysisResult');
  const workloadChart = document.getElementById('workloadChart');
  const timeVarianceChart = document.getElementById('timeVarianceChart');
  const taskTypeChart = document.getElementById('taskTypeChart');
  const personalSummary = document.getElementById('personalSummary');
  const exportExcelButton = document.getElementById('exportExcelButton');
  const excelExecutionTime = document.getElementById('excelExecutionTime');
  
  // MD转Word相关元素
  const mdFileInput = document.getElementById('mdFileInput');
  const uploadMdButton = document.getElementById('uploadMdButton');
  const mdInput = document.getElementById('mdInput');
  const convertMdButton = document.getElementById('convertMdButton');
  const mdConversionResult = document.getElementById('mdConversionResult');
  const downloadWordButton = document.getElementById('downloadWordButton');
  const mdExecutionTime = document.getElementById('mdExecutionTime');

  // 代理相关元素
  const interceptUrl = document.getElementById('interceptUrl');
  const isRuleUse = document.getElementById('isRuleUse');
  const proxyIp = document.getElementById('proxyIp');
  const proxyEnable = document.getElementById('proxyEnable');
  const saveProxyConfig = document.getElementById('saveProxyConfig');
  const addRule = document.getElementById('addRule');
  const deleteRule = document.getElementById('deleteRule');
  const testProxy = document.getElementById('testProxy');
  const clearProxy = document.getElementById('clearProxy');
  const selectAll = document.getElementById('selectAll');
  const ruleTableBody = document.getElementById('ruleTableBody');
  
  // 初始化代理功能（延迟执行，确保在tab激活后调用）
  function initProxyFeatures() {
    console.log('=== Initializing Proxy Features ===');
    
    // 重新获取元素
    const interceptUrl = document.getElementById('interceptUrl');
    const isRuleUse = document.getElementById('isRuleUse');
    const proxyIp = document.getElementById('proxyIp');
    const proxyEnable = document.getElementById('proxyEnable');
    const saveProxyConfig = document.getElementById('saveProxyConfig');
    const addRule = document.getElementById('addRule');
    const deleteRule = document.getElementById('deleteRule');
    const testProxy = document.getElementById('testProxy');
    const clearProxy = document.getElementById('clearProxy');
    const selectAll = document.getElementById('selectAll');
    const ruleTableBody = document.getElementById('ruleTableBody');
    
    console.log('=== Proxy Elements Check ===');
    console.log('interceptUrl found:', !!interceptUrl);
    console.log('isRuleUse found:', !!isRuleUse);
    console.log('proxyIp found:', !!proxyIp);
    console.log('proxyEnable found:', !!proxyEnable);
    console.log('saveProxyConfig found:', !!saveProxyConfig);
    
    if (!isRuleUse) {
      console.error('Critical: isRuleUse element not found!');
      return;
    }
    
    // 绑定保存按钮事件
    if (saveProxyConfig) {
      // 移除之前的监听器（如果有）
      saveProxyConfig.replaceWith(saveProxyConfig.cloneNode(true));
      const newSaveButton = document.getElementById('saveProxyConfig');
      
      newSaveButton.addEventListener('click', () => {
        console.log('=== Save button clicked ===');
        console.log('Elements found:');
        console.log('- interceptUrl:', !!interceptUrl, interceptUrl ? interceptUrl.value : 'null');
        console.log('- isRuleUse:', !!isRuleUse, isRuleUse ? isRuleUse.checked : 'null');
        console.log('- proxyIp:', !!proxyIp, proxyIp ? proxyIp.value : 'null');
        console.log('- proxyEnable:', !!proxyEnable, proxyEnable ? proxyEnable.checked : 'null');
        
        // 更新配置
        if (interceptUrl) proxyConfig.interceptUrl = interceptUrl.value;
        if (isRuleUse) proxyConfig.isRuleUse = isRuleUse.checked;
        if (proxyIp) proxyConfig.proxyIp = proxyIp.value;
        if (proxyEnable) proxyConfig.proxyEnable = proxyEnable.checked;
        
        console.log('Updated proxyConfig:', proxyConfig);
        console.log('Before saving - isRuleUse:', proxyConfig.isRuleUse);
        console.log('Before saving - switch checked:', isRuleUse ? isRuleUse.checked : 'element not found');
        
        // 保存所有配置并应用到后台
        saveProxyConfigData();
      });
    }
    
    // 注释：移除实时监听，改为只在保存按钮点击时生效
    
    // 绑定其他按钮事件
    if (addRule) {
      addRule.replaceWith(addRule.cloneNode(true));
      document.getElementById('addRule').addEventListener('click', addNewRule);
    }

    if (deleteRule) {
      deleteRule.replaceWith(deleteRule.cloneNode(true));
      document.getElementById('deleteRule').addEventListener('click', deleteSelectedRules);
    }

    if (testProxy) {
      testProxy.replaceWith(testProxy.cloneNode(true));
      document.getElementById('testProxy').addEventListener('click', () => {
        testProxyRules();
      });
    }

    if (clearProxy) {
      clearProxy.replaceWith(clearProxy.cloneNode(true));
      document.getElementById('clearProxy').addEventListener('click', () => {
        clearProxyRules();
      });
    }

    if (selectAll) {
      selectAll.replaceWith(selectAll.cloneNode(true));
      document.getElementById('selectAll').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.rule-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = e.target.checked;
          const ruleId = checkbox.dataset.ruleId;
          if (e.target.checked) {
            if (!selectedRules.includes(ruleId)) {
              selectedRules.push(ruleId);
            }
          } else {
            selectedRules = selectedRules.filter(id => id !== ruleId);
          }
        });
        updateSelectAllState();
      });
    }
    
    // 加载并显示代理配置
    loadProxyConfig();
    updateProxyUI();
    renderRuleTable();
    
    console.log('Proxy features initialized successfully');
  }
  const includeImages = document.getElementById('includeImages');
  const includeCodeBlocks = document.getElementById('includeCodeBlocks');
  const includeTables = document.getElementById('includeTables');
  const includeToc = document.getElementById('includeToc');
  
  // 当前选中的语言
  let selectedLanguage = 'zh';
  
  // 当前操作类型
  let currentOperation = null;
  
  // 添加模型相关元素
  const addModelBtn = document.getElementById('addModelBtn');
  const addModelPanel = document.getElementById('addModelPanel');
  const cancelAddModelBtn = document.getElementById('cancelAddModelBtn');
  const confirmAddModelBtn = document.getElementById('confirmAddModelBtn');
  const newModelId = document.getElementById('newModelId');
  const newModelName = document.getElementById('newModelName');
  const newModelBaseUrl = document.getElementById('newModelBaseUrl');
  const newModelApiKey = document.getElementById('newModelApiKey');
  
  // 添加高级选项元素
  const showAdvancedOptionsBtn = document.getElementById('showAdvancedOptionsBtn');
  const advancedOptionsSection = document.getElementById('advancedOptionsSection');
  const includeModelIdCheckbox = document.getElementById('includeModelIdCheckbox');
  const customModelIdValue = document.getElementById('customModelIdValue');
  
  // 自定义模型列表
  let customModels = [];
  
  // 状态管理
  const setStatus = (status, message = '') => {
    statusIndicator.className = 'status-indicator';
    
    if (status === 'loading') {
      statusIndicator.classList.add('loading');
      loadingContainer.classList.add('active');
      clearOperationTimer(); // 清除计时器
    } else {
      loadingContainer.classList.remove('active');
    }
    
    if (status === 'error') {
      statusIndicator.classList.add('error');
    }
    
    statusText.textContent = message || (status === 'loading' ? '处理中...' : '就绪');
  };
  
  // 错误显示
  const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.classList.add('active');
    setStatus('error', '发生错误');
    
    // 5秒后自动隐藏错误
    setTimeout(() => {
      errorMessage.classList.remove('active');
      setStatus('ready', '就绪');
    }, 5000);
  };

  // 通用状态显示函数
  const showStatus = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    if (type === 'error') {
      showError(message);
    } else if (type === 'success') {
      setStatus('success', message);
      // 3秒后恢复就绪状态
      setTimeout(() => {
        setStatus('ready', '就绪');
      }, 3000);
    } else if (type === 'warning') {
      setStatus('warning', message);
      // 3秒后恢复就绪状态
      setTimeout(() => {
        setStatus('ready', '就绪');
      }, 3000);
    } else {
      setStatus('ready', message);
    }
  };
  
  // 取消当前操作
  cancelOperationBtn.addEventListener('click', () => {
    // 先移除遮罩，提供即时的用户反馈
    loadingContainer.classList.remove('active');
    
    // 设置状态为准备就绪
    setStatus('ready', '操作已取消');
    
    // 清除计时器
    clearOperationTimer();
    
    // 根据当前操作类型显示取消消息
    let resultElement;
    switch (currentOperation) {
      case 'json':
        resultElement = jsonResult;
        break;
      case 'translate':
        resultElement = translateResult;
        break;
      case 'summarize':
        resultElement = summarizeResult;
        break;
    }
    
    if (resultElement) {
      resultElement.innerHTML = '<span class="result-placeholder">操作已取消</span>';
    }
    
    // 尝试取消API请求（即使这失败了，UI也会立即响应）
    try {
      deepSeekAPI.cancelCurrentRequest();
    } catch (error) {
      console.error('取消请求失败:', error);
    }
    
    // 清除当前操作状态
    currentOperation = null;
  });
  
  // 显示JSON结果，使用纯文本和pre标签
  const displayJsonResult = (jsonString) => {
    // 创建pre标签显示纯文本内容
    return `<pre class="result-content">${jsonString}</pre>`;
  };
  
  // 显示执行时间
  const displayExecutionTime = (timeElement, seconds) => {
    // 确保seconds是一个数字
    const secondsNum = typeof seconds === 'number' ? seconds : parseFloat(seconds);
    
    if (!isNaN(secondsNum)) {
      timeElement.textContent = `用时：${secondsNum.toFixed(2)}秒`;
      timeElement.style.display = 'block';
      
      // 同时更新底部状态栏的计时器
      operationTimer.textContent = `耗时：${secondsNum.toFixed(2)}秒`;
    } else {
      // 如果无法解析为数字，则显示原始值
      timeElement.textContent = `用时：${seconds}秒`;
      timeElement.style.display = 'block';
      
      // 同时更新底部状态栏的计时器
      operationTimer.textContent = `耗时：${seconds}秒`;
    }
  };
  
  // 清除底部计时器
  const clearOperationTimer = () => {
    operationTimer.textContent = '';
  };
  
  // 复制到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setStatus('ready', '已复制到剪贴板');
        setTimeout(() => {
          setStatus('ready', '就绪');
        }, 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
        showError('复制到剪贴板失败');
      });
  };
  
  // 标签页切换
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      
      // 保存当前状态
      saveCurrentInputs();
      saveCurrentResults();
      
      // 更新当前标签页状态
      localState.currentTab = tabId;
      savePersistentState();
      
      // 移除所有活动标签的active类
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // 为当前标签添加active类
      button.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      
      // 如果切换到代理tab，初始化代理功能
      if (tabId === 'proxy-tab') {
        console.log('Switched to proxy tab, initializing proxy features...');
        setTimeout(() => {
          initProxyFeatures();
        }, 100);
      }
    });
  });
  
  // 语言选择
  languageTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      languageTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedLanguage = tab.getAttribute('data-lang');
    });
  });
  
  // 头部模型选择变化时
  headerModelSelect.addEventListener('change', () => {
    const selectedModel = headerModelSelect.value;
    
    // 更新当前使用的模型
    deepSeekAPI.setModel(selectedModel);
    
    // 更新状态
    setStatus('ready', `已切换到${headerModelSelect.options[headerModelSelect.selectedIndex].text}模型`);
  });
  
  // 设置面板显示/隐藏
  settingsButton.addEventListener('click', () => {
    settingsPanel.classList.add('active');
    
    // 从存储中加载模型选择和配置
    chrome.storage.local.get(['modelConfigs', 'model'], (result) => {
      // 初始化两个模型选择下拉框
      initializeModelSelects();
      
      // 设置当前选中的模型
      if (result.model) {
        modelSelect.value = result.model;
        headerModelSelect.value = result.model;
        
        // 显示当前选中的模型名称
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (selectedOption) {
          currentModelName.textContent = selectedOption.text;
        }
        
        // 加载当前选中模型的配置
        loadModelConfig(result.model);
      } else if (headerModelSelect.options.length > 0) {
        // 如果没有选中的模型，默认选择第一个
        modelSelect.value = headerModelSelect.options[0].value;
        headerModelSelect.value = headerModelSelect.options[0].value;
        currentModelName.textContent = headerModelSelect.options[0].text;
        loadModelConfig(headerModelSelect.options[0].value);
      }
    });
  });
  
  // 取消设置
  cancelSettingsButton.addEventListener('click', () => {
    settingsPanel.classList.remove('active');
  });
  
  // 保存设置
  saveSettingsButton.addEventListener('click', () => {
    const model = modelSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const baseUrl = document.getElementById('baseUrlInput').value.trim();
    const extraParams = collectExtraParams();
    
    if (!apiKey) {
      showError('请输入有效的API密钥');
      return;
    }
    
    if (!baseUrl) {
      showError('请输入有效的接口地址');
      return;
    }
    
    // 保存API密钥
    deepSeekAPI.setApiKey(apiKey, model);
    
    // 保存接口地址
    deepSeekAPI.setBaseUrl(baseUrl, model);
    
    // 保存额外参数
    deepSeekAPI.setExtraParams(extraParams, model);
    
    // 设置当前使用的模型
    deepSeekAPI.setModel(model);
    
    // 同步头部模型选择器
    headerModelSelect.value = model;
    
    settingsPanel.classList.remove('active');
    setStatus('ready', '设置已保存');
  });
  
  // 处理从存储中获取的选中文本
  const updateSelectedText = () => {
    chrome.storage.local.get(['lastSelectedText', 'translate', 'summarize', 'convert-json'], (result) => {
      const loadTextForAction = (action, element) => {
        if (result[action]) {
          const textElement = element.querySelector('.selected-text-placeholder');
          if (textElement) {
            element.removeChild(textElement);
          }
          element.textContent = result[action];
          chrome.storage.local.remove(action);
        }
      };
      
      if (result.translate) {
        loadTextForAction('translate', translateInput);
        // 自动切换到翻译标签
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        document.querySelector('[data-tab="translate-tab"]').classList.add('active');
        document.getElementById('translate-tab').classList.add('active');
      }
      
      if (result.summarize) {
        loadTextForAction('summarize', summarizeInput);
        // 自动切换到总结标签
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        document.querySelector('[data-tab="summarize-tab"]').classList.add('active');
        document.getElementById('summarize-tab').classList.add('active');
      }
      
      if (result['convert-json']) {
        jsonInput.value = result['convert-json'];
        // 自动切换到JSON标签
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        document.querySelector('[data-tab="json-tab"]').classList.add('active');
        document.getElementById('json-tab').classList.add('active');
      }
      
      // 如果有上次选中的文本，更新到当前活动的输入框
      if (result.lastSelectedText) {
        const activeTab = document.querySelector('.tab-content.active');
        
        if (activeTab.id === 'json-tab') {
          jsonInput.value = result.lastSelectedText;
        } else if (activeTab.id === 'translate-tab') {
          const textElement = translateInput.querySelector('.selected-text-placeholder');
          if (textElement) {
            translateInput.removeChild(textElement);
          }
          translateInput.textContent = result.lastSelectedText;
        } else if (activeTab.id === 'summarize-tab') {
          const textElement = summarizeInput.querySelector('.selected-text-placeholder');
          if (textElement) {
            summarizeInput.removeChild(textElement);
          }
          summarizeInput.textContent = result.lastSelectedText;
        }
      }
    });
  };
  
  // 执行翻译操作
  const executeTranslate = async (text) => {
    if (!text) {
      showError('请选择或输入要翻译的文本');
      return;
    }
    
    try {
      setStatus('loading', '正在翻译...');
      translateExecutionTime.style.display = 'none';
      currentOperation = 'translate';
      
      const result = await deepSeekAPI.translateText(text, selectedLanguage);
      
      // 应用格式化显示，保留换行
      translateResult.innerHTML = `<div class="result-content">${result.content.replace(/\n/g, '<br>')}</div>`;
      
      displayExecutionTime(translateExecutionTime, result.executionTime);
      setStatus('ready', '翻译完成');
      currentOperation = null;
    } catch (error) {
      console.error('翻译失败:', error);
      
      if (error.message === '操作已取消') {
        setStatus('ready', '翻译已取消');
        translateResult.innerHTML = '<span class="result-placeholder">翻译已取消</span>';
      } else {
        showError(`翻译失败: ${error.message}`);
        translateResult.innerHTML = '<span class="result-placeholder">翻译失败</span>';
      }
      
      translateExecutionTime.style.display = 'none';
      clearOperationTimer(); // 清除底部计时器
      currentOperation = null;
    }
  };
  
  // 执行总结操作
  const executeSummarize = async (text, isFullPage = false) => {
    if (!text && !isFullPage) {
      // 如果文本为空且不是整页模式，请求获取当前页面内容
      // 通过background脚本中转，无法直接访问当前活动的标签页
      chrome.runtime.sendMessage({
        from: 'sidepanel',
        to: 'background',
        action: 'request_page_content'
      }, response => {
        console.log('请求页面内容', response);
      });
      setStatus('loading', '正在获取页面内容...');
      return;
    }
    
    try {
      setStatus('loading', isFullPage ? '正在总结整个页面...' : '正在总结...');
      summarizeExecutionTime.style.display = 'none';
      currentOperation = 'summarize';
      
      const result = await deepSeekAPI.summarizeText(text);
      
      // 格式化总结内容，应用带有格式的显示
      const formattedContent = formatSummaryContent(result.content);
      summarizeResult.innerHTML = formattedContent;
      summarizeResult.classList.add('summary-result');
      
      displayExecutionTime(summarizeExecutionTime, result.executionTime);
      setStatus('ready', '总结完成');
      currentOperation = null;
    } catch (error) {
      console.error('总结失败:', error);
      
      if (error.message === '操作已取消') {
        setStatus('ready', '总结已取消');
        summarizeResult.innerHTML = '<span class="result-placeholder">总结已取消</span>';
      } else {
        showError(`总结失败: ${error.message}`);
        summarizeResult.innerHTML = '<span class="result-placeholder">总结失败</span>';
      }
      
      summarizeExecutionTime.style.display = 'none';
      clearOperationTimer(); // 清除底部计时器
      currentOperation = null;
    }
  };
  
  // 格式化总结内容，处理换行和基本Markdown格式
  const formatSummaryContent = (content) => {
    // 转义HTML特殊字符，防止XSS
    let escapedContent = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // 处理标题（支持 # 格式的Markdown标题）
    escapedContent = escapedContent
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    
    // 处理列表项
    escapedContent = escapedContent
      .replace(/^\- (.*?)$/gm, '<li>$1</li>')
      .replace(/^\* (.*?)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
    
    // 将连续的列表项合并到ul/ol标签中
    escapedContent = escapedContent
      .replace(/(<li>.*?<\/li>)(\s*<li>)/g, '$1$2')
      .replace(/(<li>.*?<\/li>)(\s*)(?!<li>)/g, '<ul>$1</ul>$2');
    
    // 处理段落和换行
    escapedContent = escapedContent
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    // 包装在段落标签中
    if (!escapedContent.startsWith('<h') && !escapedContent.startsWith('<ul') && !escapedContent.startsWith('<ol')) {
      escapedContent = '<p>' + escapedContent;
    }
    if (!escapedContent.endsWith('</p>') && !escapedContent.endsWith('</ul>') && !escapedContent.endsWith('</ol>')) {
      escapedContent = escapedContent + '</p>';
    }
    
    return escapedContent;
  };
  
  // 监听来自背景脚本的消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.from === 'background' && message.to === 'sidepanel') {
      // 处理错误消息
      if (message.action === 'error') {
        console.error('收到错误消息:', message.error);
        showError(message.error);
        setStatus('ready', '收到错误消息');
        return;
      }
      
      // 根据消息类型执行不同操作
      switch (message.action) {
        case 'translate':
          // 自动切换到翻译标签
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          document.querySelector('[data-tab="translate-tab"]').classList.add('active');
          document.getElementById('translate-tab').classList.add('active');
          
          // 更新选中的文本
          const translatePlaceholder = translateInput.querySelector('.selected-text-placeholder');
          if (translatePlaceholder) {
            translateInput.removeChild(translatePlaceholder);
          }
          translateInput.textContent = message.text;
          
          // 如果消息要求自动执行
          if (message.autoExecute) {
            executeTranslate(message.text);
          }
          break;
          
        case 'summarize':
          // 自动切换到总结标签
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          document.querySelector('[data-tab="summarize-tab"]').classList.add('active');
          document.getElementById('summarize-tab').classList.add('active');
          
          // 更新选中的文本
          const summarizePlaceholder = summarizeInput.querySelector('.selected-text-placeholder');
          if (summarizePlaceholder) {
            summarizeInput.removeChild(summarizePlaceholder);
          }
          summarizeInput.textContent = message.text;
          summarizeInput.setAttribute('contenteditable', 'true');
          
          // 如果消息要求自动执行或是整页内容
          if (message.autoExecute || message.isFullPage) {
            executeSummarize(message.text, message.isFullPage);
          }
          break;
          
        case 'convert-json':
          // 自动切换到JSON标签
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          document.querySelector('[data-tab="json-tab"]').classList.add('active');
          document.getElementById('json-tab').classList.add('active');
          
          // 更新输入文本
          jsonInput.value = message.text;
          break;
          
        case 'update_selection':
          // 将选中的文本更新到当前活动的标签页
          const activeTab = document.querySelector('.tab-content.active');
          
          if (activeTab.id === 'json-tab') {
            jsonInput.value = message.text;
          } else if (activeTab.id === 'translate-tab') {
            const textElement = translateInput.querySelector('.selected-text-placeholder');
            if (textElement) {
              translateInput.removeChild(textElement);
            }
            translateInput.textContent = message.text;
            translateInput.setAttribute('contenteditable', 'true');
          } else if (activeTab.id === 'summarize-tab') {
            const textElement = summarizeInput.querySelector('.selected-text-placeholder');
            if (textElement) {
              summarizeInput.removeChild(textElement);
            }
            summarizeInput.textContent = message.text;
            summarizeInput.setAttribute('contenteditable', 'true');
          }
          break;
      }
    }
  });
  
  // JSON转换功能
  convertJsonButton.addEventListener('click', async () => {
    const text = jsonInput.value.trim();
    
    if (!text) {
      showError('请输入要转换的文本');
      return;
    }
    
    try {
      setStatus('loading', '正在转换为JSON...');
      jsonExecutionTime.style.display = 'none';
      currentOperation = 'json';
      
      const result = await deepSeekAPI.convertToJson(text);
      
      jsonResult.innerHTML = displayJsonResult(result.content);
      displayExecutionTime(jsonExecutionTime, result.executionTime);
      setStatus('ready', '转换完成');
      currentOperation = null;
    } catch (error) {
      console.error('JSON转换失败:', error);
      
      if (error.message === '操作已取消') {
        setStatus('ready', 'JSON转换已取消');
        jsonResult.innerHTML = '<span class="result-placeholder">转换已取消</span>';
      } else {
        showError(`JSON转换失败: ${error.message}`);
        jsonResult.innerHTML = '<span class="result-placeholder">转换失败</span>';
      }
      
      jsonExecutionTime.style.display = 'none';
      clearOperationTimer(); // 清除底部计时器
      currentOperation = null;
    }
  });
  
  // 翻译功能
  translateButton.addEventListener('click', async () => {
    const textElement = translateInput.querySelector('.selected-text-placeholder');
    const text = textElement ? '' : translateInput.textContent.trim();
    executeTranslate(text);
  });
  
  // 总结功能
  summarizeButton.addEventListener('click', async () => {
    // 检查是否存在占位符元素
    const placeholder = summarizeInput.querySelector('.selected-text-placeholder');
    
    // 获取输入内容，如果有占位符或内容为空，则视为空
    let text = '';
    if (!placeholder) {
      text = summarizeInput.textContent.trim();
    }
    
    // 如果输入为空，请求总结当前页面
    if (!text) {
      console.log('输入为空，请求总结当前页面');
      // 获取当前活动标签页并请求页面内容
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          // 显示加载状态
          setStatus('loading', '正在获取页面内容...');
          
          // 向活动标签页发送获取内容的请求
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'get_page_content'
          }, response => {
            console.log('请求总结当前页面', response);
          });
        } else {
          // 如果没有活动标签页，显示错误
          showError('无法获取当前页面内容');
        }
      });
    } else {
      // 如果有输入内容，则执行正常的总结操作
      executeSummarize(text);
    }
  });
  
  // 复制按钮功能
  copyJsonButton.addEventListener('click', () => {
    const jsonContent = jsonResult.textContent;
    if (jsonContent && !jsonContent.includes('JSON结果将在这里显示')) {
      copyToClipboard(jsonContent);
    }
  });
  
  copyTranslateButton.addEventListener('click', () => {
    const translateContent = translateResult.textContent;
    if (translateContent && !translateContent.includes('翻译结果将在这里显示')) {
      copyToClipboard(translateContent);
    }
  });
  
  copySummarizeButton.addEventListener('click', () => {
    const summarizeContent = summarizeResult.textContent;
    if (summarizeContent && !summarizeContent.includes('总结结果将在这里显示')) {
      copyToClipboard(summarizeContent);
    }
  });
  
  // 允许在选择框中进行编辑
  translateInput.addEventListener('click', () => {
    const placeholder = translateInput.querySelector('.selected-text-placeholder');
    if (placeholder) {
      translateInput.removeChild(placeholder);
      translateInput.setAttribute('contenteditable', 'true');
      translateInput.focus();
    }
  });
  
  // 修改总结输入框的处理，确保它始终可编辑
  summarizeInput.addEventListener('click', () => {
    const placeholder = summarizeInput.querySelector('.selected-text-placeholder');
    if (placeholder) {
      summarizeInput.removeChild(placeholder);
    }
    // 即使已经设置了HTML属性，也再次确保它是可编辑的
    summarizeInput.setAttribute('contenteditable', 'true');
    summarizeInput.focus();
  });
  
  // 确保总结输入框在获得焦点时清除占位符
  summarizeInput.addEventListener('focus', () => {
    const placeholder = summarizeInput.querySelector('.selected-text-placeholder');
    if (placeholder) {
      summarizeInput.removeChild(placeholder);
    }
  });
  
  // 显示添加模型面板
  addModelBtn.addEventListener('click', () => {
    // 重置表单
    newModelId.value = '';
    newModelName.value = '';
    newModelBaseUrl.value = '';
    newModelApiKey.value = '';
    
    // 重置高级选项
    if (includeModelIdCheckbox) includeModelIdCheckbox.checked = true; // 默认选中
    if (customModelIdValue) {
      customModelIdValue.value = '';
      customModelIdValue.disabled = false; // 默认启用
    }
    if (advancedOptionsSection) advancedOptionsSection.style.display = 'none';
    
    // 显示面板
    addModelPanel.classList.add('active');
  });
  
  // 当模型ID输入变化时，提供标准ID建议
  if (newModelId) {
    newModelId.addEventListener('change', () => {
      if (includeModelIdCheckbox && customModelIdValue) {
        const modelId = newModelId.value.trim();
        if (modelId && deepSeekAPI.getSuggestedModelId) {
          const suggestedId = deepSeekAPI.getSuggestedModelId(modelId);
          if (suggestedId) {
            // 如果有建议的标准ID，自动填充到自定义model字段值
            customModelIdValue.value = suggestedId;
            
            // 如果高级选项未显示，添加提示
            if (advancedOptionsSection.style.display === 'none') {
              showAdvancedOptionsBtn.textContent = '显示高级选项 (已自动设置推荐的标准模型ID)';
              showAdvancedOptionsBtn.style.color = '#10B981';
              
              // 5秒后恢复原样
              setTimeout(() => {
                showAdvancedOptionsBtn.textContent = '显示高级选项';
                showAdvancedOptionsBtn.style.color = '';
              }, 5000);
            }
          }
        }
      }
    });
  }
  
  // 显示/隐藏高级选项
  if (showAdvancedOptionsBtn) {
    showAdvancedOptionsBtn.addEventListener('click', () => {
      if (advancedOptionsSection.style.display === 'none' || !advancedOptionsSection.style.display) {
        advancedOptionsSection.style.display = 'block';
        showAdvancedOptionsBtn.textContent = '隐藏高级选项';
      } else {
        advancedOptionsSection.style.display = 'none';
        showAdvancedOptionsBtn.textContent = '显示高级选项';
      }
    });
  }
  
  // 切换自定义模型ID输入框的可用状态
  if (includeModelIdCheckbox) {
    includeModelIdCheckbox.addEventListener('change', () => {
      customModelIdValue.disabled = !includeModelIdCheckbox.checked;
      if (!includeModelIdCheckbox.checked) {
        customModelIdValue.value = '';
      } else if (newModelId && newModelId.value.trim() && deepSeekAPI.getSuggestedModelId) {
        // 如果重新启用，尝试获取建议的模型ID
        const suggestedId = deepSeekAPI.getSuggestedModelId(newModelId.value.trim());
        if (suggestedId) {
          customModelIdValue.value = suggestedId;
        }
      }
    });
  }
  
  // 取消添加模型
  cancelAddModelBtn.addEventListener('click', () => {
    addModelPanel.classList.remove('active');
  });
  
  // 确认添加新模型
  confirmAddModelBtn.addEventListener('click', () => {
    const id = newModelId.value.trim();
    const name = newModelName.value.trim();
    const baseUrl = newModelBaseUrl.value.trim();
    const apiKey = newModelApiKey.value.trim();
    
    // 获取高级选项
    const includeModelId = includeModelIdCheckbox ? includeModelIdCheckbox.checked : false;
    const modelIdValue = customModelIdValue ? customModelIdValue.value.trim() : '';
    
    // 表单验证
    if (!id) {
      showError('请输入模型ID');
      return;
    }
    
    if (!name) {
      showError('请输入模型名称');
      return;
    }
    
    if (!baseUrl) {
      showError('请输入模型接口地址');
      return;
    }
    
    // 检查ID是否已存在
    const existingModels = deepSeekAPI.getSupportedModels();
    const allModelIds = [...existingModels.map(m => m.id), ...customModels.map(m => m.id)];
    
    if (allModelIds.includes(id)) {
      showError('模型ID已存在，请使用其他ID');
      return;
    }
    
    // 创建新模型
    const newModel = {
      id,
      name,
      defaultBaseUrl: baseUrl,
      isCustom: true
    };
    
    // 添加到自定义模型列表
    customModels.push(newModel);
    
    // 保存自定义模型到存储
    chrome.storage.local.set({ customModels }, () => {
      console.log('保存自定义模型成功');
    });
    
    // 添加到API服务中
    addCustomModelToAPI(newModel, apiKey, {
      includeModelId,
      modelIdValue
    });
    
    // 更新模型选择下拉框
    initializeModelSelects();
    
    // 隐藏面板
    addModelPanel.classList.remove('active');
    
    // 提示成功
    setStatus('ready', `已添加模型: ${name}`);
  });
  
  /**
   * 添加自定义模型到API服务
   * @param {Object} model - 模型信息对象
   * @param {string} apiKey - API密钥
   * @param {Object} advancedOptions - 高级选项
   */
  function addCustomModelToAPI(model, apiKey, advancedOptions = {}) {
    // 将自定义模型添加到DeepSeekAPI支持的模型列表中
    const baseConfigs = deepSeekAPI.modelConfigs || {};
    
    // 设置模型配置
    baseConfigs[model.id] = {
      apiKey: apiKey || '',
      baseUrl: model.defaultBaseUrl,
      extraParams: {},
      advancedOptions: advancedOptions
    };
    
    // 保存配置到本地存储
    chrome.storage.local.set({ modelConfigs: baseConfigs }, () => {
      console.log('保存模型配置成功');
    });
    
    // 设置高级选项
    if (Object.keys(advancedOptions).length > 0) {
      deepSeekAPI.setAdvancedOptions(advancedOptions, model.id);
    }
  }
  
  /**
   * 从存储加载自定义模型
   */
  function loadCustomModels() {
    chrome.storage.local.get(['customModels'], (result) => {
      if (result.customModels && Array.isArray(result.customModels)) {
        customModels = result.customModels;
        
        // 如果有自定义模型，将它们添加到API服务中
        customModels.forEach(model => {
          const config = deepSeekAPI.getModelConfig(model.id);
          addCustomModelToAPI(model, config?.apiKey || '');
        });
        
        // 初始化模型选择下拉框
        initializeModelSelects();
      }
    });
  }
  
  /**
   * 初始化模型选择下拉框
   */
  function initializeModelSelects() {
    // 清空现有选项
    while (modelSelect.firstChild) {
      modelSelect.removeChild(modelSelect.firstChild);
    }
    
    while (headerModelSelect.firstChild) {
      headerModelSelect.removeChild(headerModelSelect.firstChild);
    }
    
    // 获取支持的模型列表
    const models = deepSeekAPI.getSupportedModels();
    
    // 合并内置模型和自定义模型
    const allModels = [...models, ...customModels.filter(model => 
      !models.some(m => m.id === model.id)
    )];
    
    // 为两个下拉框添加选项
    allModels.forEach(model => {
      // 为头部选择器添加选项
      const headerOption = document.createElement('option');
      headerOption.value = model.id;
      headerOption.textContent = model.name + (model.isCustom ? ' (自定义)' : '');
      headerModelSelect.appendChild(headerOption);
      
      // 为设置面板选择器添加选项
      const settingOption = document.createElement('option');
      settingOption.value = model.id;
      settingOption.textContent = model.name + (model.isCustom ? ' (自定义)' : '');
      modelSelect.appendChild(settingOption);
    });
  }
  
  // 初始化：从存储中加载API密钥和模型
  chrome.storage.local.get(['modelConfigs', 'model'], (result) => {
    // 加载自定义模型
    loadCustomModels();
    
    // 初始化两个模型选择下拉框
    initializeModelSelects();
    
    // 设置当前选中的模型和配置
    if (result.model) {
      modelSelect.value = result.model;
      headerModelSelect.value = result.model;
      
      // 显示当前选中的模型名称
      const selectedOption = modelSelect.options[modelSelect.selectedIndex];
      if (selectedOption && currentModelName) {
        currentModelName.textContent = selectedOption.text;
      }
    }
  });
  
  // 初始化：检查是否有选中的文本
  updateSelectedText();
  
  // 确保JSON输入框为空
  jsonInput.value = '';
  
  // 使用多种方法清除JSON输入框的默认内容
  (function clearJsonInput() {
    // 立即清除
    jsonInput.value = '';
    
    // 短延时清除（防止某些浏览器行为）
    setTimeout(() => {
      jsonInput.value = '';
    }, 50);
    
    // 稍长延时清除（针对延迟加载情况）
    setTimeout(() => {
      jsonInput.value = '';
    }, 200);
    
    // 极短延时内连续多次清除（应对某些特殊情况）
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        jsonInput.value = '';
      }, i * 10);
    }
  })();
  
  // 监听JSON输入框的首次聚焦和输入事件
  jsonInput.addEventListener('focus', function clearOnFocus() {
    // 移除任何非用户输入的默认字符
    if (jsonInput.value.length === 1) {
      jsonInput.value = '';
    }
  });
  
  // 监听blur事件，防止离开输入框后又出现默认字符
  jsonInput.addEventListener('blur', () => {
    if (jsonInput.value.length === 1) {
      jsonInput.value = '';
    }
  });
  
  // 检查API密钥是否已设置
  setTimeout(() => {
    if (!deepSeekAPI.apiKey) {
      showError('请先设置DeepSeek API密钥');
      settingsPanel.classList.add('active');
    }
  }, 1000);
  
  // 初始化：隐藏计时器
  jsonExecutionTime.style.display = 'none';
  translateExecutionTime.style.display = 'none';
  summarizeExecutionTime.style.display = 'none';
  clearOperationTimer(); // 清除底部计时器
  
  // 添加模型选择变化事件
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    const selectedModelName = modelSelect.options[modelSelect.selectedIndex].text;
    currentModelName.textContent = selectedModelName;
    
    // 从存储中获取该模型的配置
    loadModelConfig(selectedModel);
  });
  
  // 重置baseUrl为默认值
  document.getElementById('resetBaseUrlBtn').addEventListener('click', () => {
    const selectedModel = modelSelect.value;
    const defaultBaseUrl = getDefaultBaseUrl(selectedModel);
    document.getElementById('baseUrlInput').value = defaultBaseUrl;
  });
  
  // 添加参数按钮点击事件
  document.getElementById('addParamBtn').addEventListener('click', () => {
    addParamRow();
  });
  
  // 加载模型配置
  function loadModelConfig(modelId) {
    chrome.storage.local.get(['modelConfigs'], (result) => {
      if (result.modelConfigs && result.modelConfigs[modelId]) {
        const config = result.modelConfigs[modelId];
        
        // 设置API密钥
        apiKeyInput.value = config.apiKey || '';
        
        // 设置接口地址
        document.getElementById('baseUrlInput').value = config.baseUrl || getDefaultBaseUrl(modelId);
        
        // 清空并添加额外参数
        const extraParamsContainer = document.getElementById('extraParamsContainer');
        extraParamsContainer.innerHTML = '';
        
        if (config.extraParams) {
          // 添加已有的参数
          for (const [key, value] of Object.entries(config.extraParams)) {
            addParamRow(key, value);
          }
        }
      } else {
        // 如果没有配置，设置为默认值
        apiKeyInput.value = '';
        document.getElementById('baseUrlInput').value = getDefaultBaseUrl(modelId);
        document.getElementById('extraParamsContainer').innerHTML = '';
      }
    });
  }
  
  // 获取默认的接口地址
  function getDefaultBaseUrl(modelId) {
    const models = deepSeekAPI.getSupportedModels();
    const model = models.find(m => m.id === modelId);
    return model ? model.defaultBaseUrl : 'https://maas-api.cn-huabei-1.xf-yun.com/v1';
  }
  
  // 添加参数行
  function addParamRow(key = '', value = '') {
    const extraParamsContainer = document.getElementById('extraParamsContainer');
    const rowId = 'param-row-' + Date.now();
    
    const paramRow = document.createElement('div');
    paramRow.className = 'param-row';
    paramRow.id = rowId;
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'param-input param-key';
    keyInput.placeholder = '参数名';
    keyInput.value = key;
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'param-input param-value';
    valueInput.placeholder = '参数值';
    valueInput.value = value;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'param-delete';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.addEventListener('click', () => {
      document.getElementById(rowId).remove();
    });
    
    paramRow.appendChild(keyInput);
    paramRow.appendChild(valueInput);
    paramRow.appendChild(deleteBtn);
    
    extraParamsContainer.appendChild(paramRow);
  }
  
  // 收集额外参数
  function collectExtraParams() {
    const extraParams = {};
    const paramRows = document.querySelectorAll('.param-row');
    
    paramRows.forEach(row => {
      const keyInput = row.querySelector('.param-key');
      const valueInput = row.querySelector('.param-value');
      
      if (keyInput && valueInput && keyInput.value.trim()) {
        let value = valueInput.value.trim();
        
        // 尝试转换数值类型
        if (!isNaN(value)) {
          value = Number(value);
        } else if (value.toLowerCase() === 'true') {
          value = true;
        } else if (value.toLowerCase() === 'false') {
          value = false;
        }
        
        extraParams[keyInput.value.trim()] = value;
      }
    });
    
    return extraParams;
  }
  
  // 显示测试数据结果，同时生成表格和JSON格式
  const displayTestData = (users) => {
    // 创建表格
    let tableHtml = `
      <table class="user-data-table">
        <thead>
          <tr>
            <th>序号</th>
            <th>姓名</th>
            <th>手机号</th>
            <th>身份证号</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    users.forEach((user, index) => {
      tableHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${user.name}</td>
          <td>${user.mobile}</td>
          <td>${user.idCard}</td>
          <td>
            <button class="reference-button" data-index="${index}" title="引用到页面">
              <i class="fas fa-file-import"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    tableHtml += `
        </tbody>
      </table>
    `;
    
    // 创建JSON格式
    const jsonStr = JSON.stringify(users, null, 2);
    const jsonHtml = `
      <div class="user-data-json">
        <pre>${jsonStr}</pre>
      </div>
    `;
    
    // 合并显示
    testDataResult.innerHTML = tableHtml + jsonHtml;
    
    // 添加引用按钮的点击事件
    const referenceButtons = testDataResult.querySelectorAll('.reference-button');
    referenceButtons.forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-index'));
        const userData = users[index];
        
        // 设置状态为处理中
        setStatus('loading', '正在引用数据到页面...');
        
        // 直接向背景脚本发送用户数据填充请求
        chrome.runtime.sendMessage({
          from: 'sidepanel', 
          action: 'fill_user_data',
          userData: userData
        }, response => {
          console.log('用户数据填充请求已发送到背景脚本', response);
          
          // 设置状态为完成
          setTimeout(() => {
            setStatus('ready', '数据已引用到页面');
          }, 1000);
        });
      });
    });
  };
  
  // 生成测试数据按钮事件
  generateTestDataButton.addEventListener('click', async () => {
    // 获取要生成的数量
    const count = parseInt(dataCountInput.value) || 10;
    
    if (count <= 0 || count > 50) {
      showError('请输入1-50之间的数量');
      return;
    }
    
    try {
      setStatus('loading', '正在生成测试数据...');
      testDataExecutionTime.style.display = 'none';
      currentOperation = 'testdata';
      
      // 生成测试数据
      const result = deepSeekAPI.generateTestUserData(count);
      
      // 显示结果
      displayTestData(result.users);
      
      // 显示执行时间
      displayExecutionTime(testDataExecutionTime, result.executionTime);
      setStatus('ready', '测试数据生成完成');
      currentOperation = null;
    } catch (error) {
      console.error('测试数据生成失败:', error);
      
      if (error.message === '操作已取消') {
        setStatus('ready', '测试数据生成已取消');
        testDataResult.innerHTML = '<span class="result-placeholder">生成已取消</span>';
      } else {
        showError(`测试数据生成失败: ${error.message}`);
        testDataResult.innerHTML = '<span class="result-placeholder">生成失败</span>';
      }
      
      testDataExecutionTime.style.display = 'none';
      currentOperation = null;
    }
  });
  
  // 复制测试数据按钮事件
  copyTestDataButton.addEventListener('click', () => {
    // 检查是否有JSON元素
    const jsonElement = testDataResult.querySelector('.user-data-json pre');
    if (jsonElement) {
      copyToClipboard(jsonElement.textContent);
    } else {
      // 如果没有JSON元素，尝试获取表格数据
      const table = testDataResult.querySelector('.user-data-table');
      if (table) {
        // 从表格中提取数据并构建JSON
        const users = [];
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 4) {
            users.push({
              name: cells[1].textContent,
              mobile: cells[2].textContent,
              idCard: cells[3].textContent
            });
          }
        });
        
        copyToClipboard(JSON.stringify(users, null, 2));
      }
    }
  });
  
  // 触发文件选择
  uploadExcelButton.addEventListener('click', () => {
    excelFileInput.click();
  });
  
  // 处理文件上传
  excelFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      showError('请上传Excel文件（.xlsx或.xls格式）');
      return;
    }
    
    setStatus('loading', '正在分析Excel文件...');
    
    try {
      // 分析Excel文件
      const result = await excelAnalyzer.analyzeExcel(file);
      
      // 添加调试日志
      console.log('Excel分析结果:', result);
      console.log('工作量数据:', result.data.workload);
      console.log('工时差异数据:', result.data.timeVariance);
      console.log('任务类型数据:', result.data.taskTypes);
      
      // 保存最后分析的数据
      excelAnalyzer.lastAnalyzedData = result.data.rawData;
      
      // 显示分析结果
      displayExcelAnalysis(result.data);
      
      // 显示导出按钮
      exportExcelButton.style.display = 'block';
      
      // 显示执行时间
      displayExecutionTime(excelExecutionTime, result.executionTime);
      
      setStatus('ready', '分析完成');
    } catch (error) {
      console.error('Excel分析失败:', error);
      showError('Excel分析失败: ' + error.message);
    }
  });
  
  // 显示Excel分析结果
  const displayExcelAnalysis = (data) => {
    console.log('开始渲染图表，数据:', data);
    
    try {
      // 确保图表容器存在
      const workloadChartElement = document.getElementById('workloadChart');
      const timeVarianceChartElement = document.getElementById('timeVarianceChart');
      const taskTypeChartElement = document.getElementById('taskTypeChart');
      
      if (!workloadChartElement || !timeVarianceChartElement || !taskTypeChartElement) {
        throw new Error('找不到图表容器元素');
      }
      
      // 重置图表容器
      workloadChartElement.innerHTML = '';
      timeVarianceChartElement.innerHTML = '';
      taskTypeChartElement.innerHTML = '';
      
      // 为每个图表创建新的canvas元素
      const workloadCanvas = document.createElement('canvas');
      const timeVarianceCanvas = document.createElement('canvas');
      const taskTypeCanvas = document.createElement('canvas');
      
      workloadChartElement.appendChild(workloadCanvas);
      timeVarianceChartElement.appendChild(timeVarianceCanvas);
      taskTypeChartElement.appendChild(taskTypeCanvas);
      
      // 销毁现有图表实例
      if (window.workloadChartInstance) {
        window.workloadChartInstance.destroy();
      }
      if (window.timeVarianceChartInstance) {
        window.timeVarianceChartInstance.destroy();
      }
      if (window.taskTypeChartInstance) {
        window.taskTypeChartInstance.destroy();
      }
      
      // 1. 工作饱和度图表
      const workloadData = {
        labels: data.workload.dates,
        datasets: data.workload.members.map(member => ({
          label: member.name,
          data: member.saturation,
          borderColor: getRandomColor(),
          fill: false,
          tension: 0.4
        }))
      };
      
      console.log('工作饱和度图表数据:', workloadData);
      
      window.workloadChartInstance = new Chart(workloadCanvas, {
        type: 'line',
        data: workloadData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 200,
              title: {
                display: true,
                text: '工作饱和度 (%)'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: '每日工作饱和度趋势'
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          }
        }
      });
      
      // 2. 工时差异图表
      const timeVarianceData = {
        labels: data.timeVariance.tasks,
        datasets: [{
          label: '预估工时',
          data: data.timeVariance.estimated,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }, {
          label: '实际工时',
          data: data.timeVariance.actual,
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      };
      
      console.log('工时差异图表数据:', timeVarianceData);
      
      window.timeVarianceChartInstance = new Chart(timeVarianceCanvas, {
        type: 'bar',
        data: timeVarianceData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '工时 (小时)'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: '任务工时预估vs实际对比'
            }
          }
        }
      });
      
      // 3. 任务类型分布图表
      const taskTypeData = {
        labels: Object.keys(data.taskTypes),
        datasets: [{
          data: Object.values(data.taskTypes),
          backgroundColor: Object.keys(data.taskTypes).map(() => getRandomColor())
        }]
      };
      
      console.log('任务类型图表数据:', taskTypeData);
      
      window.taskTypeChartInstance = new Chart(taskTypeCanvas, {
        type: 'doughnut',
        data: taskTypeData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: '任务类型分布'
            },
            legend: {
              position: 'right'
            }
          }
        }
      });
      
      // 4. 显示个人总结
      if (data.personalSummaries && data.personalSummaries.length > 0) {
        personalSummary.innerHTML = data.personalSummaries.map(summary => `
          <div class="summary-item">
            <h4>${summary.name}</h4>
            <p>${summary.content}</p>
          </div>
        `).join('');
      } else {
        personalSummary.innerHTML = '<p class="no-data">暂无个人总结数据</p>';
      }
      
    } catch (error) {
      console.error('渲染图表失败:', error);
      showError('渲染图表失败: ' + error.message);
    }
  };
  
  // 生成随机颜色
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };
  
  // 导出分析报告
  exportExcelButton.addEventListener('click', async () => {
    try {
      setStatus('loading', '正在生成报告...');
      
      // 生成报告
      const blob = await excelAnalyzer.generateReport(excelAnalyzer.lastAnalyzedData);
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '工作量分析报告.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setStatus('ready', '报告已导出');
    } catch (error) {
      console.error('导出报告失败:', error);
      showError('导出报告失败: ' + error.message);
    }
  });
  
  // MD转Word功能实现
  let mdFileName = 'document'; // 默认文件名
  let mdContent = ''; // 保存Markdown内容
  let wordBlob = null; // 保存生成的Word文档Blob
  
  // 处理MD文件上传
  uploadMdButton.addEventListener('click', () => {
    mdFileInput.click();
  });
  
  mdFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      handleMdFileUpload(file);
    }
  });
  
  // 处理MD文件上传
  const handleMdFileUpload = (file) => {
    if (file.type !== 'text/markdown' && !file.name.endsWith('.md') && !file.name.endsWith('.markdown')) {
      showError('请上传有效的Markdown文件(.md或.markdown)');
      return;
    }
    
    mdFileName = file.name.replace(/\.(md|markdown)$/, '');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      mdContent = e.target.result;
      mdInput.value = mdContent;
      
      // 显示文件名和预览
      mdConversionResult.innerHTML = `
        <div class="file-info">
          <i class="fas fa-file-alt"></i> ${file.name} (${(file.size / 1024).toFixed(2)} KB)
        </div>
        <div class="md-preview">
          ${marked.parse(mdContent.substring(0, 500))}
          ${mdContent.length > 500 ? '...' : ''}
        </div>
      `;
      
      // 显示下载按钮
      downloadWordButton.style.display = 'none';
    };
    
    reader.onerror = () => {
      showError('读取文件时发生错误');
    };
    
    reader.readAsText(file);
  };
  
  // 转换按钮处理
  convertMdButton.addEventListener('click', async () => {
    // 获取输入内容
    const content = mdInput.value.trim() || mdContent;
    
    if (!content) {
      showError('请输入Markdown内容或上传Markdown文件');
      return;
    }
    
    await executeMdConversion(content);
  });
  
  // 执行MD到Word的转换
  const executeMdConversion = async (content) => {
    try {
      // 开始计时
      const startTime = performance.now();
      
      // 设置状态为加载
      setStatus('loading', '正在转换为Word文档...');
      
      // 获取转换选项
      const options = {
        includeImages: includeImages.checked,
        includeCodeBlocks: includeCodeBlocks.checked,
        includeTables: includeTables.checked,
        includeToc: includeToc.checked
      };
      
      // 创建进度条
      mdConversionResult.innerHTML = `
        <div class="conversion-status">正在转换为Word文档...</div>
        <div class="md-progress">
          <div class="md-progress-bar" id="mdProgressBar"></div>
        </div>
      `;
      
      // 模拟进度条
      const progressBar = document.getElementById('mdProgressBar');
      const progressInterval = setInterval(() => {
        const currentWidth = parseFloat(progressBar.style.width || '0');
        if (currentWidth < 90) {
          progressBar.style.width = (currentWidth + Math.random() * 5) + '%';
        }
      }, 200);
      
      // 使用DeepSeek API进行转换（如果需要）
      if (options.includeImages || options.includeTables) {
        // 这里可以添加调用DeepSeek API的代码
      }
      
      // 使用简化方法生成Word文档
      wordBlob = await generateWordDocument(content, options);
      
      // 清除进度条定时器
      clearInterval(progressInterval);
      
      // 计算执行时间
      const endTime = performance.now();
      const executionTimeSeconds = (endTime - startTime) / 1000;
      
      // 显示执行时间
      displayExecutionTime(mdExecutionTime, executionTimeSeconds);
      
      // 显示成功消息
      mdConversionResult.innerHTML = `
        <div class="success-message">
          <i class="fas fa-check-circle"></i> Word文档生成成功!
        </div>
        <div class="file-info">
          <i class="fas fa-file-word"></i> ${mdFileName}.docx (准备下载)
        </div>
      `;
      
      // 显示下载按钮
      downloadWordButton.style.display = 'block';
      
      // 设置状态为就绪
      setStatus('ready', '转换完成');
      
    } catch (error) {
      console.error('MD转Word错误:', error);
      showError('转换过程中发生错误: ' + error.message);
      setStatus('error', '转换失败');
    }
  };
  
  // 生成Word文档
  const generateWordDocument = async (markdownContent, options) => {
    try {
      // 使用marked.js解析Markdown为HTML
      const html = marked.parse(markdownContent);
      
      // 创建完整的HTML文档
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${mdFileName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 2cm;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1em;
              margin-bottom: 0.5em;
              color: #333;
            }
            pre {
              background-color: #f5f5f5;
              padding: 1em;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
            }
            blockquote {
              border-left: 4px solid #ccc;
              padding-left: 1em;
              color: #666;
              font-style: italic;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;
      
      // 创建Blob
      const blob = new Blob([fullHtml], { type: 'application/msword' });
      
      return blob;
    } catch (error) {
      console.error('生成Word文档时出错:', error);
      throw error;
    }
  };
  
  // 下载Word文档
  downloadWordButton.addEventListener('click', () => {
    if (wordBlob) {
      try {
        saveAs(wordBlob, `${mdFileName}.docx`);
      } catch (error) {
        console.error('下载文件时出错:', error);
        showError('下载文件时出错: ' + error.message);
      }
    }
  });
  
  // 清空MD输入
  mdInput.addEventListener('focus', function() {
    if (this.value === '') {
      const placeholder = this.closest('.input-area').querySelector('.selected-text-placeholder');
      if (placeholder) {
        placeholder.style.display = 'none';
      }
    }
  });
  
  mdInput.addEventListener('blur', function() {
    if (this.value === '') {
      const placeholder = this.closest('.input-area').querySelector('.selected-text-placeholder');
      if (placeholder) {
        placeholder.style.display = 'block';
      }
    }
  });

  // ==================== 代理功能 ====================

  // 代理配置数据
  let proxyConfig = {
    isRuleUse: false,
    interceptUrl: '/gateway/',
    proxyIp: '',
    proxyEnable: true,
    ruleTableData: []
  };

  // 选中的规则行
  let selectedRules = [];

  // 加载代理配置
  function loadProxyConfig() {
    chrome.storage.local.get('proxyConfig', (result) => {
      if (result.proxyConfig) {
        proxyConfig = { ...proxyConfig, ...result.proxyConfig };
        updateProxyUI();
        renderRuleTable();
      }
    });
  }

  // 保存代理配置
  function saveProxyConfigData() {
    console.log('Saving proxy config:', proxyConfig);
    chrome.storage.local.set({ proxyConfig }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        showStatus('代理配置保存失败', 'error');
        return;
      }
      
      showStatus('代理配置已保存，正在应用...', 'info');
      
      // 发送消息给background script更新代理设置
      chrome.runtime.sendMessage({
        action: 'updateProxyConfig',
        config: proxyConfig
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message sending error:', chrome.runtime.lastError);
          showStatus('代理配置应用失败：' + chrome.runtime.lastError.message, 'error');
          return;
        }
        
        if (response && response.success) {
          console.log('Proxy config updated successfully in background');
          showStatus('代理配置已保存并生效', 'success');
        } else {
          console.error('Failed to update proxy config in background, response:', response);
          showStatus('代理配置应用失败', 'error');
        }
      });
    });
  }

  // 更新UI
  function updateProxyUI() {
    if (interceptUrl) interceptUrl.value = proxyConfig.interceptUrl;
    if (isRuleUse) isRuleUse.checked = proxyConfig.isRuleUse;
    if (proxyIp) proxyIp.value = proxyConfig.proxyIp;
    if (proxyEnable) proxyEnable.checked = proxyConfig.proxyEnable;
  }

  // 生成UUID
  function generateUUID() {
    return 'xxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 渲染规则表格
  function renderRuleTable() {
    if (!ruleTableBody) return;
    
    ruleTableBody.innerHTML = '';
    
    proxyConfig.ruleTableData.forEach((rule, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <input type="checkbox" data-rule-id="${rule.id}" class="rule-checkbox">
        </td>
        <td>
          <input type="text" value="${rule.beforeStr || ''}" 
                 class="rule-before" data-index="${index}" 
                 placeholder="匹配前的字符串">
        </td>
        <td>
          <input type="text" value="${rule.afterStr || ''}" 
                 class="rule-after" data-index="${index}" 
                 placeholder="替换后的字符串">
        </td>
        <td style="text-align: center;">
          <input type="checkbox" ${rule.isUse ? 'checked' : ''} 
                 class="rule-use" data-index="${index}">
        </td>
      `;
      ruleTableBody.appendChild(row);
    });

    // 绑定输入事件
    bindRuleInputEvents();
  }

  // 绑定规则输入事件
  function bindRuleInputEvents() {
    // 绑定匹配前输入
    document.querySelectorAll('.rule-before').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (proxyConfig.ruleTableData[index]) {
          proxyConfig.ruleTableData[index].beforeStr = e.target.value;
        }
      });
    });

    // 绑定匹配后输入
    document.querySelectorAll('.rule-after').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (proxyConfig.ruleTableData[index]) {
          proxyConfig.ruleTableData[index].afterStr = e.target.value;
        }
      });
    });

    // 绑定应用状态
    document.querySelectorAll('.rule-use').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        if (proxyConfig.ruleTableData[index]) {
          proxyConfig.ruleTableData[index].isUse = e.target.checked;
        }
      });
    });

    // 绑定规则选择
    document.querySelectorAll('.rule-checkbox').forEach(input => {
      input.addEventListener('change', (e) => {
        const ruleId = e.target.dataset.ruleId;
        if (e.target.checked) {
          if (!selectedRules.includes(ruleId)) {
            selectedRules.push(ruleId);
          }
        } else {
          selectedRules = selectedRules.filter(id => id !== ruleId);
        }
        updateSelectAllState();
      });
    });
  }

  // 更新全选状态
  function updateSelectAllState() {
    if (selectAll) {
      const totalRules = proxyConfig.ruleTableData.length;
      selectAll.checked = totalRules > 0 && selectedRules.length === totalRules;
      selectAll.indeterminate = selectedRules.length > 0 && selectedRules.length < totalRules;
    }
  }

  // 添加新规则
  function addNewRule() {
    const newRule = {
      id: generateUUID(),
      beforeStr: '',
      afterStr: '',
      isUse: true
    };
    proxyConfig.ruleTableData.push(newRule);
    renderRuleTable();
    
    // 注释：移除自动保存，改为手动点击保存按钮生效
    showStatus('已添加新规则，请点击保存按钮应用配置', 'info');
  }

  // 删除选中规则
  function deleteSelectedRules() {
    if (selectedRules.length === 0) {
      showStatus('请选择要删除的规则', 'warning');
      return;
    }

    const deletedCount = selectedRules.length;
    proxyConfig.ruleTableData = proxyConfig.ruleTableData.filter(
      rule => !selectedRules.includes(rule.id)
    );
    selectedRules = [];
    renderRuleTable();
    
    // 注释：移除自动保存，改为手动点击保存按钮生效
    showStatus(`已删除 ${deletedCount} 条规则，请点击保存按钮应用配置`, 'info');
  }

  // 测试代理规则
  function testProxyRules() {
    console.log('Testing proxy rules...');
    console.log('=== Current Proxy Configuration ===');
    console.log('Intercept URL:', proxyConfig.interceptUrl);
    console.log('Rule Use:', proxyConfig.isRuleUse);
    console.log('Proxy Enable:', proxyConfig.proxyEnable);
    console.log('Proxy IP:', proxyConfig.proxyIp);
    console.log('Number of rules:', proxyConfig.ruleTableData.length);
    
    proxyConfig.ruleTableData.forEach((rule, index) => {
      console.log(`Rule ${index + 1}:`, {
        isUse: rule.isUse,
        beforeStr: rule.beforeStr,
        afterStr: rule.afterStr,
        id: rule.id
      });
    });
    
    // 发送测试消息给background
    chrome.runtime.sendMessage({
      action: 'testProxyRules',
      config: proxyConfig
    }, (response) => {
      if (response && response.success) {
        showStatus('代理规则测试完成，请查看控制台日志', 'success');
      } else {
        showStatus('代理规则测试失败', 'error');
      }
    });
    
    // 模拟测试多个URL
    const testUrls = [
      'http://172.29.249.4:8001/gateway/haic-c-clinical/v1/pt/clinical/outpatient/reception/searchVisitPatients',
      'http://172.29.249.4:8001/gateway/haic-c-material/v1/some/api/endpoint',
      'http://172.29.249.4:8001/gateway/haic-c-basic/v1/another/api/endpoint'
    ];
    console.log('Test URLs:', testUrls);
    
    // 检查规则匹配
    proxyConfig.ruleTableData.forEach((rule, index) => {
      if (rule.isUse && rule.beforeStr && rule.afterStr) {
        console.log(`Testing Rule ${index + 1}: ${rule.beforeStr} -> ${rule.afterStr}`);
        
        testUrls.forEach(testUrl => {
          if (testUrl.includes(rule.beforeStr)) {
            const newUrl = testUrl.replace(rule.beforeStr, rule.afterStr);
            console.log(`  ✓ URL matches: ${testUrl}`);
            console.log(`  → Redirects to: ${newUrl}`);
          } else {
            console.log(`  ✗ URL does not match: ${testUrl}`);
          }
        });
      }
    });
  }

  // 清除代理规则
  function clearProxyRules() {
    if (confirm('确定要清除所有代理规则吗？这将停止所有当前的URL重定向。')) {
      chrome.runtime.sendMessage({
        action: 'clearProxyRules'
      }, (response) => {
        if (response && response.success) {
          showStatus(`已清除 ${response.clearedRules} 条代理规则`, 'success');
          console.log('Proxy rules cleared successfully');
        } else {
          showStatus('清除代理规则失败', 'error');
          console.error('Failed to clear proxy rules:', response?.error);
        }
      });
    }
  }

  // 代理相关事件监听器
  // 代理相关事件监听器已移至 initProxyFeatures 函数中
  // 这些监听器将在用户切换到代理tab时自动绑定

  // ==================== 代理功能结束 ====================

  // ==================== 版本采集功能开始 ====================

  // 服务配置列表
  const versionServices = [
    { name: 'HAIC-C-CLINICAL', appId: '3240', description: '临床业务中台' },
    { name: 'HAIC-C-SETTLEMENT', appId: '1722', description: '结算数据中台' },
    { name: 'HAIC-C-MATERIAL', appId: '1587', description: '物资数据中台' },
    { name: 'HAIC-C-BASIC', appId: '2156', description: '基础数据中台' },
    { name: 'HAIC-C-INSURANCE', appId: '2188', description: '医保业务中台' },
    { name: 'HAIC-C-DATA-ANALYSIS', appId: '', description: '数据分析服务' },
    { name: 'HAIC-INTERFACE', appId: '1699', description: '三方接口' },
    { name: 'HAIC-F-OUTPATIENT-IMA', appId: '1477', description: '基层一体化业务前台-1477' },
    { name: 'HAIC-F-OUTPATIENT-IMA', appId: '1448', description: '基层一体化业务前台-1448' },
    { name: 'HAIC-F-OUTPATIENT-OWS', appId: '1265', description: '工作站前台' },
    { name: 'HAIC-F-SETTLEMENT', appId: '1003', description: '结算数据前台' }
  ];

  // 初始化版本采集功能
  function initVersionFeatures() {
    console.log('=== Initializing Version Collection Features ===');

    const serviceList = document.getElementById('serviceList');
    const collectVersionButton = document.getElementById('collectVersionButton');
    const copyVersionButton = document.getElementById('copyVersionButton');
    const branchInput = document.getElementById('branchInput');
    const versionResult = document.getElementById('versionResult');

    if (!serviceList || !collectVersionButton) {
      console.error('Version collection elements not found');
      return;
    }

    // 渲染服务列表
    renderServiceList(serviceList);

    // 从存储恢复分支名
    chrome.storage.local.get(['lastBranchName'], (result) => {
      if (result.lastBranchName && branchInput) {
        branchInput.value = result.lastBranchName;
      }
    });

    // 绑定采集按钮事件
    collectVersionButton.addEventListener('click', () => {
      collectVersions();
    });

    // 绑定复制按钮事件
    if (copyVersionButton) {
      copyVersionButton.addEventListener('click', () => {
        copyVersionResults();
      });
    }

    console.log('Version collection features initialized');
  }

  // 渲染服务列表
  function renderServiceList(container) {
    container.innerHTML = '';

    versionServices.forEach((service, index) => {
      const serviceItem = document.createElement('div');
      serviceItem.className = 'service-item';
      serviceItem.innerHTML = `
        <input type="checkbox" id="service-${index}" checked ${!service.appId ? 'disabled' : ''}>
        <span class="service-name">${service.name}</span>
        <span class="service-id">${service.appId || '未配置'}</span>
      `;
      container.appendChild(serviceItem);
    });
  }

  // 采集版本号 - 通过 background.js 在 DevOps 标签页上下文中 fetch
  async function collectVersions() {
    const branchInput = document.getElementById('branchInput');
    const projectIdInput = document.getElementById('projectIdInput');
    const versionResult = document.getElementById('versionResult');
    const versionExecutionTime = document.getElementById('versionExecutionTime');

    const branchName = branchInput?.value?.trim();
    const projectId = projectIdInput?.value?.trim();

    if (!branchName) {
      setStatus('error', '请输入分支名称');
      return;
    }

    if (!projectId) {
      setStatus('error', '请输入项目ID');
      return;
    }

    // 保存分支名到存储
    chrome.storage.local.set({ lastBranchName: branchName });

    // 获取选中的服务
    const selectedServices = [];
    versionServices.forEach((service, index) => {
      const checkbox = document.getElementById(`service-${index}`);
      if (checkbox && checkbox.checked && service.appId) {
        selectedServices.push(service);
      }
    });

    if (selectedServices.length === 0) {
      setStatus('error', '请至少选择一个服务');
      return;
    }

    // 显示加载状态
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) loadingContainer.classList.add('active');
    setStatus('loading', '正在采集版本...');
    const startTime = Date.now();

    // 显示进度
    versionResult.innerHTML = '<div class="collect-progress">正在采集版本号，请确保浏览器已登录 DevOps 平台...<br><span class="current-service">准备中...</span></div>';

    // 使用新的批量采集方式
    try {
      // 先显示各服务状态
      const updateProgress = (serviceName, index) => {
        const progressEl = versionResult.querySelector('.current-service');
        if (progressEl) {
          progressEl.textContent = `${serviceName} (${index + 1}/${selectedServices.length})`;
        }
      };

      // 发送批量采集请求到 background.js
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'batchFetchVersions',
          projectId: projectId,
          branchName: branchName,
          services: selectedServices.map(s => ({ name: s.name, appId: s.appId }))
        }, (resp) => {
          resolve(resp);
        });
      });

      let results = [];
      if (response && response.success && response.data) {
        results = response.data;
      } else {
        // 批量采集失败，回退到逐个采集
        console.log('批量采集失败，尝试逐个采集:', response?.error);
        for (let i = 0; i < selectedServices.length; i++) {
          const service = selectedServices[i];
          updateProgress(service.name, i);

          try {
            const result = await fetchServiceVersion(projectId, service.appId, branchName, service.name);
            results.push(result);
          } catch (error) {
            results.push({
              serviceName: service.name,
              appId: service.appId,
              status: 'error',
              error: error.message,
              version: null,
              branch: branchName
            });
          }
        }
      }

      // 显示结果
      renderVersionResults(results, versionResult);

      // 显示耗时
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      if (versionExecutionTime) {
        versionExecutionTime.textContent = `耗时: ${duration}秒`;
      }

      if (loadingContainer) loadingContainer.classList.remove('active');
      setStatus('ready', '采集完成');
    } catch (error) {
      console.error('版本采集出错:', error);
      versionResult.innerHTML = `<div class="collect-progress" style="color: #ff6b6b;">采集出错: ${error.message}</div>`;
      if (loadingContainer) loadingContainer.classList.remove('active');
      setStatus('error', '采集失败');
    }
  }

  // 从标签页获取版本号
  function getVersionFromTab(tabId, branchName, serviceName, appId) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'getVersionFromTab',
        tabId: tabId,
        branchName: branchName,
        serviceName: serviceName,
        appId: appId
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || '获取版本失败'));
        }
      });
    });
  }

  // 获取单个服务的版本号（通过 API）
  function fetchServiceVersion(projectId, appId, branchName, serviceName) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'fetchBuildHistory',
        projectId: projectId,
        appId: appId,
        branchName: branchName,
        serviceName: serviceName
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || '获取版本失败'));
        }
      });
    });
  }

  // 渲染版本采集结果
  function renderVersionResults(results, container) {
    container.innerHTML = '';

    results.forEach(result => {
      const resultItem = document.createElement('div');
      let statusClass = 'success';
      let versionText = result.version || '';
      let versionClass = '';

      if (result.status === 'error') {
        statusClass = 'error';
        versionText = '获取失败';
        versionClass = 'error';
      } else if (result.status === 'no-record') {
        statusClass = 'no-record';
        versionText = '无构建记录';
        versionClass = 'no-record';
      } else if (result.status === 'no-tab') {
        statusClass = 'no-record';
        versionText = '未打开页面';
        versionClass = 'no-record';
      }

      resultItem.className = `version-result-item ${statusClass}`;
      resultItem.innerHTML = `
        <div class="version-service-info">
          <div class="version-service-name">${result.serviceName}</div>
          <div class="version-service-branch">${result.branch || ''}</div>
        </div>
        <div class="version-number ${versionClass}">${versionText}</div>
      `;

      container.appendChild(resultItem);
    });
  }

  // 复制版本结果
  function copyVersionResults() {
    const versionResult = document.getElementById('versionResult');
    const items = versionResult.querySelectorAll('.version-result-item');

    if (items.length === 0) {
      setStatus('error', '没有可复制的内容');
      return;
    }

    let text = '服务版本采集结果:\n';
    text += '='.repeat(40) + '\n';

    items.forEach(item => {
      const name = item.querySelector('.version-service-name')?.textContent || '';
      const version = item.querySelector('.version-number')?.textContent || '';
      text += `${name}: ${version}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setStatus('success', '已复制到剪贴板');
      setTimeout(() => setStatus('ready', '就绪'), 2000);
    }).catch(err => {
      setStatus('error', '复制失败');
      console.error('Copy failed:', err);
    });
  }

  // 在tab切换时初始化版本采集功能
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      if (tabId === 'version-tab') {
        // 延迟初始化，确保DOM已渲染
        setTimeout(initVersionFeatures, 100);
      }
    });
  });

  // ==================== 版本采集功能结束 ====================

  // 启动定期保存和输入监听
  startPeriodicSave();
  addInputChangeListeners();
  
  // 最终初始化完成，移除初始化状态并设置为就绪
  document.body.classList.remove('initializing');
  setStatus('ready', '就绪');
}; 