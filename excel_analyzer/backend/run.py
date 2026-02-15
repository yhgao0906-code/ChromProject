"""
服务启动脚本
"""
import os
import uvicorn
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

if __name__ == "__main__":
    # 获取配置
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    # 启动服务
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug,
        workers=1
    ) 