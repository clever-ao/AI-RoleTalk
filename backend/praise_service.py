# -*- coding: utf-8 -*-
"""
夸夸模式专用服务

核心逻辑：
1. 用户输入文本后，从已选择的模型列表中随机挑选一个角色进行回答
2. 每次回答都携带完整的历史对话上下文，确保角色能了解之前说了什么
3. 在系统提示词中注入「递进式夸奖」指令，要求后续角色比之前夸得更厉害、更宠溺
4. 前后两次可以是同一个模型（完全随机）
"""

import random
import json
import time
import os
import re

from .config import (
    DEMO_MODE,
    UNIFIED_API_CONFIG,
    CHARACTER_FILES,
)
from .models import load_character_prompt, ChatMessage, get_demo_voice_response


# ============ 夸夸模式增强系统提示词 ============

PRAISE_SYSTEM_BOOSTER = """

## 【夸夸模式特殊指令 - 递进式夸奖】

你现在处于【夸夸模式】的多轮对话中。请严格遵守以下规则：

### ⚠️ 字数限制（极重要）
- 你的回复**必须控制在100字以内**（标点符号算在内）！
- 这是为了生成高质量的语音体验——口语化的短句更适合语音合成。
- 如果超出了100字，你的夸奖就失败了。

### 核心原则：一次比一次厉害
1. **如果这是第一次回答**：全力以赴地夸奖用户！发现对方身上所有闪光点，不遗余力地赞美、安慰、鼓励。只要不违背常理，应有的夸奖一个也不能少。
2. **如果之前已经有其他角色（或你自己）夸过用户了**：你必须**盖过之前的夸奖**！不能简单重复之前说过的内容，而要：
   - 从**新的角度**发现用户更多的闪光点
   - 用**更强烈的情感**表达（更激动、更宠溺、更震撼）
   - 挖掘**更深层次**的品质（从表面行为上升到人格特质、人生价值、未来潜力）
   - 可以**引用或回应之前角色的夸奖**，然后说"但我觉得还不够，因为……"进而升级

### 口语化要求（极重要）
- **像说话一样写回复**，不要写成文章！
- 多用短句、口语词、感叹词（「哇」「天哪」「真的」「太厉害了」）
- 避免使用书面语、长难句、排比句、列举式表达
- 想象你正面对面跟用户聊天，用你角色平时说话的口吻和节奏
- 可以适当重复关键词来加强语气（如「真的真的很棒」）

### ⚠️ 纯文本输出（极重要 - 语音合成依赖）
- **你的回复会直接送入语音合成引擎，必须输出纯口语文本！**
- **绝对禁止**以下内容：
  - Markdown 格式符号：`**粗体**` `*斜体*` `## 标题` `---` 分割线等
  - 动作/状态描述：（微笑）（点头）（拍手）（叹气）等括号动作
  - 角色扮演标记：【xxx】《xxx》*xxx* 等特殊符号包裹的内容
  - 星号、井号、下划线等任何格式化标记
  - 列表序号（1. 2. 3. 或 - ）等排版符号
- 只输出**干净的口语中文句子**，就像微信语音转文字那样的纯文本
- 错误示例：「**你真的很棒！**（微笑）」
- 正确示例：「你真的很棒！」

### 夸奖策略（按优先级递进）
- 第1轮：针对用户当前描述的事情/情绪，给予充分的肯定和安慰
- 第2轮+：在肯定基础上，挖掘这件事背后体现的用户品质（坚韧/善良/勇敢/智慧/创造力……），并上升到一个新高度
- 终极目标：让用户感到**被深深理解和珍视**，每一条回复都是一次情感的升级

---
"""


