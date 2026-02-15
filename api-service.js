/**
 * 宇航工具箱 - DeepSeek API 服务
 * @description 负责与DeepSeek API交互，提供转JSON、翻译和总结功能
 */

class DeepSeekAPI {
  /**
   * 获取支持的模型列表
   * @returns {Array} 支持的模型列表，包含id和名称
   */
  static getSupportedModels() {
    // 返回内置模型列表
    const builtinModels = [
      { id: 'xdeepseekv3', name: 'DeepSeek V3', defaultBaseUrl: 'https://maas-api.cn-huabei-1.xf-yun.com/v1', type: 'default' },
      { id: 'xsparklitepatch', name: '讯飞星火轻量', defaultBaseUrl: 'https://maas-api.cn-huabei-1.xf-yun.com/v1', type: 'spark' }
    ];

    return builtinModels;
  }
  
  /**
   * 实例方法：获取支持的模型列表，包括自定义模型
   * @returns {Array} 所有支持的模型列表
   */
  getSupportedModels() {
    // 获取内置模型
    const builtinModels = DeepSeekAPI.getSupportedModels();
    
    // 合并自定义模型（如果有）
    let allModels = [...builtinModels];
    
    // 如果实例中有自定义模型，添加到结果中
    if (Array.isArray(this.customModels) && this.customModels.length > 0) {
      allModels = [...allModels, ...this.customModels];
    }
    
    return allModels;
  }

  constructor() {
    // 用于存储每个模型的完整配置
    this.modelConfigs = {};
    
    // 默认API Key
    this.apiKey = 'sk-RHHDcs4JzaZf0ms93e0f8e8dAf0f42998f74A435Dc699687';
    // 默认接口地址
    this.baseUrl = 'https://maas-api.cn-huabei-1.xf-yun.com/v1';
    // 当前使用的模型
    this.model = 'xdeepseekv3';
    
    // 自定义模型列表
    this.customModels = [];
    
    // 当前活动的AbortController，用于取消请求
    this.currentAbortController = null;
    
    // 初始化默认配置
    this.initializeDefaultConfigs();
    
    // 预配置星火和DeepSeek模型
    this.preConfigureModels();
    
    // 从存储中获取模型配置和当前选中的模型
    chrome.storage.local.get(['modelConfigs', 'model', 'apiKeys', 'customModels'], (result) => {
      // 兼容旧版apiKeys
      if (result.apiKeys && !result.modelConfigs) {
        this.migrateFromApiKeys(result.apiKeys);
      }
      
      if (result.modelConfigs) {
        this.modelConfigs = result.modelConfigs;
        
        // 设置当前模型的apiKey和基本URL，保持向后兼容
        if (result.model && this.modelConfigs[result.model]) {
          const config = this.modelConfigs[result.model];
          this.apiKey = config.apiKey || '';
          this.baseUrl = config.baseUrl || this.getDefaultBaseUrl(result.model);
        }
      }
      
      // 加载自定义模型配置
      if (result.customModels && Array.isArray(result.customModels)) {
        // 保存自定义模型到实例中
        this.customModels = result.customModels;
        
        // 确保自定义模型有配置
        result.customModels.forEach(model => {
          if (!this.modelConfigs[model.id]) {
            this.modelConfigs[model.id] = {
              apiKey: '',
              baseUrl: model.defaultBaseUrl,
              extraParams: {}
            };
          }
        });
        
        // 保存到存储，确保模型配置始终是最新的
        chrome.storage.local.set({ modelConfigs: this.modelConfigs });
      }
      
      if (result.model) {
        this.model = result.model;
      }
    });
  }
  
  /**
   * 预配置星火和DeepSeek模型
   */
  preConfigureModels() {
    // 配置DeepSeek模型
    this.modelConfigs['xdeepseekv3'] = {
      apiKey: 'sk-RHHDcs4JzaZf0ms93e0f8e8dAf0f42998f74A435Dc699687',
      baseUrl: 'https://maas-api.cn-huabei-1.xf-yun.com/v1',
      extraParams: {}
    };
    
    // 配置星火轻量模型
    this.modelConfigs['xsparklitepatch'] = {
      apiKey: 'sk-RHHDcs4JzaZf0ms93e0f8e8dAf0f42998f74A435Dc699687',
      baseUrl: 'https://maas-api.cn-huabei-1.xf-yun.com/v1',
      extraParams: {}
    };
    
    // 保存配置到存储
    chrome.storage.local.set({ 
      modelConfigs: this.modelConfigs,
      model: 'xdeepseekv3' // 默认使用DeepSeek模型
    });
  }
  
  /**
   * 初始化所有支持模型的默认配置
   */
  initializeDefaultConfigs() {
    const models = this.getSupportedModels();
    models.forEach(model => {
      if (!this.modelConfigs[model.id]) {
        this.modelConfigs[model.id] = {
          apiKey: '',
          baseUrl: model.defaultBaseUrl,
          extraParams: {}
        };
      }
    });
    
    // 加载自定义模型
    chrome.storage.local.get(['customModels'], (result) => {
      if (result.customModels && Array.isArray(result.customModels)) {
        // 更新实例的自定义模型
        this.customModels = result.customModels;
        
        result.customModels.forEach(model => {
          if (!this.modelConfigs[model.id]) {
            this.modelConfigs[model.id] = {
              apiKey: '',
              baseUrl: model.defaultBaseUrl,
              extraParams: {}
            };
          }
        });
      }
    });
  }
  
  /**
   * 迁移旧版本的apiKeys到新的配置结构
   * @param {Object} apiKeys - 旧版本的apiKeys对象
   */
  migrateFromApiKeys(apiKeys) {
    const models = DeepSeekAPI.getSupportedModels();
    models.forEach(model => {
      this.modelConfigs[model.id] = {
        apiKey: apiKeys[model.id] || '',
        baseUrl: model.defaultBaseUrl,
        extraParams: {}
      };
    });
    
    // 保存到存储
    chrome.storage.local.set({ modelConfigs: this.modelConfigs });
  }
  
  /**
   * 获取模型默认的基本URL
   * @param {string} modelId - 模型ID
   * @returns {string} 默认的基本URL
   */
  getDefaultBaseUrl(modelId) {
    const models = this.getSupportedModels();
    const model = models.find(m => m.id === modelId);
    return model ? model.defaultBaseUrl : 'https://maas-api.cn-huabei-1.xf-yun.com/v1';
  }
  
  /**
   * 设置API密钥
   * @param {string} apiKey - API密钥
   * @param {string} modelId - 模型ID，如果不指定则使用当前模型
   */
  setApiKey(apiKey, modelId = null) {
    const targetModel = modelId || this.model;
    
    if (!this.modelConfigs[targetModel]) {
      this.modelConfigs[targetModel] = {
        apiKey: '',
        baseUrl: this.getDefaultBaseUrl(targetModel),
        extraParams: {}
      };
    }
    
    // 更新配置
    this.modelConfigs[targetModel].apiKey = apiKey;
    
    // 如果是当前模型，也更新默认apiKey
    if (targetModel === this.model) {
      this.apiKey = apiKey;
    }
    
    // 保存到存储
    chrome.storage.local.set({ modelConfigs: this.modelConfigs });
  }
  
  /**
   * 获取特定模型的API密钥
   * @param {string} modelId - 模型ID
   * @returns {string} 该模型的API密钥
   */
  getApiKey(modelId = null) {
    const targetModel = modelId || this.model;
    return this.modelConfigs[targetModel]?.apiKey || '';
  }
  
  /**
   * 设置模型
   * @param {string} model - 要使用的模型名称
   */
  setModel(model) {
    this.model = model;
    
    // 更新当前配置
    const config = this.getModelConfig(model);
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || this.getDefaultBaseUrl(model);
    
    chrome.storage.local.set({ model });
  }
  
  /**
   * 取消当前正在进行的请求
   * @returns {boolean} 是否成功取消
   */
  cancelCurrentRequest() {
    if (this.currentAbortController) {
      try {
        console.log('正在取消API请求...');
        this.currentAbortController.abort();
        console.log('API请求已取消');
        this.currentAbortController = null;
        return true;
      } catch (error) {
        console.error('取消API请求失败:', error);
        this.currentAbortController = null;
        return false;
      }
    } else {
      console.log('没有正在进行的请求可以取消');
      return false;
    }
  }
  
