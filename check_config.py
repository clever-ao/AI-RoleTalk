# -*- coding: utf-8 -*-
"""
检查配置是否正确加载
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "backend"))

print("=" * 60)
print("Check Config")
print("=" * 60)

# 1. 检查 .env 文件是否存在
env_file = project_root / ".env"
print(f"\n1. .env file: {'EXISTS' if env_file.exists() else 'NOT FOUND'}")
if env_file.exists():
    print(f"   Path: {env_file}")
    print(f"   Content:")
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                if 'API_KEY' in line and '=' in line:
                    key, value = line.split('=', 1)
                    if len(value) > 10:
                        value = value[:6] + '...' + value[-4:]
                    print(f"   {key}={value}")
                else:
                    print(f"   {line}")

# 2. 测试 dotenv 加载
print(f"\n2. Test dotenv:")
try:
    from dotenv import load_dotenv
    load_dotenv(env_file)
    print("   OK: load_dotenv() executed")

    import os
    demo_mode = os.getenv("DEMO_MODE", "NOT SET")
    api_key = os.getenv("DEEPSEEK_API_KEY", "NOT SET")

    print(f"\n3. Env values:")
    print(f"   DEMO_MODE = '{demo_mode}'")
    print(f"   DEMO_MODE (bool) = {demo_mode.lower() == 'true'}")

    if api_key == "NOT SET":
        print(f"   DEEPSEEK_API_KEY = NOT SET")
    else:
        print(f"   DEEPSEEK_API_KEY = CONFIGURED ({api_key[:8]}...{api_key[-4:]})")

except Exception as e:
    print(f"   ERROR: {e}")

# 4. 测试 config.py 加载
print(f"\n4. Test backend.config:")
try:
    from backend.config import DEMO_MODE, DEEPSEEK_API_KEY, UNIFIED_API_CONFIG

    print(f"   DEMO_MODE = {DEMO_MODE} ({'DEMO MODE' if DEMO_MODE else 'REAL API MODE'})")
    if DEEPSEEK_API_KEY:
        print(f"   DEEPSEEK_API_KEY = OK ({DEEPSEEK_API_KEY[:8]}...{DEEPSEEK_API_KEY[-4:]})")
    else:
        print(f"   DEEPSEEK_API_KEY = NOT CONFIGURED")
    print(f"   Model = {UNIFIED_API_CONFIG['api_model']}")

except Exception as e:
    print(f"   ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