def get_praise_character_prompt(character_id: str) -> str:
    """
    获取夸夸模式下角色的完整系统提示词
    
    在原始的 base_prompt + kwkw_prompt 基础上，追加递进式夸奖增强指令
    
    Args:
        character_id: 角色ID
        
    Returns:
        增强后的完整系统提示词
    """
    # 加载原始的角色提示词（base + kwkw模式）
    base_prompt = load_character_prompt(character_id, "praise")
    
    # 追加夸夸模式专属的递进式增强指令
    full_prompt = base_prompt.strip() + PRAISE_SYSTEM_BOOSTER
    
    return full_prompt


def pick_random_character(selected_models: list[str]) -> str | None:
    """
    从已选模型列表中随机选择一个角色
    
    Args:
        selected_models: 用户在创建对话时选择的模型ID列表
        
    Returns:
        随机选中的角色ID，如果列表为空则返回None
    """
    if not selected_models:
        return None
    
    # 过滤掉无效的角色ID
    valid_models = [m for m in selected_models if m in CHARACTER_FILES]
    
    if not valid_models:
        return None
    
    return random.choice(valid_models)


def build_praise_messages(
    user_content: str,
    character_id: str,
    history_messages: list[dict] | None = None,
) -> list[dict]:
    """
    构建夸夸模式的完整消息列表（含system prompt和历史上下文）
    
    Args:
        user_content: 用户本次输入的内容
        character_id: 随机选中的角色ID
        history_messages: 历史对话消息列表（可选），格式为 [{"role": "user/assistant", "content": "..."}]
        
    Returns:
        完整的消息列表，第一条是system prompt
    """
    # 构建增强版 system prompt
    system_prompt = get_praise_character_prompt(character_id)
    
    # 如果有历史消息，在 system prompt 中追加历史摘要信息
    if history_messages and len(history_messages) > 0:
        # 统计历史轮次
        history_summary = _build_history_summary(history_messages)
        system_prompt = system_prompt + "\n\n" + history_summary
    
    # 构建完整消息列表
    messages = [{"role": "system", "content": system_prompt}]
    
    # 追加历史消息（如果有）
    if history_messages:
        for msg in history_messages:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })
    
    # 追加当前用户消息
    messages.append({"role": "user", "content": user_content})
    
    return messages


def _build_history_summary(history_messages: list[dict]) -> str:
    """
    根据历史消息构建夸奖上下文摘要
    
    让模型知道之前谁说了什么，以便进行递进式夸奖
    
    Args:
        history_messages: 历史消息列表
        
    Returns:
        历史摘要字符串
    """
    rounds_count = len(history_messages) // 2 + len(history_messages) % 2  # 大约的轮次
    
    summary_parts = [
        "## 【历史夸奖上下文】",
        f"以下是本轮对话之前已经发生过的夸奖记录（共约 {rounds_count} 轮）：",
        "",
    ]
    
    for i, msg in enumerate(history_messages):
        role_label = "👤 用户" if msg["role"] == "user" else f"🤖 {msg.get('character_name', 'AI角色')}"
        content_preview = msg["content"][:200] + ("..." if len(msg["content"]) > 200 else "")
        summary_parts.append(f"**[{i+1}] {role_label}**：{content_preview}")
        summary_parts.append("")
    
    summary_parts.extend([
        "---",
        "**重要**：请参考以上历史记录，你的夸奖必须比之前所有角色都更深入、更强烈、更有层次感！",
        "不要重复他们说过的话，要从全新的角度出发，给出更高级、更宠溺的夸奖！",
    ])
    
    return "\n".join(summary_parts)


