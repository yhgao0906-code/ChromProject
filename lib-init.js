/**
 * 库初始化脚本
 * @description 初始化第三方库，确保它们正确加载到全局变量
 */

// 确保docx库正确加载到全局变量
(function initializeLibraries() {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLibs);
  } else {
    initLibs();
  }
  
  function initLibs() {
    // 初始化docx库
    if (typeof window !== 'undefined') {
      window.docx = window.docx || {};
      console.log('docx库加载状态:', window.docx);
      
      // 如果docx库没有正确加载，尝试从全局变量获取
      if (!window.docx || Object.keys(window.docx).length === 0) {
        // 检查是否有其他可能的导出方式
        if (typeof docx !== 'undefined') {
          window.docx = docx;
          console.log('从全局变量docx加载成功');
        } else {
          // 创建占位符对象，避免运行时错误
          window.docx = {
            Document: function() { console.warn('docx.Document not available'); },
            Paragraph: function() { console.warn('docx.Paragraph not available'); },
            Packer: { 
              toBlob: function() { 
                return Promise.reject(new Error('docx library not loaded')); 
              } 
            }
          };
          console.warn('docx库未正确加载，使用占位符');
        }
      }
    }
    
    // 标记库初始化完成
    window.libsInitialized = true;
    console.log('Libraries initialization completed');
  }
})();
