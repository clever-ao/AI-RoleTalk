# -*- coding: utf-8 -*-
"""
服务器启动脚本 - 用于直接运行后端服务
解决相对导入问题
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent  # chat-app 目录
sys.path.insert(0, str(project_root))

# 加载 .env 文件（必须在其他导入之前）
from dotenv import load_dotenv
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ 已加载配置文件: {env_path}")
else:
    print(f"⚠️  未找到 .env 文件，使用环境变量或默认值")

# 使用 uvicorn 运行 FastAPI 应用
if __name__ == "__main__":
    import uvicorn
    from backend.config import UNIFIED_API_CONFIG, DEMO_MODE

    print("=" * 60)
    print("🚀 辩论 AI 系统启动中...")
    print(f"📁 项目目录: {project_root}")
    print(f"🤖 模型配置: {UNIFIED_API_CONFIG['api_model']}")
    print(f"🔗 API 地址: {UNIFIED_API_CONFIG['base_url']}")
    print(f"🎭 运行模式: {'演示模式 (DEMO)' if DEMO_MODE else '真实 API 模式'}")
    print("=" * 60)
    
    # 使用导入字符串格式，支持 reload 模式
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 开启热重载，方便开发调试
        log_level="info"
    )