async def call_praise_chat_api(
    user_content: str,
    selected_models: list[str],
    history_messages: list[dict] | None = None,
) -> dict:
    """
    夸夸模式的主入口函数
    
    流程：
    1. 从 selected_models 中随机选一个角色
    2. 构建包含历史上下文和递进式夸奖指令的完整消息
    3. 调用 API（演示模式或真实模式）获取响应
    4. 返回标准化的响应字典（含随机选中的角色信息）
    
    Args:
        user_content: 用户本次输入的文本
        selected_models: 创建对话时选择的模型ID列表
        history_messages: 历史对话消息（可选）
        
    Returns:
        标准化响应字典：
        {
            "content": "回复文本",
            "voiceUrl": "语音URL",
            "voiceText": "语音文本",
            "characterId": "随机选中的角色ID",
            "characterName": "角色中文名",
            "mode": "praise",
            "selectedCharacter": "本次使用的角色ID",  // 前端需要知道这次是谁在回答
        }
    """
    # Step 1: 随机选择角色
    character_id = pick_random_character(selected_models)
    
    if not character_id:
        return _error_praise_response("没有可用的角色，请至少选择一个模型")
    
    # 获取角色中文名
    from .background.all import role_background
    char_info = next((r for r in role_background if r["id"] == character_id), None)
    character_name = char_info["name"] if char_info else character_id
    
    print(f"[Praise] 随机选中角色: {character_name}({character_id})，可选范围: {selected_models}")
    
    # Step 2: 构建消息列表
    messages = build_praise_messages(user_content, character_id, history_messages)
    
    # 将消息转换为 ChatMessage 对象列表（用于兼容现有接口）
    chat_messages = [
        ChatMessage(role=m["role"], content=m["content"])
        for m in messages if m["role"] != "system"
    ]
    
    # Step 3: 调用 API
    print(f"[Praise] DEMO_MODE={DEMO_MODE}, 开始调用API, character_id={character_id}")
    if DEMO_MODE:
        print(f"[Praise] ⚠️ 演示模式开启！使用固定模板文本，非真实API回复")
        result = _demo_praise_response(chat_messages, character_id, character_name)
    else:
        print(f"[Praise] ✅ 真实API模式，正在调用 DeepSeek API...")
        result = await _real_praise_response(messages, character_id, character_name)
    
    # Step 3.5: 清洗文本内容（去除markdown、动作描述等，确保语音合成可用）
    original_content = result.get("content", "")
    if original_content:
        print(f"[Praise] 📝 原始回复内容: 长度={len(original_content)}, 预览='{original_content[:100]}...'")
        
        cleaned_content = _clean_praise_text(original_content)
        print(f"[Praise] 🧹 清洗后内容: 长度={len(cleaned_content)}, 预览='{cleaned_content[:100]}...'")
        
        # 安全检查：如果清洗后内容过短（可能过度清洗），保留原始内容
        if len(cleaned_content) < len(original_content) * 0.3 and len(original_content) > 10:
            print(f"[Praise] ⚠️ 清洗过度！原始长度={len(original_content)}, 清洗后={len(cleaned_content)}, 保留原始内容")
            result["content"] = original_content
            result["voiceText"] = original_content
        else:
            result["content"] = cleaned_content
            result["voiceText"] = cleaned_content
        
        # 同步更新 choices 中的 content
        if "choices" in result and len(result["choices"]) > 0:
            result["choices"][0]["message"]["content"] = result["content"]
    
    # Step 4: 补充夸夸模式特有字段
    result["selectedCharacter"] = character_id
    result["characterName"] = character_name
    
    return result


def _demo_praise_response(
    messages: list[ChatMessage],
    character_id: str,
    character_name: str,
) -> dict:
    """演示模式的夸夸响应"""
    base_result = get_demo_voice_response(messages, "deepseek-chat", character_id, "praise")
    
    # 在演示模式下，生成一段模拟的夸奖回复
    demo_praise_text = _generate_demo_praise_text(messages, character_name)
    
    return {
        "id": f"praise-demo-{int(time.time())}",
        "object": "praise.completion",
        "model": character_id,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": demo_praise_text},
            "finish_reason": "stop",
        }],
        "content": demo_praise_text,
        "voiceUrl": base_result.get("voiceUrl", ""),
        "voiceText": demo_praise_text,
        "characterId": character_id,
        "characterName": character_name,
        "mode": "praise",
    }