  /**
   * 发送请求到DeepSeek API
   * @param {Array} messages - 消息数组
   * @param {Object} options - 其他选项
   * @returns {Promise} API响应与执行时间
   */
  async callApi(messages, options = {}) {
    // 获取当前模型的配置
    const config = this.getModelConfig(this.model);
    
    if (!config.apiKey) {
      throw new Error(`请先为模型'${this.model}'设置API密钥`);
    }
    
    if (!config.baseUrl) {
      throw new Error(`模型'${this.model}'的API接口地址未设置`);
    }
    
    // 如果有正在进行的请求，先取消
    this.cancelCurrentRequest();
    
    // 创建新的AbortController
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;
    
    const startTime = Date.now();
    
    try {
      // 合并额外参数
      const mergedOptions = { ...options, ...config.extraParams };
      
      // 检查是否为自定义模型（不在内置模型列表中）
      const builtinModels = DeepSeekAPI.getSupportedModels();
      const isCustomModel = !builtinModels.some(m => m.id === this.model);
      
      // 获取高级选项
      const advancedOptions = this.getAdvancedOptions(this.model);
      
      // 构建请求体
      let requestBody;
      if (isCustomModel) {
        // 默认情况下，对于自定义模型，不指定model字段
        console.log(`使用自定义模型 ${this.model}`);
        
        // 根据高级选项决定是否包含model字段及其值
        if (advancedOptions && advancedOptions.includeModelId === false) {
          // 如果明确设置了不包含model字段
          console.log(`根据高级设置，不在请求中包含model字段`);
          requestBody = {
            messages: messages,
            ...mergedOptions
          };
        } else {
          // 默认或明确设置了包含model字段
          let modelValue;
          
          // 特殊模型ID处理
          if (this.model.includes('qwen') || this.model.includes('通义千问')) {
            // 千问模型的标准ID格式
            modelValue = advancedOptions && advancedOptions.modelIdValue 
              ? advancedOptions.modelIdValue 
              : this.getStandardModelId(this.model);
          } else {
            modelValue = (advancedOptions && advancedOptions.modelIdValue) 
              ? advancedOptions.modelIdValue 
              : this.model;
          }
          
          console.log(`在请求中包含model字段，值为: ${modelValue}`);
          requestBody = {
            model: modelValue,
            messages: messages,
            ...mergedOptions
          };
        }
      } else {
        // 对于内置模型，正常包含model字段
        requestBody = {
          model: this.model,
          messages: messages,
          ...mergedOptions
        };
      }
      
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal // 传递signal以支持取消
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.error?.message || response.statusText;
        
        // 处理特定类型的错误，提供更友好的错误信息
        if (errorMsg.includes('令牌无权') || errorMsg.includes('token') && errorMsg.includes('not authorized')) {
          if (isCustomModel) {
            throw new Error(`API错误: 您的API密钥没有权限访问此自定义模型。请检查：
1. 您的API密钥是否正确
2. 您的API密钥是否有权限访问此模型
3. 模型ID设置：请在高级选项中设置正确的模型ID值(目前使用: ${requestBody.model || '未指定'})
4. 您也可以尝试不同的接口地址`);
          } else {
            throw new Error(`API错误: ${errorMsg}。请检查您的API密钥是否有权限访问此模型。`);
          }
        }
        
        // 处理URL错误
        if (errorMsg.includes('not found') || response.status === 404) {
          throw new Error(`API错误: 无法连接到API接口，请检查接口URL是否正确。${errorMsg}`);
        }
        
        // 默认错误消息
        throw new Error(`API错误: ${errorMsg}`);
      }
      
      const result = await response.json();
      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000; // 转换为秒
      
      // 请求完成后清除AbortController引用
      this.currentAbortController = null;
      
      return { 
        ...result, 
        executionTime 
      };
    } catch (error) {
      // 请求失败后清除AbortController引用
      this.currentAbortController = null;
      
      // 区分是取消错误还是其他错误
      if (error.name === 'AbortError') {
        throw new Error('操作已取消');
      }
      
      console.error('API请求失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取标准模型ID
   * @param {string} customModelId - 自定义模型ID
   * @returns {string} 标准化的模型ID
   */
  getStandardModelId(customModelId) {
    const customId = customModelId.toLowerCase();
    
    // 针对不同类型的模型返回标准ID
    if (customId.includes('qwen') || customId.includes('千问')) {
      // 千问模型标准ID
      if (customId.includes('turbo')) {
        return 'qwen-turbo';
      }
      if (customId.includes('plus')) {
        return 'qwen-plus';
      }
      if (customId.includes('max')) {
        return 'qwen-max';
      }
      if (customId.includes('1.5')) {
        return 'qwen-1.5';
      }
      if (customId.includes('72b')) {
        return 'qwen-72b';
      }
      // 默认返回turbo
      return 'qwen-turbo';
    }
    
    // 智谱AI
    if (customId.includes('glm') || customId.includes('chatglm')) {
      if (customId.includes('turbo')) {
        return 'glm-3-turbo';
      }
      if (customId.includes('pro')) {
        return 'glm-4';
      }
      if (customId.includes('4v')) {
        return 'glm-4v';
      }
      if (customId.includes('4')) {
        return 'glm-4';
      }
      return 'glm-3-turbo';
    }
    
    // 百度文心
    if (customId.includes('wenxin') || customId.includes('ernie') || customId.includes('文心')) {
      if (customId.includes('turbo')) {
        return 'ernie-bot-turbo';
      }
      if (customId.includes('8k')) {
        return 'ernie-bot-8k';
      }
      return 'ernie-bot';
    }
    
    // 通用模型ID识别
    if (customId.includes('gpt-4') || customId.includes('gpt4')) {
      if (customId.includes('turbo')) {
        return 'gpt-4-turbo-preview';
      }
      if (customId.includes('vision') || customId.includes('v')) {
        return 'gpt-4-vision-preview';
      }
      return 'gpt-4';
    }
    
    if (customId.includes('gpt-3.5') || customId.includes('gpt3.5')) {
      return 'gpt-3.5-turbo';
    }
    
    if (customId.includes('claude')) {
      if (customId.includes('haiku')) {
        return 'claude-3-haiku-20240307';
      }
      if (customId.includes('sonnet')) {
        return 'claude-3-sonnet-20240229';
      }
      if (customId.includes('opus')) {
        return 'claude-3-opus-20240229';
      }
      return 'claude-3-haiku-20240307';
    }
    
    // 其他模型返回原始ID
    return customModelId;
  }
  
  /**
   * 获取自定义模型ID的建议值
   * @param {string} customModelId - 自定义模型ID
   * @returns {string|null} 建议的模型ID值，如果没有建议则返回null
   */
  getSuggestedModelId(customModelId) {
    const standardId = this.getStandardModelId(customModelId);
    if (standardId !== customModelId) {
      return standardId;
    }
    return null;
  }
  
  /**
   * 将Java对象格式的文本转换为JSON格式（本地转换，不调用API）
   * @param {string} text - Java对象格式的文本
   * @returns {Object} 转换结果和执行时间
   */
  convertJavaObjectToJson(text) {
    const startTime = Date.now();
    
    try {
      // 清理输入文本，移除首尾空白
      let cleanText = text.trim();
      
      // 检查是否是数组格式（以[开头，以]结尾）
      const isArray = cleanText.startsWith('[') && cleanText.endsWith(']');
      
      if (isArray) {
        // 移除外层的方括号
        cleanText = cleanText.slice(1, -1).trim();
      }
      
      // 解析单个对象或多个对象
      const objects = this.parseJavaObjects(cleanText);
      
      // 转换为JSON格式
      let result;
      if (isArray) {
        result = objects;
      } else {
        result = objects.length === 1 ? objects[0] : objects;
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        content: JSON.stringify(result, null, 2),
        executionTime: executionTime
      };
    } catch (error) {
      console.error('Java对象转JSON失败:', error);
      throw new Error(`转换失败: ${error.message}`);
    }
  }
  
  /**
   * 解析Java对象字符串为JavaScript对象数组
   * @param {string} text - Java对象字符串
   * @returns {Array} 解析后的对象数组
   */
  parseJavaObjects(text) {
    const objects = [];
    
    // 分割多个对象（通过类名识别）
    const objectStrings = this.splitJavaObjects(text);
    
    for (const objStr of objectStrings) {
      if (objStr.trim()) {
        const obj = this.parseJavaObject(objStr);
        if (obj) {
          objects.push(obj);
        }
      }
    }
    
    return objects;
  }
  
  /**
   * 分割多个Java对象
   * @param {string} text - 包含多个Java对象的文本
   * @returns {Array} 单个对象字符串数组
   */
  splitJavaObjects(text) {
    const objects = [];
    let currentObject = '';
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';
      
      if (escapeNext) {
        currentObject += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        currentObject += char;
        continue;
      }
      
      if (char === '"' || char === "'") {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '(' || char === '[') {
          depth++;
        } else if (char === ')' || char === ']') {
          depth--;
        }
      }
      
      currentObject += char;
      
      // 如果遇到对象结束且depth为0，则认为一个对象结束
      if (!inString && depth === 0 && char === ')') {
        // 检查后面是否有逗号或其他对象
        let nextNonSpace = i + 1;
        while (nextNonSpace < text.length && /\s/.test(text[nextNonSpace])) {
          nextNonSpace++;
        }
        
        if (nextNonSpace < text.length && text[nextNonSpace] === ',') {
          objects.push(currentObject);
          currentObject = '';
          i = nextNonSpace; // 跳过逗号
        }
      }
    }
    
    // 添加最后一个对象
    if (currentObject.trim()) {
      objects.push(currentObject);
    }
    
    return objects;
  }
  
