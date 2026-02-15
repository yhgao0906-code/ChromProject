/**
 * 宇航工具箱 - 内容脚本
 * @description 负责获取用户在页面上选中的文本内容以及填充表单数据
 */

// 检查页面是否加载完毕
let isPageReady = document.readyState === 'complete';

// 如果页面尚未加载完毕，等待加载完成
if (!isPageReady) {
  window.addEventListener('load', () => {
    isPageReady = true;
  });
}

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('内容脚本收到消息:', message);

  // DevOps 相关消息由专门的监听器处理，这里不响应
  if (message.action === 'getDevOpsBuildData' || message.action === 'getAllBuildRecords') {
    // 返回 false 表示不处理这个消息，让其他监听器处理
    return false;
  }

  // 立即响应消息接收（仅对非 DevOps 消息）
  sendResponse({ received: true });

  // 如果是请求获取整个页面内容
  if (message.action === 'get_page_content') {
    // 确保页面已加载
    if (!isPageReady) {
      console.log('页面尚未加载完成，等待加载...');
      setTimeout(() => processGetPageContent(), 500);
    } else {
      processGetPageContent();
    }
    return true;
  }
  
  // 如果是填充用户数据的请求
  if (message.action === 'fill_user_data' && message.userData) {
    console.log('收到填充用户数据请求:', message.userData);
    try {
      fillUserData(message.userData);
      // 发送消息给背景脚本，表示已处理用户数据
      chrome.runtime.sendMessage({
        from: 'content',
        action: 'user_data_filled',
        success: true
      });
    } catch (error) {
      console.error('填充用户数据时出错:', error);
      chrome.runtime.sendMessage({
        from: 'content',
        action: 'error',
        error: '填充用户数据失败: ' + error.message
      });
    }
    return true;
  }
  
  // 如果消息中已包含文本，则直接使用
  if (message.text) {
    chrome.storage.local.set({
      [message.action]: message.text
    });
    
    // 通知侧边栏直接执行操作
    chrome.runtime.sendMessage({
      from: 'content',
      action: message.action,
      selectedText: message.text,
      autoExecute: true
    });
  }
  
  // 返回true以支持异步响应
  return true;
});

// 监听用户选择文本事件
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  
  // 如果有选中文本，则发送到背景脚本
  if (selectedText) {
    // 将选中文本发送到background脚本，明确指定action为update_selection
    chrome.runtime.sendMessage({
      from: 'content',
      action: 'update_selection',
      selectedText: selectedText
    }, response => {
      // 可选: 处理响应
      console.log('选中文本已发送', response);
    });
    
    // 存储最近选择的文本
    chrome.storage.local.set({
      lastSelectedText: selectedText
    });
  }
});

// 为页面添加右键菜单上下文
document.addEventListener('contextmenu', () => {
  const selectedText = window.getSelection().toString().trim();
  
  // 如果有选中文本，设置插件状态
  if (selectedText) {
    chrome.runtime.sendMessage({
      from: 'content',
      action: 'update_selection',
      selectedText: selectedText
    }, response => {
      // 可选: 处理响应
      console.log('右键菜单选中文本已发送', response);
    });
  }
});

/**
 * 填充用户数据到页面表单
 * @param {Object} userData - 用户数据对象，包含name、mobile和idCard字段
 */
