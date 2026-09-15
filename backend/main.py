# -*- coding: utf-8 -*-
"""
多角色 AI 聊天后端服务
========================
支持角色扮演 + 多模式对话 + 语音回复

架构：
- config.py      → 配置项（路径、API、角色/模式映射）
- models.py      → 数据模型 + 角色提示词加载
- static_files.py→ 静态文件服务（语音文件）
- chat_service.py→ 模型调用逻辑（统一 API）
- routes.py      → API 路由定义
- main.py        → 入口文件（本文件）
"""

import sys
import io
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import DEMO_MODE, MOCK_DATA_DIR, VOICE_FILE_NAME
from .routes import register_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 修复 Windows 控制台编码问题
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

    print("=" * 50)
    print("多角色 AI 聊天服务启动 [OK]")
    print(f"   演示模式: {'开启' if DEMO_MODE else '关闭'}")
    print(f"   语音文件目录: {MOCK_DATA_DIR}")
    print(f"   语音文件存在: {(MOCK_DATA_DIR / VOICE_FILE_NAME).exists()}")
    print("=" * 50)
    yield
    print("服务关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title="多角色 AI 聊天 API",
    description="支持多种角色扮演、多模式对话的统一聊天接口，支持语音回复",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册所有路由
register_routes(app)

# 挂载静态文件目录（用于提供头像图片等静态资源）
# 前端请求 /model-data/pic/xxx.png → public/model-data/pic/xxx.png
from pathlib import Path
PUBLIC_DIR = Path(__file__).parent.parent / "public"
if PUBLIC_DIR.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="public")
    print(f"   静态文件目录: {PUBLIC_DIR} (已挂载)")
else:
    print(f"   WARNING: 静态文件目录不存在: {PUBLIC_DIR}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