  /**
   * 解析单个Java对象字符串
   * @param {string} objStr - 单个Java对象字符串
   * @returns {Object} 解析后的JavaScript对象
   */
  parseJavaObject(objStr) {
    try {
      objStr = objStr.trim();
      
      // 提取类名（如果有）
      const classNameMatch = objStr.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      let className = null;
      if (classNameMatch) {
        className = classNameMatch[1];
        // 移除类名部分，只保留参数部分
        objStr = objStr.substring(classNameMatch[0].length);
        // 移除末尾的右括号
        objStr = objStr.replace(/\)$/, '');
      }
      
      const result = {};
      
      // 解析属性
      const properties = this.parseProperties(objStr);
      
      for (const [key, value] of properties) {
        result[key] = this.parseValue(value);
      }
      
      return result;
    } catch (error) {
      console.error('解析Java对象失败:', error, 'Object:', objStr);
      return null;
    }
  }
  
  /**
   * 解析属性键值对
   * @param {string} str - 属性字符串
   * @returns {Array} 属性键值对数组
   */
  parseProperties(str) {
    const properties = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let key = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        current += char;
        continue;
      }
      
      if (char === '"' || char === "'") {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '(' || char === '[') {
          depth++;
        } else if (char === ')' || char === ']') {
          depth--;
        }
        
        if (depth === 0) {
          if (char === '=' && !key) {
            key = current.trim();
            current = '';
            continue;
          } else if (char === ',') {
            if (key && current.trim()) {
              properties.push([key, current.trim()]);
            }
            key = '';
            current = '';
            continue;
          }
        }
      }
      
      current += char;
    }
    
    // 添加最后一个属性
    if (key && current.trim()) {
      properties.push([key, current.trim()]);
    }
    
    return properties;
  }
  
  /**
   * 解析属性值
   * @param {string} valueStr - 属性值字符串
   * @returns {any} 解析后的值
   */
  parseValue(valueStr) {
    valueStr = valueStr.trim();
    
    // null值
    if (valueStr === 'null') {
      return null;
    }
    
    // 布尔值
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    
    // 数字（包括小数和科学计数法）
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valueStr)) {
      return valueStr.includes('.') ? parseFloat(valueStr) : parseInt(valueStr);
    }
    
    // 字符串（带引号）
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || 
        (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
      return valueStr.slice(1, -1);
    }
    
    // 数组类型（例如：[StorageDetailDTO(...), ...]）
    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      const arrayContent = valueStr.slice(1, -1).trim();
      if (!arrayContent) {
        return [];
      }
      
      // 解析数组中的对象
      const arrayObjects = this.parseJavaObjects(arrayContent);
      return arrayObjects;
    }
    
    // 单个嵌套对象（例如：StorageDetailDTO(...)）
    if (/^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(valueStr)) {
      return this.parseJavaObject(valueStr);
    }
    
    // 日期时间格式（ISO 8601格式）
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/.test(valueStr)) {
      return valueStr;
    }
    
    // 纯数字字符串（作为字符串处理）
    if (/^\d+$/.test(valueStr) && valueStr.length > 1 && valueStr.startsWith('0')) {
      return valueStr; // 保持前导零的字符串格式
    }
    
    // 其他情况当作字符串处理（移除可能的转义字符）
    return valueStr.replace(/\\(.)/g, '$1');
  }

  /**
   * 将文本转换为JSON格式
   * @param {string} text - 要转换的文本
   * @returns {Promise<Object>} JSON格式的结果和执行时间
   */
  async convertToJson(text) {
    // 检测是否为Java对象格式
    const isJavaObjectFormat = this.isJavaObjectFormat(text);
    
    if (isJavaObjectFormat) {
      // 使用本地转换方法
      console.log('检测到Java对象格式，使用本地转换');
      return this.convertJavaObjectToJson(text);
    }
    
    // 检测是否为Java对象数组格式，如ItemUsedGradeSearchOutDTO
    const isItemDtoFormat = text.includes('ItemUsedGradeSearchOutDTO') && text.includes('itemCode=');
    
    // 获取当前模型类型
    const modelType = this.getModelType(this.model);
    
    console.log(`JSON转换使用模型: ${this.model}, 类型: ${modelType}`);
    
    let systemPrompt;
    if (isItemDtoFormat) {
      systemPrompt = `请将下面Java对象转换为JSON对象，不要添加任何解释，只返回JSON结果。`;
    } else {
      systemPrompt = `请将下面的文本转换为JSON对象，不要添加任何解释，只返回JSON结果。`;
    }
    
    let messages;
    if (modelType === 'spark' || this.model.includes('spark')) {
      // 星火模型的提示词格式
      messages = [
        { role: 'user', content: `${systemPrompt}\n\n${text}` }
      ];
    } else {
      // DeepSeek和其他模型的标准提示词格式
      messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        { role: 'user', content: text }
      ];
    }
    
    const options = {
      temperature: 0.1,
      max_tokens: 4000
    };
    
    const response = await this.callApi(messages, options);
    let jsonContent = response.choices[0].message.content.trim();
    
    // 处理可能出现的代码块格式
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace('```json', '').replace('```', '').trim();
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```(.*)```/s, '$1').trim();
    }
    
    // 移除可能的HTML标签
    jsonContent = jsonContent.replace(/<[^>]*>/g, '');
    
    return {
      content: jsonContent,
      executionTime: response.executionTime
    };
  }
  
  /**
   * 检测是否为Java对象格式
   * @param {string} text - 要检测的文本
   * @returns {boolean} 是否为Java对象格式
   */
  isJavaObjectFormat(text) {
    const trimmedText = text.trim();
    
    // 检查是否包含Java对象的特征
    const hasJavaObjectPattern = /[A-Za-z_][A-Za-z0-9_]*\s*\([^)]*=/.test(trimmedText);
    
    // 检查是否包含典型的Java对象字段模式
    const hasFieldPattern = /\w+\s*=\s*[^,)]+/.test(trimmedText);
    
    // 检查是否是数组格式包含对象
    const isArrayWithObjects = trimmedText.startsWith('[') && 
                               trimmedText.endsWith(']') && 
                               hasJavaObjectPattern;
    
    // 检查是否是单个对象
    const isSingleObject = hasJavaObjectPattern && hasFieldPattern;
    
    return isArrayWithObjects || isSingleObject;
  }
  
  /**
   * 翻译文本到指定语言
   * @param {string} text - 要翻译的文本
   * @param {string} targetLang - 目标语言代码(zh/en/ja/ko/fr)
   * @returns {Promise<Object>} 翻译结果和执行时间
   */
  async translateText(text, targetLang) {
    let targetLanguage;
    
    switch (targetLang) {
      case 'zh': targetLanguage = '中文'; break;
      case 'en': targetLanguage = '英文'; break;
      case 'ja': targetLanguage = '日文'; break;
      case 'ko': targetLanguage = '韩文'; break;
      case 'fr': targetLanguage = '法文'; break;
      default: targetLanguage = '中文';
    }
    
    // 获取当前模型类型
    const modelType = this.getModelType(this.model);
    
    console.log(`翻译使用模型: ${this.model}, 类型: ${modelType}`);
    
    // 为不同模型设置不同的提示词
    if (modelType === 'spark') {
      // 星火模型的提示词格式
      let systemPrompt = `你是一个专业的翻译助手。请将下面的文本翻译成${targetLanguage}。只返回翻译结果，不要添加任何解释或说明。翻译内容：`;
      
      // 星火模型有不同的消息格式
      const messages = [
        { role: 'user', content: `${systemPrompt}\n\n${text}` }
      ];
      
      const options = {
        temperature: 0.3,
        max_tokens: 2000
      };
      
      const response = await this.callApi(messages, options);
      return {
        content: response.choices[0].message.content,
        executionTime: response.executionTime
      };
    } else {
      // DeepSeek和其他模型的标准提示词格式
      let systemPrompt = `你是一个专业的翻译助手。请将用户提供的文本翻译成${targetLanguage}，保持原文的意思、格式和语气。只返回翻译结果，不要添加解释。`;
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        { role: 'user', content: text }
      ];
      
      const options = {
        temperature: 0.3,
        max_tokens: 2000
      };
      
      const response = await this.callApi(messages, options);
      return {
        content: response.choices[0].message.content,
        executionTime: response.executionTime
      };
    }
  }
  
  /**
   * 总结文本内容
   * @param {string} text - 要总结的文本
   * @returns {Promise<Object>} 总结结果和执行时间
   */
  async summarizeText(text) {
    // 获取当前模型类型
    const modelType = this.getModelType(this.model);
    
    console.log(`总结使用模型: ${this.model}, 类型: ${modelType}`);
    
    // 总结任务的标准提示词
    const standardSummaryPrompt = `请对以下内容进行简洁、准确的总结，遵循以下格式规范：
1. a)使用适当的段落划分，每段表达一个完整的主题
2. b)对重要信息进行结构化呈现，可以使用要点列表
3. c)总结应突出文本的核心内容和主要观点
4. d)如果内容涉及多个方面，可以使用小标题进行分类
5. e)总结应保持客观，突出核心内容，易于阅读`;
    
    if (modelType === 'spark' || this.model.includes('spark')) {
      // 星火模型的提示词格式
      const messages = [
        { role: 'user', content: `${standardSummaryPrompt}\n\n需要总结的内容：\n\n${text}` }
      ];
      
      const options = {
        temperature: 0.3,
        max_tokens: 2000
      };
      
      const response = await this.callApi(messages, options);
      return {
        content: response.choices[0].message.content,
        executionTime: response.executionTime
      };
    } else {
      // DeepSeek和其他模型的标准提示词格式
      const messages = [
        {
          role: 'system',
          content: `你是一个专业的内容总结助手。请对用户提供的文本进行简洁、准确的总结，遵循以下格式规范：

1. 使用适当的段落划分，每段表达一个完整的主题
2. 对重要信息进行结构化呈现，可以使用短小的要点列表
3. 使用换行来分隔不同的段落和要点
4. 总结应突出文本的核心内容和主要观点
5. 如果内容涉及多个方面，可以使用小标题进行分类

总结应保持客观，突出核心内容，易于阅读。`
        },
        { role: 'user', content: `请总结以下内容：\n\n${text}` }
      ];
      
      const options = {
        temperature: 0.3,
        max_tokens: 2000
      };
      
      const response = await this.callApi(messages, options);
      return {
        content: response.choices[0].message.content,
        executionTime: response.executionTime
      };
    }
  }
  
  /**
   * 获取特定模型的配置
   * @param {string} modelId - 模型ID
   * @returns {Object} 该模型的配置
   */
  getModelConfig(modelId = null) {
    const targetModel = modelId || this.model;
    return this.modelConfigs[targetModel] || {
      apiKey: '',
      baseUrl: this.getDefaultBaseUrl(targetModel),
      extraParams: {}
    };
  }

  /**
   * 设置基础URL
   * @param {string} baseUrl - 基础URL
   * @param {string} modelId - 模型ID，如果不指定则使用当前模型
   */
  setBaseUrl(baseUrl, modelId = null) {
    const targetModel = modelId || this.model;
    
    if (!this.modelConfigs[targetModel]) {
      this.modelConfigs[targetModel] = {
        apiKey: '',
        baseUrl: this.getDefaultBaseUrl(targetModel),
        extraParams: {}
      };
    }
    
    // 更新配置
    this.modelConfigs[targetModel].baseUrl = baseUrl;
    
    // 如果是当前模型，也更新默认baseUrl
    if (targetModel === this.model) {
      this.baseUrl = baseUrl;
    }
    
    // 保存到存储
    chrome.storage.local.set({ modelConfigs: this.modelConfigs });
  }
  
  /**
   * 设置额外参数
   * @param {Object} params - 额外参数对象
   * @param {string} modelId - 模型ID，如果不指定则使用当前模型
   */
  setExtraParams(params, modelId = null) {
    const targetModel = modelId || this.model;
    
    if (!this.modelConfigs[targetModel]) {
      this.modelConfigs[targetModel] = {
        apiKey: '',
        baseUrl: this.getDefaultBaseUrl(targetModel),
        extraParams: {}
      };
    }
    
    // 更新配置
    this.modelConfigs[targetModel].extraParams = { ...params };
    
    // 保存到存储
    chrome.storage.local.set({ modelConfigs: this.modelConfigs });
  }
  
  /**
   * 为模型设置高级选项
   * @param {Object} options - 高级选项对象，包含includeModelId和modelIdValue等
   * @param {string} modelId - 模型ID，如果不指定则使用当前模型
   */
  setAdvancedOptions(options, modelId = null) {
    const targetModel = modelId || this.model;
    
    if (!this.modelConfigs[targetModel]) {
      this.modelConfigs[targetModel] = {
        apiKey: '',
        baseUrl: this.getDefaultBaseUrl(targetModel),
        extraParams: {},
        advancedOptions: {}
      };
    }
    
    // 确保advancedOptions存在
    if (!this.modelConfigs[targetModel].advancedOptions) {
      this.modelConfigs[targetModel].advancedOptions = {};
    }
    
    // 更新高级选项
    this.modelConfigs[targetModel].advancedOptions = {
      ...this.modelConfigs[targetModel].advancedOptions,
      ...options
    };
    
    // 保存到存储
    chrome.storage.local.set({ modelConfigs: this.modelConfigs });
  }
  
  /**
   * 获取模型的高级选项
   * @param {string} modelId - 模型ID，如果不指定则使用当前模型
   * @returns {Object} 模型的高级选项
   */
  getAdvancedOptions(modelId = null) {
    const targetModel = modelId || this.model;
    return this.modelConfigs[targetModel]?.advancedOptions || {};
  }

  /**
   * 生成测试用户数据
   * @param {number} count - 需要生成的用户数量
   * @returns {Object} 包含用户数据和执行时间的对象
   */
  generateTestUserData(count = 10) {
    const startTime = Date.now();
    const users = [];
    
    for (let i = 0; i < count; i++) {
      users.push(this.generateSingleUserData());
    }
    
    const endTime = Date.now();
    const executionTime = (endTime - startTime) / 1000; // 转换为秒
    
    return {
      users,
      executionTime
    };
  }
  
  /**
   * 生成单个用户数据
   * @returns {Object} 单个用户的数据对象
   */
  generateSingleUserData() {
    return {
      name: this.generateChineseName(),
      mobile: this.generateChineseMobile(),
      idCard: this.generateChineseIdCard()
    };
  }
  
  /**
   * 生成中国人姓名
   * @returns {string} 随机生成的中国人姓名
   */
  generateChineseName() {
    // 常见中国姓氏
    const surnames = [
      '李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
      '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
      '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
      '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕'
    ];
    
    // 常见名字用字
    const nameChars = [
      '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军',
      '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞',
      '平', '刚', '桂英', '玉兰', '辉', '慧', '亮', '春', '海', '燕',
      '晨', '冰', '云', '莲', '天', '晓', '雪', '梅', '鹏', '红',
      '宇', '凯', '文', '玲', '珊', '欣', '宁', '欢', '佳', '豪'
    ];
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    
    // 随机决定名字是一个字还是两个字
    const isDoubleName = Math.random() > 0.5;
    
    if (isDoubleName) {
      // 生成两个字的名字
      const firstName = nameChars[Math.floor(Math.random() * nameChars.length)];
      let secondName = nameChars[Math.floor(Math.random() * nameChars.length)];
      
      // 如果第一个字是两个字的组合，则直接返回姓+单字名
      if (firstName.length === 2) {
        return surname + firstName.charAt(0);
      }
      
      // 确保第二个字不与第一个字相同
      while (secondName === firstName || secondName.length === 2) {
        secondName = nameChars[Math.floor(Math.random() * nameChars.length)];
      }
      
      return surname + firstName + secondName;
    } else {
      // 生成单字名
      let name = nameChars[Math.floor(Math.random() * nameChars.length)];
      
      // 如果随机到的是两个字的名字，只取第一个字
      if (name.length === 2) {
        name = name.charAt(0);
      }
      
      return surname + name;
    }
  }
  
  /**
   * 生成中国手机号
   * @returns {string} 随机生成的中国手机号
   */
  generateChineseMobile() {
    // 手机号前三位（常见号段）
    const prefixes = ['133', '149', '153', '173', '177', '180', '181', '189', '199', '130', '131', '132', '145', '155', '156', '166', '171', '175', '176', '185', '186', '166', '134', '135', '136', '137', '138', '139', '147', '150', '151', '152', '157', '158', '159', '172', '178', '182', '183', '184', '187', '188', '198'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let rest = '';
    
    // 生成后8位
    for (let i = 0; i < 8; i++) {
      rest += Math.floor(Math.random() * 10);
    }
    
    return prefix + rest;
  }
  
  /**
   * 生成中国身份证号
   * @returns {string} 随机生成的中国身份证号
   */
  generateChineseIdCard() {
    // 地区码（前6位）- 使用部分真实的地区编码
    const areaCodes = [
      '110101', '110102', '110105', '110106', '110107', '110108', // 北京
      '310101', '310104', '310105', '310106', '310109', '310110', // 上海
      '440103', '440104', '440105', '440106', '440111', '440112', // 广州
      '440301', '440303', '440304', '440305', '440306', '440307', // 深圳
      '330102', '330103', '330104', '330105', '330106', '330108', // 杭州
      '320102', '320103', '320104', '320105', '320106', '320113', // 南京
      '510104', '510105', '510106', '510107', '510108', '510112', // 成都
      '420102', '420103', '420104', '420105', '420106', '420107'  // 武汉
    ];
    
    const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];
    
    // 出生日期（中间8位）- 生成1950-2000年之间的随机日期
    const year = Math.floor(Math.random() * (2000 - 1950 + 1)) + 1950;
    const month = Math.floor(Math.random() * 12) + 1;
    
    // 根据月份确定最大天数
    let maxDay = 31;
    if ([4, 6, 9, 11].includes(month)) {
      maxDay = 30;
    } else if (month === 2) {
      // 处理闰年
      maxDay = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 29 : 28;
    }
    
    const day = Math.floor(Math.random() * maxDay) + 1;
    
    // 格式化日期部分
    const birthdate = 
      year.toString() + 
      (month < 10 ? '0' + month : month).toString() + 
      (day < 10 ? '0' + day : day).toString();
    
    // 顺序码（后3位，奇数为男，偶数为女）
    let sequenceCode = Math.floor(Math.random() * 999) + 1;
    sequenceCode = sequenceCode.toString().padStart(3, '0');
    
    // 前17位
    const idCardBase = areaCode + birthdate + sequenceCode;
    
    // 计算校验码
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodeMap = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCardBase.charAt(i)) * weights[i];
    }
    
    const checkCode = checkCodeMap[sum % 11];
    
    return idCardBase + checkCode;
  }

  /**
   * 获取当前模型的类型
   * @param {string} modelId - 模型ID
   * @returns {string} 模型类型
   */
  getModelType(modelId) {
    const modelIdLower = modelId.toLowerCase();
    
    // 检查是否是内置模型
    const builtinModels = DeepSeekAPI.getSupportedModels();
    const builtinModel = builtinModels.find(m => m.id === modelId);
    if (builtinModel && builtinModel.type) {
      return builtinModel.type;
    }
    
    // 基于ID判断常见模型类型
    if (modelIdLower.includes('spark') || modelIdLower.includes('星火')) {
      return 'spark';
    }
    
    if (modelIdLower.includes('qwen') || modelIdLower.includes('千问')) {
      return 'qwen';
    }
    
    if (modelIdLower.includes('glm') || modelIdLower.includes('chatglm')) {
      return 'glm';
    }
    
    if (modelIdLower.includes('ernie') || modelIdLower.includes('文心')) {
      return 'ernie';
    }
    
    if (modelIdLower.includes('claude')) {
      return 'claude';
    }
    
    if (modelIdLower.includes('gpt')) {
      return 'openai';
    }
    
    // 默认类型
    return 'default';
  }
}