function fillUserData(userData) {
  console.log('开始填充用户数据:', userData);
  
  // 初始化调试信息
  const debugInfo = {
    userData: userData,
    logs: [],
    matchResult: {
      name: false, 
      idCard: false, 
      phone: false
    }
  };
  
  debugInfo.logs.push('开始填充用户数据');
  
  try {
    // 显示填充提示
    showFillNotification();
    
    // 立即尝试填充表单
    const result = fillFormFields(userData, debugInfo);
    if (result) {
      debugInfo.logs.push('成功填充表单数据');
      // 注意：成功填充的情况下，调试面板的显示已在fillFormFields中处理
      return;
    }
    
    // 如果立即填充失败，延迟尝试（等待可能的动态加载）
    debugInfo.logs.push('首次尝试未成功，将延迟重试...');
    // 显示调试面板，因为第一次尝试已经失败
    showDebugPanel(debugInfo);
    
    // 使用递增延迟尝试多次填充
    const delayTimes = [500, 1000, 2000]; 
    let attemptCount = 0;
    
    const attemptWithDelay = () => {
      if (attemptCount >= delayTimes.length) {
        debugInfo.logs.push(`已尝试 ${attemptCount} 次，仍未成功`);
        showDebugPanel(debugInfo);
        return;
      }
      
      const delay = delayTimes[attemptCount++];
      debugInfo.logs.push(`延迟 ${delay}ms 后进行第 ${attemptCount} 次尝试...`);
      
      setTimeout(() => {
        const result = fillFormFields(userData, debugInfo);
        if (result) {
          debugInfo.logs.push(`第 ${attemptCount} 次延迟尝试成功填充表单`);
          // 注意：fillFormFields会根据填充结果决定是否显示调试面板
        } else {
          attemptWithDelay(); // 如果仍然失败，继续尝试下一个延迟
        }
      }, delay);
    };
    
    attemptWithDelay();
  } catch (error) {
    console.error('填充用户数据时出错:', error);
    
    // 更新调试信息
    debugInfo.error = error.message;
    debugInfo.logs.push(`出错: ${error.message}`);
    showDebugPanel(debugInfo);
    
    // 发送错误消息
    chrome.runtime.sendMessage({
      from: 'content',
      action: 'error',
      error: '填充用户数据失败: ' + error.message
    });
  }
}

/**
 * 填充表单字段
 * @param {Object} userData - 用户数据
 * @param {Object} debugInfo - 调试信息
 * @returns {boolean} 是否成功填充
 */
function fillFormFields(userData, debugInfo) {
  debugInfo.logs.push('尝试基于Vue组件结构精确填充表单...');
  
  try {
    // 定位并填充表单字段
    const isNameFilled = fillPatientName(userData.name, debugInfo);
    const isIdCardFilled = fillIdCard(userData.idCard, debugInfo);
    const isPhoneFilled = fillPhoneNumber(userData.mobile, debugInfo);
    
    // 更新匹配结果
    debugInfo.matchResult.name = isNameFilled;
    debugInfo.matchResult.idCard = isIdCardFilled;
    debugInfo.matchResult.phone = isPhoneFilled;
    
    // 计算是否所有字段都填充成功
    const allFieldsFilled = isNameFilled && isIdCardFilled && isPhoneFilled;
    
    // 仅当字段填充不完全时，才显示调试面板
    if (!allFieldsFilled) {
      debugInfo.logs.push('部分字段填充失败，显示调试面板');
      showDebugPanel(debugInfo);
    } else {
      debugInfo.logs.push('所有字段填充成功');
      // 成功时可以显示简短的成功提示，而不是调试面板
      showSuccessNotification();
    }
    
    return isNameFilled || isIdCardFilled || isPhoneFilled;
  } catch (error) {
    debugInfo.logs.push(`填充表单出错: ${error.message}`);
    showDebugPanel(debugInfo);
    return false;
  }
}

/**
 * 填充患者姓名
 * @param {string} name - 患者姓名
 * @param {Object} debugInfo - 调试信息
 * @returns {boolean} 是否成功填充
 */
function fillPatientName(name, debugInfo) {
  debugInfo.logs.push('尝试填充患者姓名...');
  
  // 1. 通过精确的prop属性查找患者姓名字段
  const nameFormItem = document.querySelector('.el-form-item[prop="patientName"]');
  if (nameFormItem) {
    debugInfo.logs.push('找到患者姓名表单项');
    
    // 查找输入框 - 使用Vue组件中的类名结构
    const nameInput = nameFormItem.querySelector('input.el-input__inner');
    if (nameInput) {
      debugInfo.logs.push('找到患者姓名输入框');
      simulateTyping(nameInput, name);
      return true;
    }
  }
  
  // 2. 备用方法：通过标签文本查找
  const nameLabels = Array.from(document.querySelectorAll('label.el-form-item__label')).filter(
    label => label.textContent.includes('患者姓名')
  );
  
  if (nameLabels.length > 0) {
    debugInfo.logs.push('通过标签文本找到患者姓名字段');
    const formItem = nameLabels[0].closest('.el-form-item');
    if (formItem) {
      const input = formItem.querySelector('input.el-input__inner');
      if (input) {
        debugInfo.logs.push('填充患者姓名输入框');
        simulateTyping(input, name);
        return true;
      }
    }
  }
  
  debugInfo.logs.push('未找到患者姓名输入框');
  return false;
}