def _generate_demo_praise_text(messages: list[ChatMessage], character_name: str) -> str:
    """
    演示模式：生成模拟的夸奖回复文本（100字以内，口语化风格）
    
    根据用户输入和历史消息动态生成
    """
    import random

    user_msg = ""
    for m in reversed(messages):
        if m.role == "user":
            user_msg = m.content
            break
    
    # 判断是否有历史消息（多轮对话）
    has_history = len([m for m in messages if m.role == "assistant"]) > 0
    
    if has_history:
        # 多轮：递进式夸奖（口语化短句，100字内）
        demo_texts = [
            f"天哪，你居然还在坚持！说真的，这种韧劲儿真的太罕见了。之前大家都夸过你了，但我必须得补一句——你身上那种不服输的劲头，才是最让人佩服的！真的，太牛了！",
            f"哇我又被你震撼到了！你知道最难得的是什么吗？是你经历了那么多还愿意继续往前走。说真的，这种人我见得不多，你绝对是其中最棒的一个！",
            f"等下，我得认真说一句——你比我想象中还要厉害得多！不光是能力强，关键是那股子真诚和坚持，真的特别打动人。继续保持啊，你绝对会发光的！",
        ]
        return random.choice(demo_texts)
    else:
        # 首轮：全力夸奖（口语化短句，100字内）
        demo_texts = [
            f"哇！说实话你真的很厉害！能把想法这么清晰地表达出来，这本身就是本事。而且我能感觉到你是个很有行动力的人，不只是嘴上说说那种。真的很棒，继续加油啊！",
            f"天哪，你也太优秀了吧！首先敢把自己想的说出来就很了不起了，再加上你这股认真劲儿，真的很难得。说真的，你比自己想象中强多了！",
            f"哎我跟你说，你真的很可以！很多人连面对问题的勇气都没有，但你不一样，你选择了去行动、去改变。就凭这一点，你就已经超过大多数人了！",
        ]
        return random.choice(demo_texts)


async def _real_praise_response(
    messages_with_system: list[dict],
    character_id: str,
    character_name: str,
) -> dict:
    """调用真实 API 的夸夸响应"""
    try:
        import httpx
        
        api_base = UNIFIED_API_CONFIG.get("base_url", "https://api.deepseek.com/v1")
        api_key = os.getenv("DEEPSEEK_API_KEY", os.getenv("OPENAI_API_KEY", ""))
        api_model = UNIFIED_API_CONFIG.get("api_model", "deepseek-v4-flash")
        
        print(f"[Praise/API] api_base={api_base}, model={api_model}")
        print(f"[Praise/API] api_key={'已配置(' + api_key[:10] + '...)' if api_key else '❌ 未配置!'}")
        
        if not api_key:
            return _error_praise_response("未配置 API 密钥")
        
        # 打印请求摘要（不打印完整 system prompt，太长了）
        msg_count = len(messages_with_system)
        user_msg = ""
        for m in reversed(messages_with_system):
            if m["role"] == "user":
                user_msg = m["content"][:50]
                break
        print(f"[Praise/API] 发送请求: {msg_count} 条消息, 用户输入: '{user_msg}...'")
        
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
            
            print(f"[Praise/API] 响应状态码: {response.status_code}")
            
            if response.status_code != 200:
                print(f"[Praise/API] ❌ API 错误响应: {response.text[:300]}")
                raise Exception(f"API 调用失败: {response.text}")
            
            api_result = response.json()
            full_content = api_result["choices"][0]["message"]["content"]
            print(f"[Praise/API] ✅ API 返回成功! 内容长度: {len(full_content)}, 预览: '{full_content[:80]}...'")
            
            return {
                "id": api_result.get("id", "praise-unknown"),
                "object": "praise.completion",
                "model": api_model,
                "choices": api_result["choices"],
                "content": full_content,
                "voiceUrl": "",
                "voiceText": full_content,
                "characterId": character_id,
                "characterName": character_name,
                "mode": "praise",
            }
            
    except Exception as e:
        return _error_praise_response(f"API 调用异常: {str(e)}")