// 创建全局API服务实例
const deepSeekAPI = new DeepSeekAPI();

/**
 * Excel分析相关API
 */
class ExcelAnalysisAPI {
  /**
   * 分析Excel文件
   * @param {FormData} formData - 包含Excel文件的FormData对象
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeExcel(formData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/excel/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 处理工作饱和度数据
      data.workload = this._processWorkloadData(data.rawData);
      
      // 处理工时差异数据
      data.timeVariance = this._processTimeVarianceData(data.rawData);
      
      // 处理任务类型分布
      data.taskTypes = this._processTaskTypeData(data.rawData);
      
      // 生成个人总结
      data.personalSummaries = await this._generatePersonalSummaries(data.rawData);
      
      return data;
    } catch (error) {
      console.error('Excel分析失败:', error);
      throw error;
    }
  }
  
  /**
   * 生成Excel分析报告
   * @returns {Promise<Blob>} Excel报告文件
   */
  async generateExcelReport() {
    try {
      const response = await fetch(`${this.baseUrl}/api/excel/report`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理工作饱和度数据
   * @param {Object} rawData - 原始数据
   * @returns {Object} 处理后的工作饱和度数据
   */
  _processWorkloadData(rawData) {
    const dates = [...new Set(rawData.map(item => item.date))].sort();
    const members = [...new Set(rawData.map(item => item.member))];
    
    const memberData = members.map(member => {
      const saturation = dates.map(date => {
        const dayTasks = rawData.filter(item => 
          item.member === member && item.date === date
        );
        const totalHours = dayTasks.reduce((sum, task) => 
          sum + (parseFloat(task.actualHours) || 0), 0
        );
        return (totalHours / 8) * 100; // 转换为饱和度百分比
      });
      
      return {
        name: member,
        saturation
      };
    });
    
    return {
      dates,
      members: memberData
    };
  }
  
  /**
   * 处理工时差异数据
   * @param {Object} rawData - 原始数据
   * @returns {Object} 处理后的工时差异数据
   */
  _processTimeVarianceData(rawData) {
    const tasks = rawData.map(item => item.taskName);
    const estimated = rawData.map(item => parseFloat(item.estimatedHours) || 0);
    const actual = rawData.map(item => parseFloat(item.actualHours) || 0);
    
    return {
      tasks,
      estimated,
      actual
    };
  }
  
  /**
   * 处理任务类型分布数据
   * @param {Object} rawData - 原始数据
   * @returns {Object} 处理后的任务类型分布数据
   */
  _processTaskTypeData(rawData) {
    const typeCount = {};
    rawData.forEach(item => {
      const type = item.taskType || '未分类';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    return typeCount;
  }
  
  /**
   * 生成个人总结
   * @private
   */
  async _generatePersonalSummaries(data) {
    const memberData = {};
    
    // 按成员分组
    data.forEach(row => {
      if (!memberData[row.member]) {
        memberData[row.member] = [];
      }
      memberData[row.member].push(row);
    });
    
    const summaries = [];
    
    // 为每个成员生成总结
    for (const [member, records] of Object.entries(memberData)) {
      console.log(`\n生成${member}的总结，共${records.length}条记录`);
      
      // 统计基础数据
      const totalTasks = new Set(records.map(r => r.taskName)).size;
      
      // 统计任务类型
      const taskTypes = {};
      records.forEach(r => {
        taskTypes[r.taskType] = (taskTypes[r.taskType] || 0) + 1;
      });
      
      // 统计每天的工时
      const dailyHours = {};
      
      // 收集所有非周日的日期
      records.forEach(r => {
        const date = new Date(r.date);
        // 跳过周日
        if (date.getDay() !== 0) {
          const dateStr = r.date.toISOString().split('T')[0];
          if (!dailyHours[dateStr]) {
            dailyHours[dateStr] = {
              date: r.date,
              totalHours: 0,
              tasks: [],
              hasWorkRecord: false // 标记是否有工时记录
            };
          }
        }
      });
      
      // 填充工时数据
      records.forEach(r => {
        const date = new Date(r.date);
        // 跳过周日
        if (date.getDay() !== 0) {
          const dateStr = r.date.toISOString().split('T')[0];
          if (dailyHours[dateStr]) {
            const hours = parseFloat(r.actualHours) || 0;
            dailyHours[dateStr].totalHours += hours;
            if (hours > 0) {
              dailyHours[dateStr].hasWorkRecord = true;
              dailyHours[dateStr].tasks.push({
                taskName: r.taskName,
                hours: hours
              });
            }
          }
        }
      });
      
      // 调试日志
      console.log(`${member}的每日工时统计:`);
      Object.entries(dailyHours).forEach(([dateStr, info]) => {
        console.log(`  ${dateStr}: ${info.totalHours}小时, 有效工时记录: ${info.hasWorkRecord}`);
        info.tasks.forEach(task => {
          console.log(`    - ${task.taskName}: ${task.hours}小时`);
        });
      });
      
      // 找出工时不足或未填写工时的日期
      const lowWorkDays = [];
      const noWorkDays = [];
      
      for (const [dateStr, info] of Object.entries(dailyHours)) {
        if (!info.hasWorkRecord) {
          // 未填写工时的日期
          noWorkDays.push({
            date: dateStr,
            hours: 0
          });
        } else if (info.totalHours < 8) {
          // 工时不足8小时的日期
          lowWorkDays.push({
            date: dateStr,
            hours: info.totalHours
          });
        }
      }
      
      // 按日期排序
      lowWorkDays.sort((a, b) => a.date.localeCompare(b.date));
      noWorkDays.sort((a, b) => a.date.localeCompare(b.date));
      
      // 计算有效工作日（有工时记录的日期）的总工时和平均饱和度
      const effectiveWorkDays = Object.values(dailyHours).filter(day => day.hasWorkRecord);
      const effectiveTotalHours = effectiveWorkDays.reduce((sum, day) => sum + day.totalHours, 0);
      const effectiveAvgSaturation = effectiveWorkDays.length > 0 ? 
        (effectiveTotalHours / (effectiveWorkDays.length * 8)) * 100 : 0;
      
      console.log('统计结果:', {
        member,
        effectiveWorkDays: effectiveWorkDays.length,
        effectiveTotalHours,
        effectiveAvgSaturation,
        lowWorkDays: lowWorkDays.length,
        noWorkDays: noWorkDays.length
      });
      
      // 生成提示文本
      const prompt = this._generateSummaryPrompt(
        member,
        totalTasks,
        records.filter(r => r.status === '已完成').length,
        effectiveAvgSaturation,
        taskTypes,
        effectiveWorkDays.length,
        effectiveTotalHours,
        lowWorkDays,
        noWorkDays
      );
      
      // 调用AI生成总结
      try {
        const summary = await deepSeekAPI.summarizeText(prompt);
        summaries.push({
          name: member,
          content: summary.content
        });
      } catch (error) {
        console.error(`生成${member}的总结失败:`, error);
        // 如果AI生成失败，使用默认总结
        summaries.push({
          name: member,
          content: this._generateDefaultSummary(
            member, 
            totalTasks, 
            effectiveAvgSaturation, 
            taskTypes, 
            lowWorkDays,
            noWorkDays
          )
        });
      }
    }
    
    return summaries;
  }
  
  /**
   * 生成总结提示文本
   * @private
   */
  _generateSummaryPrompt(member, totalTasks, completedTasks, avgSaturation, taskTypes, workDays, totalHours, lowWorkDays, noWorkDays) {
    const typeDistribution = Object.entries(taskTypes)
      .map(([type, count]) => `${type}: ${count}个任务`)
      .join('\n');
    
    // 格式化工时不足的日期
    let lowWorkDaysText = '无';
    let lowWorkDaysDetail = '';
    if (lowWorkDays.length > 0) {
      lowWorkDaysText = lowWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日: ${d.hours.toFixed(1)}小时`;
      }).join('\n');
      
      lowWorkDaysDetail = lowWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日（${d.hours.toFixed(1)}小时）`;
      }).join('、');
    }

    // 格式化未填写工时的日期
    let noWorkDaysText = '无';
    let noWorkDaysDetail = '';
    if (noWorkDays.length > 0) {
      noWorkDaysText = noWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      }).join('\n');
      
      noWorkDaysDetail = noWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      }).join('、');
    }
    