/**
 * 填充身份证号码
 * @param {string} idCard - 身份证号码
 * @param {Object} debugInfo - 调试信息
 * @returns {boolean} 是否成功填充
 */
function fillIdCard(idCard, debugInfo) {
  debugInfo.logs.push('尝试填充身份证号...');
  
  // 1. 精确定位：通过identityNo属性查找
  const idCardFormItem = document.querySelector('.el-form-item[prop="identityNo"]');
  if (idCardFormItem) {
    debugInfo.logs.push('找到证件类型/证件号码表单项');
    
    // 查找identity-type容器
    const identityTypeDiv = idCardFormItem.querySelector('.identity-type');
    if (identityTypeDiv) {
      // 查找identity-type__identity容器
      const identityTypeInnerDiv = identityTypeDiv.querySelector('.identity-type__identity');
      if (identityTypeInnerDiv) {
        // 获取所有输入框
        const inputs = identityTypeInnerDiv.querySelectorAll('input.el-input__inner');
        // 查找非下拉框的输入框（身份证号输入框）
        const idCardInput = Array.from(inputs).find(input => 
          !input.closest('.el-select') && 
          !input.closest('[role="combobox"]')
        );
        
        if (idCardInput) {
          debugInfo.logs.push('找到证件号码输入框');
          simulateTyping(idCardInput, idCard);
          return true;
        }
      }
    }
  }
  
  // 2. 备用方法：通过标签定位
  const idTypeLabels = Array.from(document.querySelectorAll('label.el-form-item__label')).filter(
    label => label.textContent.includes('证件类型')
  );
  
  if (idTypeLabels.length > 0) {
    debugInfo.logs.push('通过证件类型标签找到身份证字段');
    const formItem = idTypeLabels[0].closest('.el-form-item');
    if (formItem) {
      // 找到非下拉框的输入元素
      const allInputs = formItem.querySelectorAll('input.el-input__inner');
      const nonSelectInputs = Array.from(allInputs).filter(input => 
        !input.closest('.el-select') && 
        !input.closest('[role="combobox"]')
      );
      
      if (nonSelectInputs.length > 0) {
        debugInfo.logs.push('找到身份证号输入框');
        simulateTyping(nonSelectInputs[0], idCard);
        return true;
      }
    }
  }
  
  debugInfo.logs.push('未找到身份证号输入框');
  return false;
}

/**
 * 填充电话号码
 * @param {string} phone - 电话号码
 * @param {Object} debugInfo - 调试信息
 * @returns {boolean} 是否成功填充
 */
function fillPhoneNumber(phone, debugInfo) {
  debugInfo.logs.push('尝试填充电话号码...');
  
  // 1. 精确方法：检查可能的电话字段属性名
  const phoneProps = ['phoneNo', 'mobile', 'contactPhone', 'phone', 'telephoneNo'];
  for (const prop of phoneProps) {
    const phoneFormItem = document.querySelector(`.el-form-item[prop="${prop}"]`);
    if (phoneFormItem) {
      debugInfo.logs.push(`找到电话表单项 [prop="${prop}"]`);
      const phoneInput = phoneFormItem.querySelector('input.el-input__inner');
      if (phoneInput) {
        debugInfo.logs.push('找到电话输入框');
        simulateTyping(phoneInput, phone);
        return true;
      }
    }
  }
  
  // 2. 备用方法：查找本人电话标签
  const phoneLabels = Array.from(document.querySelectorAll('label.el-form-item__label')).filter(
    label => label.textContent.includes('本人电话') || 
             label.textContent.includes('联系电话') || 
             label.textContent.includes('手机号码') ||
             label.textContent.includes('电话')
  );
  
  if (phoneLabels.length > 0) {
    debugInfo.logs.push('通过标签文本找到电话字段');
    const formItem = phoneLabels[0].closest('.el-form-item');
    if (formItem) {
      const input = formItem.querySelector('input.el-input__inner');
      if (input) {
        debugInfo.logs.push('填充电话输入框');
        simulateTyping(input, phone);
        return true;
      }
    }
  }
  
  debugInfo.logs.push('未找到电话输入框');
  return false;
}

