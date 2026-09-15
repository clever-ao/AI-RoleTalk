# -*- coding: utf-8 -*-
"""
配置项 - 集中管理所有配置常量
"""

import os
from pathlib import Path

# ============ 首先加载 .env 文件 ============
try:
    from dotenv import load_dotenv
    # config.py 在 backend/ 目录下，.env 在 chat-app/ 目录下
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[Config] OK: Loaded .env config: {env_path.name}")
    else:
        print(f"[Config] WARNING: .env not found: {env_path}")
except Exception as e:
    print(f"[Config] ERROR: Failed to load .env: {e}")

# ============ 路径配置 ============

# main.py 在 e:/demo/chat-app/backend/main.py
# 所以从 main.py 往上 1 级到 chat-app，再往上 1 级到 demo
PROJECT_ROOT = Path(__file__).parent.parent.parent
MOCK_DATA_DIR = PROJECT_ROOT / "mock-data"
BACKGROUND_DIR = Path(__file__).parent / "background"
MODEL_DATA_DIR = PROJECT_ROOT / "chat-app" / "public" / "model-data" / "audio"  # 角色语音文件目录
VOICE_FILE_NAME = "custom_voice.mp3"

# ============ 统一 API 配置（所有角色共用同一个 API） ============

UNIFIED_API_CONFIG = {
    "provider": "openai_compatible",
    "api_model": "deepseek-v4-flash",  # 使用 DeepSeek V4 Flash 模型（快速、便宜）
    "base_url": "https://api.deepseek.com/v1",
}

# ============ 角色配置 ============

# 角色ID -> 文件名映射（character_id 对应 background 目录下的 .py 文件）
CHARACTER_FILES = {
    "loxd": "loxd",         # 罗翔
    "dsmzvu": "dsmzvu",     # 董明珠
    "funzna": "funzna",     # 芙宁娜
    "lqxcyj": "lqxcyj",     # 刘晓艳
    "lzjp": "lzjp",         # 雷军
    "mayp": "mayp",         # 马云
    "sjytqi": "sjytqi",     # 三月七
    "yjsds": "yjsds",       # 老教授
}

# 模式ID -> 提示词变量名映射
MODE_PROMPT_MAP = {
    "praise": "kwkw_prompt",      # 夸夸模式
    "roast": "mama_prompt",       # 骂骂模式
    "roundtable": "yrvo_prompt",   # 圆桌会议模式
    "debate": "debate_prompt",     # 辩论模式
}

# 模式ID -> 中文名映射（用于演示模式显示）
MODE_NAME_MAP = {
    "praise": "夸夸模式",
    "roast": "骂骂模式",
    "roundtable": "圆桌会议",
    "debate": "辩论模式",
}

# ============ 运行时配置 ============

# 演示模式开关（true=使用固定模板文本，false=调用真实 DeepSeek API）
# 优先从 .env 环境变量读取，默认关闭演示模式（调用真实API）
_DEMO_MODE_ENV = os.getenv("DEMO_MODE", "false").lower()
DEMO_MODE = _DEMO_MODE_ENV == "true"
print(f"[Config] DEMO_MODE={DEMO_MODE} (来源: 环境变量='{_DEMO_MODE_ENV}')")

# API 密钥（从环境变量读取，优先使用 DEEPSEEK_API_KEY）
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# ============ 配置加载确认（启动时显示） ============
print(f"\n{'='*60}")
print(f"[Config] Configuration Loaded")
print(f"   DEMO_MODE: {DEMO_MODE} ({'DEMO MODE' if DEMO_MODE else 'REAL API MODE'})")
if DEEPSEEK_API_KEY:
    print(f"   DEEPSEEK_API_KEY: CONFIGURED ({DEEPSEEK_API_KEY[:10]}...)")
else:
    print(f"   DEEPSEEK_API_KEY: NOT CONFIGURED")
print(f"   Model: {UNIFIED_API_CONFIG['api_model']}")
print(f"{'='*60}\n")