    return `
请对团队成员${member}的工作情况进行分析和总结，以下是相关数据：

1. 工作量概况：
- 有效工作天数：${workDays}天
- 总任务数：${totalTasks}个
- 总工时：${totalHours.toFixed(1)}小时
- 平均工作饱和度：${avgSaturation.toFixed(1)}%

2. 任务类型分布：
${typeDistribution}

3. 工时异常情况：
a) 工时不足8小时的日期：
${lowWorkDaysText}

b) 未填写工时的日期：
${noWorkDaysText}

请从以下几个方面进行分析，使用HTML格式输出，要求段落分明、结构清晰：

<p><strong>一、工作量和效率评估</strong></p>
<p>（分析工作量情况，说明总体工作饱和度）</p>

<p><strong>二、任务分布和专注度</strong></p>
<p>（分析任务类型分布情况）</p>

<p><strong>三、工作饱和度分析</strong></p>
<p>（重点说明：${
  lowWorkDays.length > 0 || noWorkDays.length > 0 
    ? `存在以下工时异常情况：
      ${lowWorkDays.length > 0 ? `\n1. 在${lowWorkDaysDetail}这些日期工时不足8小时` : ''}
      ${noWorkDays.length > 0 ? `\n2. 在${noWorkDaysDetail}这些日期未填写工时` : ''}`
    : '所有工作日的工时都达到或超过8小时，工作饱和度良好。'
}）</p>

<p><strong>四、改进建议</strong></p>
<p>（${
  lowWorkDays.length > 0 || noWorkDays.length > 0
    ? '针对工时异常的情况，提供具体的改进建议：\n' +
      '1. 关于工时填写的规范性\n' +
      '2. 关于工作时间的合理安排'
    : '提供保持良好工作状态的建议'
}）</p>

请用简洁专业的语言，生成300字左右的总结。每个段落之间要有明显的分隔。在工作饱和度分析部分，必须明确列出工时异常的具体日期。
`;
  }
  
  /**
   * 生成默认总结（当AI生成失败时使用）
   * @private
   */
  _generateDefaultSummary(member, totalTasks, avgSaturation, taskTypes, lowWorkDays, noWorkDays) {
    const taskTypeText = Object.entries(taskTypes)
      .map(([type, count]) => `${type}(${count})`)
      .join('、');
    
    let workTimeAnomalyHtml = '';
    
    // 处理工时异常情况
    if (lowWorkDays.length > 0 || noWorkDays.length > 0) {
      let anomalyDetails = '<ul style="margin-left: 20px; margin-bottom: 12px;">';
      
      // 添加工时不足的日期
      if (lowWorkDays.length > 0) {
        anomalyDetails += '<li><strong>工时不足的日期：</strong></li>';
        lowWorkDays.forEach(d => {
          const date = new Date(d.date);
          anomalyDetails += `<li>${date.getMonth() + 1}月${date.getDate()}日：实际工时${d.hours.toFixed(1)}小时，不足8小时</li>`;
        });
      }
      
      // 添加未填写工时的日期
      if (noWorkDays.length > 0) {
        anomalyDetails += '<li><strong>未填写工时的日期：</strong></li>';
        noWorkDays.forEach(d => {
          const date = new Date(d.date);
          anomalyDetails += `<li>${date.getMonth() + 1}月${date.getDate()}日：未填写工时</li>`;
        });
      }
      
      anomalyDetails += '</ul>';
      
      workTimeAnomalyHtml = `
        <p><strong>工时异常情况：</strong></p>
        ${anomalyDetails}
        <p>建议：</p>
        <ol style="margin-left: 20px; margin-bottom: 12px;">
          <li>请及时填写每日工时，保证工时记录的完整性</li>
          <li>合理安排工作时间，确保日常工作饱和度</li>
          <li>如遇特殊情况，请及时与团队沟通说明</li>
        </ol>
      `;
    } else {
      workTimeAnomalyHtml = `<p><strong>工作饱和度：</strong>所有工作日的工时都达到或超过8小时，工作状态良好。</p>`;
    }
    
    return `
      <p><strong>工作概况：</strong>${member}在统计期间共承担了${totalTasks}个任务，平均工作饱和度为${avgSaturation.toFixed(1)}%。</p>
      
      <p><strong>任务类型：</strong>主要包括${taskTypeText}。</p>
      
      ${workTimeAnomalyHtml}
      
      <p><strong>建议：</strong>${
        lowWorkDays.length > 0 || noWorkDays.length > 0 
          ? '请重视工时填写的规范性，保证每日工作量达到预期要求。同时建议提前做好任务规划，合理分配工作时间，提高工作效率。'
          : '继续保持良好的工作状态，合理分配任务时间。'
      }</p>
    `;
  }
}