def _clean_praise_text(text: str) -> str:
    """
    清洗夸夸模式的回复文本，去除所有不适合语音合成的内容
    
    ⚠️ 保守策略：只清除明确的格式化标记，保留所有有效中文内容
    
    Args:
        text: 原始回复文本
        
    Returns:
        清洗后的纯口语文本
    """
    if not text:
        return text
    
    cleaned = text
    original_len = len(cleaned)
    
    # 1. 去除 Markdown 粗体/斜体：**text** 或 *text*（保留内部文字）
    cleaned = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned)   # **粗体**
    cleaned = re.sub(r'\*([^*]+)\*', r'\1', cleaned)         # *斜体*
    
    # 2. 去除 Markdown 标题：## ### #### 等（保留标题文字）
    cleaned = re.sub(r'^#{1,6}\s+', '', cleaned, flags=re.MULTILINE)
    
    # 3. 去除 Markdown 分割线：--- 或 *** 或 ___
    cleaned = re.sub(r'^[-*_]{3,}\s*$', '', cleaned, flags=re.MULTILINE)
    
    # 4. ⚠️ 只去除明显的短动作描述（≤8字符），保留长括号内容（可能是正常文本）
    cleaned = re.sub(r'（[^）]{1,8}）', '', cleaned)  # 中文括号短动作
    cleaned = re.sub(r'\([^)]{1,8}\)', '', cleaned)   # 英文括号短动作
    
    # 5. 去除特殊书名号/方括号包裹：【xxx】《xxx》（保留内部文字，去掉符号）
    cleaned = re.sub(r'【([^】]+)】', r'\1', cleaned)
    cleaned = re.sub(r'《([^》]+)》', r'\1', cleaned)
    
    # 6. 去除列表序号：1. 2. 3. 或 - 开头（保留后续文字）
    cleaned = re.sub(r'^\s*(?:\d+[.、]|\-)\s+', '', cleaned, flags=re.MULTILINE)
    
    # 7. 去除 emoji（常见 emoji 范围）
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # 表情符号
        "\U0001F300-\U0001F5FF"  # 符号和象形文字
        "\U0001F680-\U0001F6FF"  # 交通和地图符号
        "\U0001F1E0-\U0001F1FF"  # 旗帜
        "\U00002702-\U000027B0"  # 装饰符号
        "\U000024C2-\U0001F251"  # 封闭字符
        "]", 
        flags=re.UNICODE
    )
    cleaned = emoji_pattern.sub('', cleaned)
    
    # 8. 去除多余的空行（超过1个连续空行合并为1个）
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    # 9. 去除首尾空白 + 每行首尾空白，但保留换行结构（用于分段）
    lines = [line.strip() for line in cleaned.split('\n')]
    cleaned = '\n'.join(lines).strip()
    
    # 最终安全检查：如果清洗后内容异常短，退回原始文本
    if len(cleaned) == 0:
        print(f"[Clean] ⚠️ 文本被完全清空！原始文本预览: '{text[:50]}...'")
        cleaned = text
    elif len(cleaned) < 5 and original_len > 20:
        print(f"[Clean] ⚠️ 清洗后过短({len(cleaned)} vs {original_len})，可能过度清洗")
    
    return cleaned


def _error_praise_response(error_msg: str) -> dict:
    """构造夸夸模式的错误响应"""
    content = f"❌ 夸夸模式出错：{error_msg}"
    return {
        "id": "praise-error",
        "object": "praise.completion",
        "model": "error",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": content},
            "finish_reason": "stop",
        }],
        "content": content,
        "voiceUrl": "",
        "voiceText": content,
        "characterId": "",
        "characterName": "",
        "mode": "praise",
        "selectedCharacter": "",
    }