/**
 * 模拟用户输入文本
 * @param {Element} element - 要填充的元素
 * @param {string} text - 要输入的文本
 */
function simulateTyping(element, text) {
  console.log('模拟输入:', element, text);
  
  // 1. 直接设置值
  element.value = text;
  
  // 2. 触发标准DOM事件
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  
  // 3. 尝试处理Vue绑定
  if (element.hasAttribute('data-v') || element.className.includes('el-input__inner')) {
    console.log('检测到Vue绑定元素，应用额外处理');
    
    // 创建焦点事件，可以帮助激活Vue的v-model绑定
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    
    // 尝试设置element.__vue__模型的值（如果存在）
    if (element.__vue__) {
      try {
        // 更新Vue实例的model属性
        element.__vue__.$emit('input', text);
        element.__vue__.$emit('change', text);
      } catch (err) {
        console.log('Vue实例操作失败:', err);
      }
    }
    
    // 模拟键盘事件
    const chars = text.split('');
    if (chars.length > 0) {
      // 先清空当前值
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 然后一个字符一个字符地"输入"
      let currentText = '';
      for (let i = 0; i < chars.length; i++) {
        currentText += chars[i];
        element.value = currentText;
        
        // 触发键盘事件
        const keyEvent = new KeyboardEvent('keydown', {
          key: chars[i],
          code: `Key${chars[i].toUpperCase()}`,
          bubbles: true
        });
        element.dispatchEvent(keyEvent);
        
        // 触发输入事件
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // 最后触发blur事件完成输入
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }
}

/**
 * 显示填充通知
 */
function showFillNotification() {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #3B82F6;
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    font-family: Arial, sans-serif;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s, transform 0.3s;
  `;
  notification.textContent = '正在填充用户数据...';
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 触发动画显示
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 2秒后自动移除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 等待动画完成后移除元素
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

/**
 * 显示填充成功的通知
 */
function showSuccessNotification() {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #10B981;
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    font-family: Arial, sans-serif;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s, transform 0.3s;
  `;
  notification.textContent = '✓ 用户数据填充成功';
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 触发动画显示
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 2秒后自动移除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 等待动画完成后移除元素
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

/**
 * 显示详细的调试信息面板
 * @param {Object} debug - 调试信息对象
 */
function showDebugPanel(debug) {
  console.log('显示调试面板', debug);
  
  try {
    // 移除现有的调试面板
    const existingPanel = document.getElementById('yuhang-debug-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    // 创建调试面板
    const panel = document.createElement('div');
    panel.id = 'yuhang-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.85);
      color: #00FF00;
      padding: 15px;
      border-radius: 5px;
      z-index: 999999;
      font-family: monospace;
      font-size: 12px;
      max-width: 80%;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    `;
    
    // 创建标题
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #FFF;
      display: flex;
      justify-content: space-between;
    `;
    title.innerHTML = `
      <span>宇航工具箱调试面板 (v1.0.0)</span>
      <span style="cursor:pointer" id="close-debug">×</span>
    `;
    panel.appendChild(title);
    
    // 添加用户数据填充状态
    if (debug.userData) {
      const userDataInfo = document.createElement('div');
      userDataInfo.style.cssText = `margin-bottom: 10px; padding: 5px; background-color: rgba(255,255,255,0.1);`;
      userDataInfo.innerHTML = `
        <div>用户数据:</div>
        <div>- 姓名: ${debug.userData.name}</div>
        <div>- 手机: ${debug.userData.mobile}</div>
        <div>- 身份证: ${debug.userData.idCard}</div>
      `;
      panel.appendChild(userDataInfo);
    }
    
    // 添加匹配结果信息
    if (debug.matchResult) {
      const matchInfo = document.createElement('div');
      matchInfo.style.cssText = `margin-bottom: 10px;`;
      matchInfo.innerHTML = `
        <div>匹配结果:</div>
        <div>- 姓名字段: <span style="color:${debug.matchResult.name ? '#00FF00' : '#FF0000'}">${debug.matchResult.name ? '已找到' : '未找到'}</span></div>
        <div>- 身份证字段: <span style="color:${debug.matchResult.idCard ? '#00FF00' : '#FF0000'}">${debug.matchResult.idCard ? '已找到' : '未找到'}</span></div>
        <div>- 电话字段: <span style="color:${debug.matchResult.phone ? '#00FF00' : '#FF0000'}">${debug.matchResult.phone ? '已找到' : '未找到'}</span></div>
      `;
      panel.appendChild(matchInfo);
    }
    
    // 添加错误信息
    if (debug.error) {
      const errorInfo = document.createElement('div');
      errorInfo.style.cssText = `
        margin-top: 10px;
        color: #FF6347;
        padding: 5px;
        background-color: rgba(255, 99, 71, 0.2);
      `;
      errorInfo.innerHTML = `<div>错误信息: ${debug.error}</div>`;
      panel.appendChild(errorInfo);
    }
    
    // 添加日志信息
    if (debug.logs && debug.logs.length) {
      const logsInfo = document.createElement('div');
      logsInfo.style.cssText = `
        margin-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.2);
        padding-top: 10px;
      `;
      
      const logsTitle = document.createElement('div');
      logsTitle.textContent = '操作日志:';
      logsTitle.style.marginBottom = '5px';
      logsInfo.appendChild(logsTitle);
      
      const logsList = document.createElement('div');
      logsList.style.cssText = `
        max-height: 150px;
        overflow: auto;
        font-size: 11px;
        padding: 5px;
        background-color: rgba(0,0,0,0.3);
      `;
      
      debug.logs.forEach((log, index) => {
        const logItem = document.createElement('div');
        logItem.style.cssText = `
          margin-bottom: 3px;
          border-bottom: 1px dotted rgba(255,255,255,0.1);
          padding-bottom: 3px;
        `;
        logItem.innerHTML = `<span style="color:#999">[${index+1}]</span> ${log}`;
        logsList.appendChild(logItem);
      });
      
      logsInfo.appendChild(logsList);
      panel.appendChild(logsInfo);
    }
    
    // 添加关闭按钮功能
    document.body.appendChild(panel);
    console.log('调试面板已添加到页面');
    
    document.getElementById('close-debug').addEventListener('click', () => {
      panel.remove();
    });
    
    // 添加拖动功能
    makeDraggable(panel, title);
    
    // 60秒后自动关闭
    setTimeout(() => {
      if (document.body.contains(panel)) {
        panel.remove();
      }
    }, 60000);
  } catch (error) {
    console.error('显示调试面板时出错:', error);
  }
}

/**
 * 使元素可拖动
 * @param {Element} element - 要使可拖动的元素
 * @param {Element} handle - 拖动的手柄元素
 */
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.style.cursor = 'move';
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // 获取鼠标位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // 鼠标移动时调用函数
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // 计算新位置
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // 设置元素的新位置
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // 停止移动
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

/**
 * 处理获取页面内容的请求
 */
function processGetPageContent() {
  console.log('正在获取页面内容...');
  try {
    // 获取标题
    const pageTitle = document.title || '无标题页面';
    
    // 获取页面的主要内容
    let mainContent = '';
    
    // 尝试获取文章主体内容
    const articleContent = document.querySelector('article');
    const mainElement = document.querySelector('main');
    const contentElement = document.querySelector('#content, .content, [role="main"]');
    
    if (articleContent) {
      mainContent = articleContent.innerText;
    } else if (mainElement) {
      mainContent = mainElement.innerText;
    } else if (contentElement) {
      mainContent = contentElement.innerText;
    } else {
      // 如果没有明确的内容区域，使用body内容但过滤掉导航、页脚等
      const bodyText = document.body.innerText;
      // 获取body文本并排除常见的导航和页脚区域
      const excludeSelectors = 'nav, header, footer, .nav, .header, .footer, .menu, .sidebar, #nav, #header, #footer';
      const excludeElements = document.querySelectorAll(excludeSelectors);
      
      // 如果找到了需要排除的元素，从body文本中去除它们
      if (excludeElements.length > 0) {
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = document.body.innerHTML;
        
        excludeElements.forEach(el => {
          const tempEl = tempDiv.querySelector(`#${el.id}, .${el.className}`);
          if (tempEl) tempEl.remove();
        });
        
        mainContent = tempDiv.innerText;
        tempDiv = null; // 释放内存
      } else {
        // 如果没有找到需要排除的元素，使用body全文
        mainContent = bodyText;
      }
    }
    
    // 格式化内容，限制长度防止过大
    mainContent = mainContent.trim().substring(0, 50000); // 限制为前50000个字符
    
    // 组合内容
    const content = `标题：${pageTitle}\n\n${mainContent}`;
    
    console.log('获取到页面内容，长度：', content.length);
    
    // 发送消息到背景脚本
    chrome.runtime.sendMessage({
      from: 'content',
      action: 'summarize',
      selectedText: content,
      isFullPage: true
    });
  } catch (error) {
    console.error('获取页面内容时出错:', error);
    // 发送错误消息
    chrome.runtime.sendMessage({
      from: 'content',
      action: 'error',
      error: '获取页面内容失败: ' + error.message
    });
  }
}

// ==================== DevOps 版本采集功能 ====================

/**
 * 检查当前页面是否是 DevOps 构建历史页面
 */
function isDevOpsBuildHistoryPage() {
  const url = window.location.href;
  console.log('[DEBUG] 当前URL:', url);

  // 检查是否是 DevOps 平台
  const isDevOps = url.includes('console.devops.iflytek.com') || url.includes('devops.iflytek.com');

  // 检查是否是构建历史页面（支持多种可能的 URL 路径）
  const isBuildHistory = url.includes('buildhistory') ||
                         url.includes('bulidhistory') ||  // 兼容可能的拼写
                         url.includes('build-history') ||
                         url.includes('操作历史') ||
                         // 检查页面内容来判断
                         document.querySelector('.ant-table-tbody') !== null ||
                         document.body.innerText.includes('操作历史列表') ||
                         document.body.innerText.includes('版本号');

  console.log('[DEBUG] isDevOps:', isDevOps, 'isBuildHistory:', isBuildHistory);

  // 只要是 DevOps 平台且有表格数据就尝试获取
  return isDevOps || isBuildHistory;
}

/**
 * 从 DevOps 构建历史页面获取版本数据
 * @param {string} branchName - 要查找的分支名称
 */
function getDevOpsBuildData(branchName) {
  try {
    const results = [];

    // 尝试多种方式获取表格数据
    let rows = [];

    // 方式1: Ant Design 表格 (多种选择器)
    rows = document.querySelectorAll('.ant-table-tbody tr');
    console.log('[DEBUG] 方式1 (ant-table-tbody tr) 找到行数:', rows.length);

    if (rows.length === 0) {
      rows = document.querySelectorAll('.ant-table-row');
      console.log('[DEBUG] 方式1b (ant-table-row) 找到行数:', rows.length);
    }

    if (rows.length === 0) {
      rows = document.querySelectorAll('.ant-table tbody tr');
      console.log('[DEBUG] 方式1c (ant-table tbody tr) 找到行数:', rows.length);
    }

    // 方式2: 普通表格
    if (rows.length === 0) {
      rows = document.querySelectorAll('table tbody tr');
      console.log('[DEBUG] 方式2 (table tbody tr) 找到行数:', rows.length);
    }

    // 方式3: Element UI 表格
    if (rows.length === 0) {
      rows = document.querySelectorAll('.el-table__body tr, .el-table__body-wrapper tr');
      console.log('[DEBUG] 方式3 (Element UI) 找到行数:', rows.length);
    }

    // 方式4: 直接查找所有 tr（最宽松）
    if (rows.length === 0) {
      rows = document.querySelectorAll('tr');
      console.log('[DEBUG] 方式4 (所有 tr) 找到行数:', rows.length);
    }

    console.log('[DEBUG] 最终找到表格行数:', rows.length);
    console.log('[DEBUG] 要匹配的分支名:', branchName);

    // 打印页面上的所有表格结构用于调试
    const allTables = document.querySelectorAll('table');
    console.log('[DEBUG] 页面上的表格数量:', allTables.length);
    allTables.forEach((table, i) => {
      console.log(`[DEBUG] 表格 ${i} class:`, table.className);
      const tbodyRows = table.querySelectorAll('tbody tr');
      console.log(`[DEBUG] 表格 ${i} tbody 行数:`, tbodyRows.length);
    });

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        // 打印前3行的内容用于调试
        if (index < 3) {
          console.log(`[DEBUG] 行 ${index} 单元格数:`, cells.length);
          for (let i = 0; i < Math.min(cells.length, 5); i++) {
            console.log(`[DEBUG] 行 ${index} 列 ${i}:`, cells[i]?.textContent?.trim()?.substring(0, 50));
          }
        }

        // 根据截图，列顺序是: 版本号, 分支, 提交, 开始时间, 耗时, 执行者, 状态, 操作
        const version = cells[0]?.textContent?.trim() || '';
        const branch = cells[1]?.textContent?.trim() || '';
        const commit = cells[2]?.textContent?.trim() || '';
        const buildTime = cells[3]?.textContent?.trim() || '';
        const status = cells[6]?.textContent?.trim() || '';

        // 如果分支匹配（支持部分匹配）
        if (branch && branchName) {
          const branchLower = branch.toLowerCase();
          const searchLower = branchName.toLowerCase();

          if (branchLower.includes(searchLower) || searchLower.includes(branchLower)) {
            console.log('[DEBUG] 找到匹配的记录! 版本:', version, '分支:', branch);
            results.push({
              version: version,
              branch: branch,
              commit: commit,
              buildTime: buildTime,
              status: status,
              rowIndex: index
            });
          }
        }
      }
    });

    console.log('[DEBUG] 匹配到的记录数:', results.length);
    return results;
  } catch (error) {
    console.error('获取 DevOps 构建数据失败:', error);
    return [];
  }
}

/**
 * 获取当前页面的所有构建记录
 */
function getAllBuildRecords() {
  try {
    const records = [];
    
    let rows = document.querySelectorAll('.ant-table-tbody tr, .ant-table-row, table tbody tr, .el-table__body tr');

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const version = cells[0]?.textContent?.trim() || '';
        const branch = cells[1]?.textContent?.trim() || '';
        const commit = cells[2]?.textContent?.trim() || '';
        const buildTime = cells[3]?.textContent?.trim() || '';
        const status = cells[6]?.textContent?.trim() || '';

        if (version && branch) {
          records.push({
            version,
            branch,
            commit,
            buildTime,
            status
          });
        }
      }
    });

    return records;
  } catch (error) {
    console.error('获取构建记录失败:', error);
    return [];
  }
}