// 将Excel分析API添加到deepSeekAPI对象
Object.assign(deepSeekAPI, new ExcelAnalysisAPI());

/**
 * Excel分析服务类
 */
class ExcelAnalyzer {
  /**
   * 读取Excel文件
   * @private
   */
  async _readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 验证工作簿
          if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('无效的Excel文件格式');
          }
          
          console.log('Excel工作簿信息:', {
            sheetNames: workbook.SheetNames,
            firstSheet: workbook.Sheets[workbook.SheetNames[0]]
          });
          
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 分析Excel文件
   * @param {File} file - Excel文件对象
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeExcel(file) {
    try {
      const startTime = performance.now();
      
      // 读取Excel文件
      const workbook = await this._readExcelFile(file);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // 将Excel数据转换为JSON，保留原始值
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,  // 使用数组格式
        raw: false, // 获取格式化的值
        dateNF: 'yyyy-mm-dd'
      });
      
      console.log('原始Excel数据（前3行）:', rawData.slice(0, 3));
      
      // 获取表头行（第一行）
      const headerRow = rawData[0] || [];
      console.log('表头行:', headerRow);
      
      // 分析日期列的月份模式
      const monthInfo = this._analyzeMonthPattern(headerRow);
      console.log('检测到的月份信息:', monthInfo);
      
      // 查找日期列（从第10列开始，索引9）
      const dateColumns = [];
      for (let i = 9; i < headerRow.length; i++) {
        const cellValue = headerRow[i];
        if (cellValue) {
          const parsedDate = this._parseColumnDate(cellValue, i, monthInfo);
          if (parsedDate) {
            dateColumns.push({
              index: i,
              date: parsedDate,
              header: cellValue
            });
          }
        }
      }
      
      // 按日期排序
      dateColumns.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      console.log('识别到的日期列:', dateColumns);
      
      // 转换数据格式
      const transformedData = [];
      
      // 从第二行开始处理数据（跳过表头）
      for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
        const row = rawData[rowIndex];
        if (!row || row.length === 0) continue;
        
        const member = row[3];  // D列 - 研发
        const taskName = row[2];  // C列 - 任务名称
        const taskType = row[4];  // E列 - 任务类型
        const estimatedHours = parseFloat(row[8]) || 0;  // I列 - 预估工时
        
        // 跳过没有成员信息的行
        if (!member || !taskName) continue;
        
        // 处理每一天的工时
        dateColumns.forEach(({index, date, header}) => {
          // 检查是否为周日
          const isSunday = date.getDay() === 0;
          
          // 如果是周日，跳过处理
          if (isSunday) {
            return;
          }
          
          // 获取工时，如果为空则设为0
          const actualHours = parseFloat(row[index]) || 0;
          
          // 创建记录（包括工时为0的情况）
          const record = {
            date: date,
            member: member.trim(),
            taskName: taskName.trim(),
            taskType: (taskType || '未分类').trim(),
            estimatedHours: estimatedHours,
            actualHours: actualHours,
            status: '进行中'
          };
          
          // 添加调试日志
          if (member.includes('孙浩') && date.getDate() === 12) {
            console.log(`[调试] 孙浩 5月12日的任务:`, {
              列标题: header,
              列索引: index,
              任务名称: taskName,
              工时: actualHours,
              日期: date.toISOString().split('T')[0]
            });
          }
          
          transformedData.push(record);
        });
      }
      
      console.log('转换后的数据（前10条）:', transformedData.slice(0, 10));
      console.log('转换后的数据总数:', transformedData.length);
      
      // 数据预处理
      const processedData = this._preprocessData(transformedData);
      console.log('预处理后的数据:', processedData);
      
      // 执行分析
      const result = {
        workload: this._analyzeWorkload(processedData),
        timeVariance: this._analyzeTimeVariance(processedData),
        taskTypes: this._analyzeTaskTypes(processedData),
        rawData: processedData
      };
      
      console.log('分析结果:', result);
      
      // 生成个人总结
      result.personalSummaries = await this._generatePersonalSummaries(processedData);
      
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000;
      
      return {
        status: 'success',
        data: result,
        executionTime
      };
    } catch (error) {
      console.error('Excel分析失败:', error);
      throw new Error('Excel分析失败: ' + error.message);
    }
  }
  
  /**
   * 分析日期列的月份模式
   * @private
   */
  _analyzeMonthPattern(headerRow) {
    const monthPattern = {
      currentMonth: null,
      currentYear: new Date().getFullYear(),
      monthChanges: []
    };
    
    // 查找可能的月份标识
    let firstDayColumn = -1;
    for (let i = 0; i < headerRow.length; i++) {
      const cell = String(headerRow[i] || '').trim();
      
      // 查找月份标识（如 "5月"、"05月"、"May" 等）
      const monthMatch = cell.match(/(\d{1,2})\s*月/);
      if (monthMatch) {
        const month = parseInt(monthMatch[1]) - 1; // 转换为0-11的索引
        monthPattern.monthChanges.push({ index: i, month: month });
      }
      
      // 记录第一个看起来像日期的列
      if (firstDayColumn === -1 && cell.match(/^\d{1,2}\s*[周]?[\u4e00-\u9fa5]*$/)) {
        firstDayColumn = i;
      }
    }
    
    // 如果找到月份标识，使用第一个作为当前月份
    if (monthPattern.monthChanges.length > 0) {
      monthPattern.currentMonth = monthPattern.monthChanges[0].month;
    } else {
      // 尝试从日期序列推断月份
      // 查看日期序列，如果有日期从大数字跳到小数字（如31到1），说明跨月了
      let lastDay = 0;
      let inferredMonth = null;
      
      for (let i = firstDayColumn; i < headerRow.length && i < firstDayColumn + 40; i++) {
        const cell = String(headerRow[i] || '').trim();
        const dayMatch = cell.match(/^(\d{1,2})\s*[周]?[\u4e00-\u9fa5]*$/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          if (day < lastDay && lastDay > 25 && day < 5) {
            // 检测到月份变化
            monthPattern.monthChanges.push({ index: i, month: (inferredMonth || new Date().getMonth()) + 1 });
          }
          lastDay = day;
        }
      }
      
      // 如果还是没有检测到月份，使用当前月份或提示用户
      if (monthPattern.currentMonth === null) {
        // 默认使用5月（根据用户反馈）
        monthPattern.currentMonth = 4; // 5月（0-based）
        console.warn('无法自动检测月份，默认使用5月。如需更改，请确保表头包含月份信息。');
      }
    }
    
    return monthPattern;
  }
  
  /**
   * 解析列标题中的日期
   * @private
   */
  _parseColumnDate(dateStr, columnIndex, monthInfo) {
    if (!dateStr) return null;
    
    try {
      console.log(`尝试解析日期: "${dateStr}" (列${columnIndex + 1})`);
      
      // 尝试多种日期格式
      const dateStrTrimmed = String(dateStr).trim();
      
      // 格式1: "24 周六" 或 "01 周日"
      const dayMatch = dateStrTrimmed.match(/^(\d{1,2})\s*[周]?[\u4e00-\u9fa5]*$/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          // 检查是否有月份变化
          let month = monthInfo.currentMonth;
          for (const change of monthInfo.monthChanges) {
            if (columnIndex >= change.index) {
              month = change.month;
            }
          }
          
          // 创建日期对象 - 使用ISO格式字符串
          const year = monthInfo.currentYear;
          const monthStr = (month + 1).toString().padStart(2, '0');
          const dayStr = day.toString().padStart(2, '0');
          const isoDateStr = `${year}-${monthStr}-${dayStr}T00:00:00.000Z`;
          const date = new Date(isoDateStr);
          
          // 调整到本地时区的午夜时间
          const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
          
          console.log(`解析成功: ${localDate.toLocaleDateString()} (${localDate.toISOString().split('T')[0]})`);
          return localDate;
        }
      }
      
      // 格式2: 尝试直接解析日期字符串
      const directDate = new Date(dateStrTrimmed);
      if (!isNaN(directDate.getTime())) {
        // 调整到本地时区的午夜时间
        const localDate = new Date(directDate.getTime() - directDate.getTimezoneOffset() * 60000);
        console.log(`直接解析成功: ${localDate.toLocaleDateString()}`);
        return localDate;
      }
      
      console.log(`解析失败: 无法识别的日期格式`);
      return null;
    } catch (error) {
      console.error('解析日期失败:', error);
      return null;
    }
  }
  
  /**
   * 数据预处理
   * @private
   */
  _preprocessData(data) {
    console.log('开始数据预处理');
    
    return data.map((row, index) => {
      try {
        // 检查必要字段是否存在
        if (!row.date || !row.member || !row.taskName) {
          console.warn(`行 ${index + 2} 缺少必要字段:`, row);
          return null;
        }
        
        // 验证日期是否有效
        if (!(row.date instanceof Date) || isNaN(row.date.getTime())) {
          console.warn(`行 ${index + 2} 日期无效:`, row.date);
          return null;
        }
        
        // 处理数值字段
        const estimatedHours = parseFloat(row.estimatedHours) || 0;
        const actualHours = parseFloat(row.actualHours) || 0;
        
        // 验证工时是否合理
        if (estimatedHours < 0 || actualHours < 0) {
          console.warn(`行 ${index + 2} 工时数值异常:`, { estimatedHours, actualHours });
          return null;
        }
        
        return {
          date: row.date,
          member: String(row.member || '').trim(),
          taskName: String(row.taskName || '').trim(),
          taskType: String(row.taskType || '未分类').trim(),
          estimatedHours: estimatedHours,
          actualHours: actualHours,
          status: String(row.status || '进行中').trim()
        };
      } catch (error) {
        console.error(`处理第 ${index + 2} 行数据时出错:`, error);
        return null;
      }
    }).filter(row => row !== null); // 过滤掉无效数据
  }
  
  /**
   * 分析工作量数据
   * @private
   */
  _analyzeWorkload(data) {
    console.log('开始分析工作量数据');
    
    // 按日期和成员分组计算工作饱和度
    const dailyWorkload = {};
    const members = new Set();
    const dates = new Set();
    
    // 首先收集所有成员
    data.forEach(row => {
      members.add(row.member);
    });
    
    // 收集每个成员有工时记录的日期
    data.forEach(row => {
      const date = new Date(row.date);
      const hours = parseFloat(row.actualHours) || 0;
      // 跳过周日，并且只统计有工时的日期
      if (date.getDay() !== 0 && hours > 0) {
        const dateStr = date.toISOString().split('T')[0];
        dates.add(dateStr);
        const key = `${dateStr}-${row.member}`;
        if (!dailyWorkload[key]) {
          dailyWorkload[key] = { actualHours: 0 };
        }
        dailyWorkload[key].actualHours += hours;
      }
    });
    
    // 调试日志
    console.log('工作量数据:', {
      总成员数: members.size,
      有效日期数: dates.size,
      工作量记录数: Object.keys(dailyWorkload).length
    });
    
    // 计算饱和度（只计算有工时的日期）
    Object.entries(dailyWorkload).forEach(([key, day]) => {
      day.saturation = (day.actualHours / 8) * 100;
      console.log(`工作量记录: ${key}, 工时: ${day.actualHours}, 饱和度: ${day.saturation}%`);
    });
    
    // 构建返回数据
    const sortedDates = Array.from(dates).sort();
    const memberData = Array.from(members).sort().map(member => {
      const saturation = sortedDates.map(date => {
        const key = `${date}-${member}`;
        return dailyWorkload[key]?.saturation || 0;
      });
      
      // 调试日志
      const totalHours = sortedDates.reduce((sum, date) => {
        const key = `${date}-${member}`;
        return sum + (dailyWorkload[key]?.actualHours || 0);
      }, 0);
      
      console.log(`成员 ${member} 统计:`, {
        有效工作日: saturation.filter(s => s > 0).length,
        总工时: totalHours,
        平均饱和度: saturation.reduce((sum, s) => sum + s, 0) / saturation.filter(s => s > 0).length || 0
      });
      
      return { name: member, saturation };
    });
    
    console.log('工作量分析结果:', {
      dates: sortedDates,
      members: memberData
    });
    
    return {
      dates: sortedDates,
      members: memberData
    };
  }
  
  /**
   * 分析工时差异
   * @private
   */
  _analyzeTimeVariance(data) {
    console.log('开始分析工时差异');
    
    const taskTimes = {};
    
    data.forEach(row => {
      if (!taskTimes[row.taskName]) {
        taskTimes[row.taskName] = {
          estimated: 0,
          actual: 0
        };
      }
      
      taskTimes[row.taskName].estimated += row.estimatedHours;
      taskTimes[row.taskName].actual += row.actualHours;
    });
    
    const tasks = Object.keys(taskTimes);
    const result = {
      tasks,
      estimated: tasks.map(task => taskTimes[task].estimated),
      actual: tasks.map(task => taskTimes[task].actual)
    };
    
    console.log('工时差异分析结果:', result);
    
    return result;
  }
  
  /**
   * 分析任务类型分布
   * @private
   */
  _analyzeTaskTypes(data) {
    console.log('开始分析任务类型分布');
    
    const typeCount = {};
    
    data.forEach(row => {
      const type = row.taskType || '未分类';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    console.log('任务类型分布结果:', typeCount);
    
    return typeCount;
  }
  
  /**
   * 生成个人总结
   * @private
   */
  async _generatePersonalSummaries(data) {
    const memberData = {};
    
    // 按成员分组
    data.forEach(row => {
      if (!memberData[row.member]) {
        memberData[row.member] = [];
      }
      memberData[row.member].push(row);
    });
    
    const summaries = [];
    
    // 为每个成员生成总结
    for (const [member, records] of Object.entries(memberData)) {
      console.log(`\n生成${member}的总结，共${records.length}条记录`);
      
      // 统计基础数据
      const totalTasks = new Set(records.map(r => r.taskName)).size;
      
      // 统计任务类型
      const taskTypes = {};
      records.forEach(r => {
        taskTypes[r.taskType] = (taskTypes[r.taskType] || 0) + 1;
      });
      
      // 统计每天的工时
      const dailyHours = {};
      
      // 收集所有非周日的日期
      records.forEach(r => {
        const date = new Date(r.date);
        // 跳过周日
        if (date.getDay() !== 0) {
          const dateStr = r.date.toISOString().split('T')[0];
          if (!dailyHours[dateStr]) {
            dailyHours[dateStr] = {
              date: r.date,
              totalHours: 0,
              tasks: [],
              hasWorkRecord: false // 标记是否有工时记录
            };
          }
        }
      });
      
      // 填充工时数据
      records.forEach(r => {
        const date = new Date(r.date);
        // 跳过周日
        if (date.getDay() !== 0) {
          const dateStr = r.date.toISOString().split('T')[0];
          if (dailyHours[dateStr]) {
            const hours = parseFloat(r.actualHours) || 0;
            dailyHours[dateStr].totalHours += hours;
            if (hours > 0) {
              dailyHours[dateStr].hasWorkRecord = true;
              dailyHours[dateStr].tasks.push({
                taskName: r.taskName,
                hours: hours
              });
            }
          }
        }
      });
      
      // 调试日志
      console.log(`${member}的每日工时统计:`);
      Object.entries(dailyHours).forEach(([dateStr, info]) => {
        console.log(`  ${dateStr}: ${info.totalHours}小时, 有效工时记录: ${info.hasWorkRecord}`);
        info.tasks.forEach(task => {
          console.log(`    - ${task.taskName}: ${task.hours}小时`);
        });
      });
      
      // 找出工时不足或未填写工时的日期
      const lowWorkDays = [];
      const noWorkDays = [];
      
      for (const [dateStr, info] of Object.entries(dailyHours)) {
        if (!info.hasWorkRecord) {
          // 未填写工时的日期
          noWorkDays.push({
            date: dateStr,
            hours: 0
          });
        } else if (info.totalHours < 8) {
          // 工时不足8小时的日期
          lowWorkDays.push({
            date: dateStr,
            hours: info.totalHours
          });
        }
      }
      
      // 按日期排序
      lowWorkDays.sort((a, b) => a.date.localeCompare(b.date));
      noWorkDays.sort((a, b) => a.date.localeCompare(b.date));
      
      // 计算有效工作日（有工时记录的日期）的总工时和平均饱和度
      const effectiveWorkDays = Object.values(dailyHours).filter(day => day.hasWorkRecord);
      const effectiveTotalHours = effectiveWorkDays.reduce((sum, day) => sum + day.totalHours, 0);
      const effectiveAvgSaturation = effectiveWorkDays.length > 0 ? 
        (effectiveTotalHours / (effectiveWorkDays.length * 8)) * 100 : 0;
      
      console.log('统计结果:', {
        member,
        effectiveWorkDays: effectiveWorkDays.length,
        effectiveTotalHours,
        effectiveAvgSaturation,
        lowWorkDays: lowWorkDays.length,
        noWorkDays: noWorkDays.length
      });
      
      // 生成提示文本
      const prompt = this._generateSummaryPrompt(
        member,
        totalTasks,
        records.filter(r => r.status === '已完成').length,
        effectiveAvgSaturation,
        taskTypes,
        effectiveWorkDays.length,
        effectiveTotalHours,
        lowWorkDays,
        noWorkDays
      );
      
      // 调用AI生成总结
      try {
        const summary = await deepSeekAPI.summarizeText(prompt);
        summaries.push({
          name: member,
          content: summary.content
        });
      } catch (error) {
        console.error(`生成${member}的总结失败:`, error);
        // 如果AI生成失败，使用默认总结
        summaries.push({
          name: member,
          content: this._generateDefaultSummary(
            member, 
            totalTasks, 
            effectiveAvgSaturation, 
            taskTypes, 
            lowWorkDays,
            noWorkDays
          )
        });
      }
    }
    
    return summaries;
  }
  
  /**
   * 生成总结提示文本
   * @private
   */
  _generateSummaryPrompt(member, totalTasks, completedTasks, avgSaturation, taskTypes, workDays, totalHours, lowWorkDays, noWorkDays) {
    const typeDistribution = Object.entries(taskTypes)
      .map(([type, count]) => `${type}: ${count}个任务`)
      .join('\n');
    
    // 格式化工时不足的日期
    let lowWorkDaysText = '无';
    let lowWorkDaysDetail = '';
    if (lowWorkDays.length > 0) {
      lowWorkDaysText = lowWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日: ${d.hours.toFixed(1)}小时`;
      }).join('\n');
      
      lowWorkDaysDetail = lowWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日（${d.hours.toFixed(1)}小时）`;
      }).join('、');
    }

    // 格式化未填写工时的日期
    let noWorkDaysText = '无';
    let noWorkDaysDetail = '';
    if (noWorkDays.length > 0) {
      noWorkDaysText = noWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      }).join('\n');
      
      noWorkDaysDetail = noWorkDays.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      }).join('、');
    }
    
    return `
请对团队成员${member}的工作情况进行分析和总结，以下是相关数据：

1. 工作量概况：
- 有效工作天数：${workDays}天
- 总任务数：${totalTasks}个
- 总工时：${totalHours.toFixed(1)}小时
- 平均工作饱和度：${avgSaturation.toFixed(1)}%

2. 任务类型分布：
${typeDistribution}

3. 工时异常情况：
a) 工时不足8小时的日期：
${lowWorkDaysText}

b) 未填写工时的日期：
${noWorkDaysText}

请从以下几个方面进行分析，使用HTML格式输出，要求段落分明、结构清晰：

<p><strong>一、工作量和效率评估</strong></p>
<p>（分析工作量情况，说明总体工作饱和度）</p>

<p><strong>二、任务分布和专注度</strong></p>
<p>（分析任务类型分布情况）</p>

<p><strong>三、工作饱和度分析</strong></p>
<p>（重点说明：${
  lowWorkDays.length > 0 || noWorkDays.length > 0 
    ? `存在以下工时异常情况：
      ${lowWorkDays.length > 0 ? `\n1. 在${lowWorkDaysDetail}这些日期工时不足8小时` : ''}
      ${noWorkDays.length > 0 ? `\n2. 在${noWorkDaysDetail}这些日期未填写工时` : ''}`
    : '所有工作日的工时都达到或超过8小时，工作饱和度良好。'
}）</p>

<p><strong>四、改进建议</strong></p>
<p>（${
  lowWorkDays.length > 0 || noWorkDays.length > 0
    ? '针对工时异常的情况，提供具体的改进建议：\n' +
      '1. 关于工时填写的规范性\n' +
      '2. 关于工作时间的合理安排'
    : '提供保持良好工作状态的建议'
}）</p>

请用简洁专业的语言，生成300字左右的总结。每个段落之间要有明显的分隔。在工作饱和度分析部分，必须明确列出工时异常的具体日期。
`;
  }
  
  /**
   * 生成默认总结（当AI生成失败时使用）
   * @private
   */
  _generateDefaultSummary(member, totalTasks, avgSaturation, taskTypes, lowWorkDays, noWorkDays) {
    const taskTypeText = Object.entries(taskTypes)
      .map(([type, count]) => `${type}(${count})`)
      .join('、');
    
    let workTimeAnomalyHtml = '';
    
    // 处理工时异常情况
    if (lowWorkDays.length > 0 || noWorkDays.length > 0) {
      let anomalyDetails = '<ul style="margin-left: 20px; margin-bottom: 12px;">';
      
      // 添加工时不足的日期
      if (lowWorkDays.length > 0) {
        anomalyDetails += '<li><strong>工时不足的日期：</strong></li>';
        lowWorkDays.forEach(d => {
          const date = new Date(d.date);
          anomalyDetails += `<li>${date.getMonth() + 1}月${date.getDate()}日：实际工时${d.hours.toFixed(1)}小时，不足8小时</li>`;
        });
      }
      
      // 添加未填写工时的日期
      if (noWorkDays.length > 0) {
        anomalyDetails += '<li><strong>未填写工时的日期：</strong></li>';
        noWorkDays.forEach(d => {
          const date = new Date(d.date);
          anomalyDetails += `<li>${date.getMonth() + 1}月${date.getDate()}日：未填写工时</li>`;
        });
      }
      
      anomalyDetails += '</ul>';
      
      workTimeAnomalyHtml = `
        <p><strong>工时异常情况：</strong></p>
        ${anomalyDetails}
        <p>建议：</p>
        <ol style="margin-left: 20px; margin-bottom: 12px;">
          <li>请及时填写每日工时，保证工时记录的完整性</li>
          <li>合理安排工作时间，确保日常工作饱和度</li>
          <li>如遇特殊情况，请及时与团队沟通说明</li>
        </ol>
      `;
    } else {
      workTimeAnomalyHtml = `<p><strong>工作饱和度：</strong>所有工作日的工时都达到或超过8小时，工作状态良好。</p>`;
    }
    
    return `
      <p><strong>工作概况：</strong>${member}在统计期间共承担了${totalTasks}个任务，平均工作饱和度为${avgSaturation.toFixed(1)}%。</p>
      
      <p><strong>任务类型：</strong>主要包括${taskTypeText}。</p>
      
      ${workTimeAnomalyHtml}
      
      <p><strong>建议：</strong>${
        lowWorkDays.length > 0 || noWorkDays.length > 0 
          ? '请重视工时填写的规范性，保证每日工作量达到预期要求。同时建议提前做好任务规划，合理分配工作时间，提高工作效率。'
          : '继续保持良好的工作状态，合理分配任务时间。'
      }</p>
    `;
  }
  
  /**
   * 生成Excel分析报告
   */
  async generateReport(data) {
    try {
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 1. 工作量统计表
      const workloadStats = this._generateWorkloadStats(data);
      const workloadSheet = XLSX.utils.json_to_sheet(workloadStats);
      XLSX.utils.book_append_sheet(workbook, workloadSheet, '工作量统计');
      
      // 2. 任务完成情况
      const taskCompletion = this._generateTaskCompletion(data);
      const taskSheet = XLSX.utils.json_to_sheet(taskCompletion);
      XLSX.utils.book_append_sheet(workbook, taskSheet, '任务完成情况');
      
      // 3. 每日工作详情
      const dailyDetails = this._generateDailyDetails(data);
      const detailSheet = XLSX.utils.json_to_sheet(dailyDetails);
      XLSX.utils.book_append_sheet(workbook, detailSheet, '每日工作详情');
      
      // 生成Excel文件
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // 创建Blob对象
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      return blob;
    } catch (error) {
      console.error('生成报告失败:', error);
      throw new Error('生成报告失败: ' + error.message);
    }
  }
  
  /**
   * 生成工作量统计数据
   * @private
   */
  _generateWorkloadStats(data) {
    const stats = {};
    
    data.forEach(row => {
      if (!stats[row.member]) {
        stats[row.member] = {
          '成员': row.member,
          '任务数量': 0,
          '总工时': 0
        };
      }
      
      stats[row.member]['任务数量']++;
      stats[row.member]['总工时'] += row.actualHours;
    });
    
    const uniqueDates = new Set(data.map(row => row.date.toISOString().split('T')[0]));
    
    return Object.values(stats).map(stat => ({
      ...stat,
      '平均日工时': stat['总工时'] / uniqueDates.size
    }));
  }
  
  /**
   * 生成任务完成情况数据
   * @private
   */
  _generateTaskCompletion(data) {
    const completion = {};
    
    data.forEach(row => {
      const key = `${row.member}-${row.taskType}`;
      if (!completion[key]) {
        completion[key] = {
          '成员': row.member,
          '任务类型': row.taskType,
          '任务数量': 0,
          '预估工时': 0,
          '实际工时': 0
        };
      }
      
      completion[key]['任务数量']++;
      completion[key]['预估工时'] += row.estimatedHours;
      completion[key]['实际工时'] += row.actualHours;
    });
    
    return Object.values(completion).map(item => ({
      ...item,
      '工时差异': item['实际工时'] - item['预估工时']
    }));
  }
  
  /**
   * 生成每日工作详情数据
   * @private
   */
  _generateDailyDetails(data) {
    return data.map(row => ({
      '日期': row.date.toISOString().split('T')[0],
      '成员': row.member,
      '任务名称': row.taskName,
      '任务类型': row.taskType,
      '预估工时': row.estimatedHours,
      '实际工时': row.actualHours
    }));
  }
}

// 创建Excel分析器实例
const excelAnalyzer = new ExcelAnalyzer();

// 导出实例
window.excelAnalyzer = excelAnalyzer; 