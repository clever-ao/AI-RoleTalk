# -*- coding: utf-8 -*-
"""
模型调用服务 - 统一 API 调用逻辑
"""

import os

from fastapi import HTTPException

from .config import UNIFIED_API_CONFIG, DEMO_MODE
from .models import ChatMessage, load_character_prompt, get_demo_voice_response


async def call_chat_api(
    messages: list[ChatMessage],
    model: str,
    character_id: str = "",
    mode: str = "debate",
    stream: bool = False,
) -> dict:
    """
    调用聊天 API（演示模式或真实 API）
    
    流程：
    1. 根据 character_id + mode 加载角色提示词，构造 system message
    2. 演示模式：返回模拟响应
    3. 真实模式：调用统一 API（如 DeepSeek）
    
    Args:
        messages: 用户消息列表
        model: API 模型名
        character_id: 角色ID
        mode: 对话模式
        stream: 是否流式返回
    
    Returns:
        标准化的响应字典
    """
    # 加载角色提示词，构造完整消息列表
    system_prompt = load_character_prompt(character_id, mode)
    messages_with_system = [
        {"role": "system", "content": system_prompt},
        * [{"role": m.role, "content": m.content} for m in messages]
    ]
    
    # ===== 演示模式 =====
    if DEMO_MODE:
        return _demo_response(messages, model, character_id, mode, stream)
    
    # ===== 真实 API 模式 =====
    return await _real_api_response(messages_with_system, model, character_id, mode)


def _demo_response(
    messages: list[ChatMessage],
    model: str,
    character_id: str,
    mode: str,
    stream: bool,
) -> dict:
    """演示模式的响应处理"""
    result = get_demo_voice_response(messages, model, character_id, mode)
    
    # 调试输出：确认角色 ID 和语音 URL
    print(f"[DEBUG] 演示模式响应 - character_id: {character_id}, voiceUrl: {result['voiceUrl']}")
    
    response = {
        "id": f"chatcmpl-demo-{int(__import__('time').time())}",
        "object": "chat.completion",
        "model": model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": result["content"]},
            "finish_reason": "stop",
        }],
        "content": result["content"],
        "voiceUrl": result["voiceUrl"],       # 角色专属语音文件（如 /api/voice/loxd.wav）
        "voiceText": result["voiceText"],      # 展开文本：角色提示词内容
        "characterId": result.get("characterId", ""),
        "mode": result.get("mode", ""),
    }
    
    print(f"[DEBUG] 完整响应 voiceUrl: {response['voiceUrl']}")
    return response


async def _real_api_response(
    messages_with_system: list[dict],
    model: str,
    character_id: str,
    mode: str,
) -> dict:
    """调用真实 API 的响应处理"""
    try:
        import httpx
        
        api_base = UNIFIED_API_CONFIG.get("base_url", "https://api.deepseek.com/v1")
        api_key = os.getenv("DEEPSEEK_API_KEY", os.getenv("OPENAI_API_KEY", ""))
        api_model = UNIFIED_API_CONFIG.get("api_model", "deepseek-v4-flash")
        
        # 未配置 API 密钥
        if not api_key:
            return _error_response(api_model, character_id, mode, "未配置 API 密钥。请设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY 环境变量。")
        
        # 发起 API 请求
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": api_model,
                    "messages": messages_with_system,
                    "stream": False,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"API 调用失败: {response.text}"
                )
            
            api_result = response.json()
            full_content = api_result["choices"][0]["message"]["content"]
            
            return {
                "id": api_result.get("id", "chatcmpl-unknown"),
                "object": "chat.completion",
                "model": api_model,
                "choices": api_result["choices"],
                "content": full_content,
                "voiceUrl": "",
                "voiceText": full_content,
                "characterId": character_id,
                "mode": mode,
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API 调用异常: {str(e)}")


def _error_response(model: str, character_id: str, mode: str, error_msg: str) -> dict:
    """构造错误响应"""
    content = f"错误：{error_msg}"
    return {
        "id": f"chatcmpl-error",
        "object": "chat.completion",
        "model": model,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": "stop",
        }],
        "content": content,
        "voiceUrl": "",
        "voiceText": content,
        "characterId": character_id,
        "mode": mode,
    }
