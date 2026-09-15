# -*- coding: utf-8 -*-
"""
简化版辩论服务 - 确保稳定运行
"""

import os
import httpx
from typing import Optional
from pathlib import Path

# 加载 .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except:
    pass

# 配置
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
MODEL = "deepseek-v4-flash"
BASE_URL = "https://api.deepseek.com/v1"

print(f"\n[SimpleConfig] DEMO_MODE={DEMO_MODE}, API_KEY={'SET' if API_KEY else 'NOT_SET'}")


def call_deepseek_api(prompt: str, speaker_name: str) -> str:
    """调用 DeepSeek API 生成发言"""
    if not API_KEY:
        raise Exception("API Key not configured")

    print(f"[API] Calling {MODEL} for {speaker_name}...")

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "请开始你的发言。"}
    ]

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            f"{BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": messages,
                "stream": False,
            }
        )

        if response.status_code != 200:
            raise Exception(f"API error {response.status_code}: {response.text}")

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        print(f"[API] Success! Generated {len(content)} chars")
        return content


def generate_speech(speaker: dict, topic: str, is_pro: bool) -> str:
    """生成发言内容（根据模式选择）"""

    # 构建提示词
    side = "正方" if is_pro else "反方"
    prompt = f"""你是一位专业的辩论选手，担任{side}{speaker.get('position', '一辩')}。

## 基本信息
- 姓名：{speaker.get('name', '未知')}
- 阵营：{side}
- 辩题：{topic}

## 任务
请以{speaker.get('name', '该选手')}的身份，发表一段{side}的辩论发言。
要求：
1. 观点明确，逻辑清晰
2. 有说服力和感染力
3. 长度在200-400字之间
4. 符合{side}{speaker.get('position', '一辩')}的角色定位

请直接开始发言，不要加前缀说明。"""

    print(f"\n[Speech] Prompt for {speaker.get('name')}:")
    print("-" * 60)
    print(prompt[:200] + "...")
    print("-" * 60)

    # 根据模式选择
    if DEMO_MODE:
        # 演示模式
        content = f"[演示模式] 我是{side}{speaker.get('position', '一辩')}{speaker.get('name', '')}。\n\n关于「{topic}」这个辩题，我方的核心观点是...\n\n（这是模拟内容，设置DEMO_MODE=false可启用真实AI）"
        print(f"[Speech] Using DEMO mode")
        return content
    else:
        # 真实 API 模式
        try:
            content = call_deepseek_api(prompt, speaker.get('name', 'Unknown'))
            return content
        except Exception as e:
            print(f"[Speech] API failed: {e}, falling back to demo")
            return f"[API失败] 我是{side}{speaker.get('position', '一辩')}{speaker.get('name', '')}。\n\n关于「{topic}」...（API调用失败，使用备用内容）"


# 测试
if __name__ == "__main__":
    test_speaker = {"name": "测试选手", "position": "一辩"}
    result = generate_speech(test_speaker, "科技发展是否让人类更幸福", True)
    print("\n=== RESULT ===")
    print(result)