// 监听来自背景脚本的 DevOps 数据采集请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 在所有消息处理之前添加调试日志
  console.log('[DEBUG] Content script 收到消息:', message.action, message);

  // 获取指定分支的构建数据
  if (message.action === 'getDevOpsBuildData') {
    console.log('[DEBUG] 收到 DevOps 数据采集请求, 分支:', message.branchName);

    const isValidPage = isDevOpsBuildHistoryPage();
    console.log('[DEBUG] 页面验证结果:', isValidPage);

    if (!isValidPage) {
      console.log('[DEBUG] 当前页面不是 DevOps 构建历史页面，返回错误');
      sendResponse({
        success: false,
        error: '当前页面不是 DevOps 构建历史页面'
      });
      return true;
    }

    const results = getDevOpsBuildData(message.branchName);
    console.log('[DEBUG] 采集结果:', results);
    sendResponse({
      success: true,
      data: results,
      url: window.location.href
    });
    return true;
  }

  // 获取当前页面所有构建记录
  if (message.action === 'getAllBuildRecords') {
    console.log('收到获取所有构建记录请求');
    
    if (!isDevOpsBuildHistoryPage()) {
      sendResponse({
        success: false,
        error: '当前页面不是 DevOps 构建历史页面'
      });
      return true;
    }

    const records = getAllBuildRecords();
    sendResponse({
      success: true,
      data: records,
      url: window.location.href
    });
    return true;
  }

  return true;
});

// 如果当前是 DevOps 页面，自动通知侧边栏
if (isDevOpsBuildHistoryPage()) {
  console.log('检测到 DevOps 构建历史页面');
  
  // 等待页面数据加载完成
  setTimeout(() => {
    chrome.runtime.sendMessage({
      from: 'content',
      action: 'devops_page_detected',
      url: window.location.href
    });
  }, 1000);
}
