# -*- coding: utf-8 -*-
"""
数据模型 & 角色提示词加载 & 演示模式响应
"""

import importlib.util
from pydantic import BaseModel

from .config import (
    BACKGROUND_DIR,
    CHARACTER_FILES,
    MODE_PROMPT_MAP,
    MODE_NAME_MAP,
    MOCK_DATA_DIR,
    MODEL_DATA_DIR,
    VOICE_FILE_NAME,
)


# ============ 数据模型 ============

class ChatMessage(BaseModel):
    """单条聊天消息"""
    role: str  # "user", "assistant", "system"
    content: str


class ChatRequest(BaseModel):
    """
    聊天请求体
    
    - model: 实际调用的 API 模型名（如 deepseek-chat）
    - messages: 对话消息列表
    - stream: 是否流式返回
    - character_id: 角色 ID（如 loxd, lzjp, yjsds）
    - mode: 对话模式（praise/roast/roundtable/debate）
    """
    model: str
    messages: list[ChatMessage]
    stream: bool = True
    character_id: str = ""
    mode: str = "debate"


class DebateCreateRequest(BaseModel):
    """
    创建辩论请求体
    
    - topic: 辩题
    - characters: 选中的角色ID列表（将随机分配到正反方）
    - debate_id: 可选，不传则自动生成
    """
    topic: str
    characters: list[str]  # 角色ID列表
    debate_id: str = ""  # 不传则自动生成


class DebateActionRequest(BaseModel):
    """
    辩论操作请求体（发言、下一步等）
    
    - debate_id: 辩论ID
    - action: 操作类型（next_speech/end_debate/get_status）
    - user_message: 用户输入（可选，如评委提问、观众反馈）
    """
    debate_id: str
    action: str = "next_speech"  # next_speech | end_debate | get_status
    user_message: str = ""


# ============ 角色提示词加载 ============

def load_character_prompt(character_id: str, mode: str) -> str:
    """
    根据角色 ID 和对话模式，动态加载并拼接完整的系统提示词。
    
    流程：
    1. 从 background/{character_id}.py 中加载 base_prompt
    2. 如果有指定模式，追加对应的模式提示词
    3. 返回完整的 system prompt 字符串
    
    Args:
        character_id: 角色标识符，如 'loxd', 'lzjp'
        mode: 对话模式，如 'debate', 'praise'
    
    Returns:
        完整的系统提示词字符串
    """
    if character_id not in CHARACTER_FILES:
        return "你是一个有用的 AI 助手。"
    
    file_name = CHARACTER_FILES[character_id]
    module_path = BACKGROUND_DIR / f"{file_name}.py"
    
    if not module_path.exists():
        return "你是一个有用的 AI 助手。"
    
    # 动态加载角色模块
    spec = importlib.util.spec_from_file_location(f"character_{character_id}", str(module_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    # 获取 base_prompt
    base_prompt = getattr(module, "base_prompt", "你是一个有用的 AI 助手。")
    
    # 如果指定了模式且该模式存在，追加模式提示词
    mode_var_name = MODE_PROMPT_MAP.get(mode)
    if mode_var_name:
        mode_prompt = getattr(module, mode_var_name, None)
        if mode_prompt:
            full_prompt = base_prompt.strip() + "\n\n" + mode_prompt.strip()
            return full_prompt
    
    return base_prompt


# ============ 演示模式响应 ============

def get_demo_voice_response(messages: list[ChatMessage], model: str, character_id: str = "", mode: str = "debate") -> dict:
    """
    演示模式：返回基于角色提示词的伪数据响应
    
    在演示模式下，不调用真实 API，而是：
    1. 加载对应角色的完整提示词（base_prompt + 模式提示词）
    2. 将提示词内容作为「AI 回复」返回，让前端能预览不同角色的说话风格
    
    Args:
        messages: 用户消息列表
        model: API 模型名
        character_id: 角色ID
        mode: 对话模式
    
    Returns:
        包含 content, voiceUrl, voiceText, characterId, mode 的字典
    """
    user_msg = messages[-1].content if messages else ""
    
    # 加载完整的角色提示词（base + mode）
    full_prompt = load_character_prompt(character_id, mode)
    
    # 获取角色和模式的中文名（用于标识）
    char_name = CHARACTER_FILES.get(character_id, character_id)
    mode_name = MODE_NAME_MAP.get(mode, mode)
    
    # 构建角色专属语音文件 URL（如 /api/voice/loxd.wav）
    # 优先使用对应角色的 .wav 文件，通过 static_files 的多目录查找机制定位
    character_voice = f"{character_id}.wav" if character_id else VOICE_FILE_NAME
    voice_url = f"/api/voice/{character_voice}"
    
    # 调试输出：确认生成的语音 URL
    print(f"[DEBUG] get_demo_voice_response - character_id: '{character_id}', character_voice: '{character_voice}', voice_url: '{voice_url}'")
    
    # 用提示词作为伪数据回复文本（只返回纯提示词内容，不加额外标识）
    # 不截断，完整返回提示词，让前端处理显示和滚动
    demo_text = full_prompt
    
    result = {
        "content": demo_text,
        "voiceUrl": voice_url,       # 对应角色的语音文件（如 loxd.wav）
        "voiceText": demo_text,      # 展开文本：角色提示词内容
        "model": model,
        "characterId": character_id,
        "mode": mode,
    }
    
    print(f"[DEBUG] 返回的 voiceUrl: {result['voiceUrl']}")
    return result
