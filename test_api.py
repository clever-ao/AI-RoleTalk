# -*- coding: utf-8 -*-
"""
快速测试 DeepSeek API 连接
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 加载 .env
from dotenv import load_dotenv
load_dotenv(project_root / ".env")

import os
import httpx
from backend.config import UNIFIED_API_CONFIG

def test_api():
    """测试 API 连接"""
    print("=" * 60)
    print("🧪 测试 DeepSeek API 连接")
    print("=" * 60)

    api_base = UNIFIED_API_CONFIG.get("base_url", "https://api.deepseek.com/v1")
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    api_model = UNIFIED_API_CONFIG.get("api_model", "deepseek-v4-flash")

    print(f"\n📌 配置信息:")
    print(f"   模型: {api_model}")
    print(f"   API: {api_base}")
    print(f"   Key: {api_key[:10]}...{api_key[-6:]}" if api_key else "   Key: ❌ 未设置")

    if not api_key:
        print("\n❌ 错误: 未配置 DEEPSEEK_API_KEY")
        return False

    print(f"\n🚀 正在调用 {api_model} ...")

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": api_model,
                    "messages": [
                        {"role": "user", "content": "你好，请用一句话介绍你自己。"}
                    ],
                    "stream": False,
                }
            )

            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                usage = result.get("usage", {})

                print(f"\n✅ API 调用成功!")
                print(f"\n📝 模型回复:")
                print(f"   {content}")
                print(f"\n📊 Token 使用:")
                print(f"   输入: {usage.get('prompt_tokens', 'N/A')}")
                print(f"   输出: {usage.get('completion_tokens', 'N/A')}")
                print(f"   总计: {usage.get('total_tokens', 'N/A')}")

                return True
            else:
                print(f"\n❌ API 调用失败!")
                print(f"   HTTP 状态码: {response.status_code}")
                print(f"   错误信息: {response.text}")
                return False

    except Exception as e:
        print(f"\n❌ 异常: {str(e)}")
        return False
    finally:
        print("\n" + "=" * 60)

if __name__ == "__main__":
    success = test_api()
    sys.exit(0 if success else 1)
