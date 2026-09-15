# -*- coding: utf-8 -*-
"""
骂骂模式（吐槽模式）专用服务

核心逻辑：
1. 用户输入文本后，从已选择的模型列表中随机挑选一个角色进行回答
2. 每次回答都携带完整的历史对话上下文，确保角色能了解之前说了什么
3. 在系统提示词中注入「递进式吐槽」指令，要求后续角色比之前吐槽得更狠、更扎心
4. 前后两次可以是同一个模型（完全随机）
5. 吐槽风格：幽默、犀利、一针见血，但不恶意攻击，保持"损友"氛围
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


# ============ 骂骂模式增强系统提示词 ============

ROAST_SYSTEM_BOOSTER = """

## 【骂骂模式特殊指令 - 递进式吐槽】

你现在处于【骂骂模式】的多轮对话中。请严格遵守以下规则：

### ⚠️ 字数限制（极重要）
- 你的回复**必须控制在100字以内**（标点符号算在内）！
- 这是为了生成高质量的语音体验——口语化的短句更适合语音合成。
- 如果超出了100字，你的吐槽就失败了。

### 核心原则：一次比一次扎心
1. **如果这是第一次回答**：开始你的吐槽表演！用犀利的视角指出用户的问题、矛盾或搞笑之处。要像损友一样，表面在怼，实际带着关心。
2. **如果之前已经有其他角色（或你自己）吐槽过用户了**：你必须**盖过之前的吐槽**！不能简单重复之前说过的内容，而要：
   - 从**新的角度**挖掘用户更深层的问题或笑点
   - 用**更毒舌但更有趣**的表达方式
   - 结合之前的吐槽进行升级："刚才有人说你xxx，但我觉得真正的问题是……"
   - 可以适当自嘲或调侃自己，增加互动感

### ⚠️ 吐槽边界（极重要）
- **可以吐槽的范围**：
  - 用户的逻辑漏洞、前后矛盾
  - 常见的认知偏差（幸存者偏差、确认偏误等）
  - 人性的弱点（拖延症、选择困难、三分钟热度等）
  - 用户描述中自相矛盾或夸张的地方
  - 以幽默方式指出用户的"凡尔赛"行为
- **绝对不能吐槽的范围**：
  - 外貌、身材、生理缺陷
  - 家庭背景、经济状况
  - 真正的痛苦和创伤经历
  - 歧视性内容（性别、种族、地域等）
  - 任何可能造成真实伤害的内容
- **如果用户表达的是真正的困难或痛苦**，转为温和的鼓励+轻微调侃，不要雪上加霜

### 口语化要求（极重要）
- **像说话一样写回复**，不要写成文章！
- 多用短句、口语词、感叹词（「哎」「天哪」「不是吧」「服了你了」）
- 可以用网络流行语，但要自然不生硬
- 想象你正跟好朋友互怼，用你角色平时说话的口吻和节奏
- 可以适当反问、设问加强语气（如「你确定？」「认真的吗？」）

### ⚠️ 纯文本输出（极重要 - 语音合成依赖）
- **你的回复会直接送入语音合成引擎，必须输出纯口语文本！**
- **绝对禁止**以下内容：
  - Markdown 格式符号：`**粗体**` `*斜体*` `## 标题` `---` 分割线等
  - 动作/状态描述：（翻白眼）（叹气）（扶额）等括号动作
  - 角色扮演标记：【xxx】《xxx》*xxx* 等特殊符号包裹的内容
  - 星号、井号、下划线等任何格式化标记
  - 列表序号（1. 2. 3. 或 - ）等排版符号
- 只输出**干净的口语中文句子**，就像微信语音转文字那样的纯文本
- 错误示例：「**你这也太离谱了！**（翻白眼）」
- 正确示例：「你这也太离谱了吧！」

### 吐槽策略（按优先级递进）
- 第1轮：针对用户当前描述的事情/情绪，找出其中的槽点、笑点或逻辑问题
- 第2轮+：在基础上升级，结合历史吐槽，挖掘更深层的矛盾或更有趣的角度
- 终极目标：让用户**哭笑不得**，每一条回复都是一次"暴击"，但又忍不住想继续聊下去

---
"""


def get_roast_character_prompt(character_id: str) -> str:
    """
    获取骂骂模式下角色的完整系统提示词
    
    在原始的 base_prompt + smm模式（骂骂模式）基础上，追加递进式吐槽增强指令
    
    Args:
        character_id: 角色ID
        
    Returns:
        增强后的完整系统提示词
    """
    # 加载原始的角色提示词（base + smm模式）
    base_prompt = load_character_prompt(character_id, "roast")
    
    # 追加骂骂模式专属的递进式增强指令
    full_prompt = base_prompt.strip() + ROAST_SYSTEM_BOOSTER
    
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


def build_roast_messages(
    user_content: str,
    character_id: str,
    history_messages: list[dict] | None = None,
) -> list[dict]:
    """
    构建骂骂模式的完整消息列表（含system prompt和历史上下文）
    
    Args:
        user_content: 用户本次输入的内容
        character_id: 随机选中的角色ID
        history_messages: 历史对话消息列表（可选），格式为 [{"role": "user/assistant", "content": "..."}]
        
    Returns:
        完整的消息列表，第一条是system prompt
    """
    # 构建增强版 system prompt
    system_prompt = get_roast_character_prompt(character_id)
    
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
    根据历史消息构建吐槽上下文摘要
    
    让模型知道之前谁说了什么，以便进行递进式吐槽
    
    Args:
        history_messages: 历史消息列表
        
    Returns:
        历史摘要字符串
    """
    rounds_count = len(history_messages) // 2 + len(history_messages) % 2  # 大约的轮次
    
    summary_parts = [
        "## 【历史吐槽上下文】",
        f"以下是本轮对话之前已经发生过的吐槽记录（共约 {rounds_count} 轮）：",
        "",
    ]
    
    for i, msg in enumerate(history_messages):
        role_label = "👤 用户" if msg["role"] == "user" else f"🤖 {msg.get('character_name', 'AI角色')}"
        content_preview = msg["content"][:200] + ("..." if len(msg["content"]) > 200 else "")
        summary_parts.append(f"**[{i+1}] {role_label}**：{content_preview}")
        summary_parts.append("")
    
    summary_parts.extend([
        "---",
        "**重要**：请参考以上历史记录，你的吐槽必须比之前所有角色都更狠、更有趣、更有层次感！",
        "不要重复他们说过的话，要从全新的角度出发，给出更高级的吐槽！",
    ])
    
    return "\n".join(summary_parts)


async def call_roast_chat_api(
    user_content: str,
    selected_models: list[str],
    history_messages: list[dict] | None = None,
) -> dict:
    """
    骂骂模式的主入口函数
    
    流程：
    1. 从 selected_models 中随机选一个角色
    2. 构建包含历史上下文和递进式吐槽指令的完整消息
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
            "mode": "roast",
            "selectedCharacter": "本次使用的角色ID",
        }
    """
    # Step 1: 随机选择角色
    character_id = pick_random_character(selected_models)
    
    if not character_id:
        return _error_roast_response("没有可用的角色，请至少选择一个模型")
    
    # 获取角色中文名
    from .background.all import role_background
    char_info = next((r for r in role_background if r["id"] == character_id), None)
    character_name = char_info["name"] if char_info else character_id
    
    print(f"[Roast] 随机选中角色: {character_name}({character_id})，可选范围: {selected_models}")
    
    # Step 2: 构建消息列表
    messages = build_roast_messages(user_content, character_id, history_messages)
    
    # 将消息转换为 ChatMessage 对象列表（用于兼容现有接口）
    chat_messages = [
        ChatMessage(role=m["role"], content=m["content"])
        for m in messages if m["role"] != "system"
    ]
    
    # Step 3: 调用 API
    print(f"[Roast] DEMO_MODE={DEMO_MODE}, 开始调用API, character_id={character_id}")
    if DEMO_MODE:
        print(f"[Roast] ⚠️ 演示模式开启！使用固定模板文本，非真实API回复")
        result = _demo_roast_response(chat_messages, character_id, character_name)
    else:
        print(f"[Roast] ✅ 真实API模式，正在调用 DeepSeek API...")
        result = await _real_roast_response(messages, character_id, character_name)
    
    # Step 3.5: 清洗文本内容（去除markdown、动作描述等，确保语音合成可用）
    original_content = result.get("content", "")
    if original_content:
        print(f"[Roast] 📝 原始回复内容: 长度={len(original_content)}, 预览='{original_content[:100]}...'")
        
        cleaned_content = _clean_roast_text(original_content)
        print(f"[Roast] 🧹 清洗后内容: 长度={len(cleaned_content)}, 预览='{cleaned_content[:100]}...'")
        
        # 安全检查：如果清洗后内容过短（可能过度清洗），保留原始内容
        if len(cleaned_content) < len(original_content) * 0.3 and len(original_content) > 10:
            print(f"[Roast] ⚠️ 清洗过度！原始长度={len(original_content)}, 清洗后={len(cleaned_content)}, 保留原始内容")
            result["content"] = original_content
            result["voiceText"] = original_content
        else:
            result["content"] = cleaned_content
            result["voiceText"] = cleaned_content
        
        # 同步更新 choices 中的 content
        if "choices" in result and len(result["choices"]) > 0:
            result["choices"][0]["message"]["content"] = result["content"]
    
    # Step 4: 补充骂骂模式特有字段
    result["selectedCharacter"] = character_id
    result["characterName"] = character_name
    
    return result


def _demo_roast_response(
    messages: list[ChatMessage],
    character_id: str,
    character_name: str,
) -> dict:
    """演示模式的骂骂响应"""
    base_result = get_demo_voice_response(messages, "deepseek-chat", character_id, "roast")
    
    # 在演示模式下，生成一段模拟的吐槽回复
    demo_roast_text = _generate_demo_roast_text(messages, character_name)
    
    return {
        "id": f"roast-demo-{int(time.time())}",
        "object": "roast.completion",
        "model": character_id,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": demo_roast_text},
            "finish_reason": "stop",
        }],
        "content": demo_roast_text,
        "voiceUrl": base_result.get("voiceUrl", ""),
        "voiceText": demo_roast_text,
        "characterId": character_id,
        "characterName": character_name,
        "mode": "roast",
    }


def _generate_demo_roast_text(messages: list[ChatMessage], character_name: str) -> str:
    """
    演示模式：生成模拟的吐槽回复文本（100字以内，口语化风格）
    
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
        # 多轮：递进式吐槽（口语化短句，100字内）
        demo_texts = [
            f"哎我说，你是不是没听懂刚才大家的意思？不是说你不行，但你这个思路真的有点……怎么说呢，很有创意！一般人真想不到这么离谱的方向。不过话说回来，能一直坚持自己的逻辑也是一种本事吧，大概。",
            f"行了行了，前面大家都吐槽过了，我就补一刀——你这操作真的是让我大开眼界。我不是说你不对啊，就是觉得你这个脑回路，特别适合去做抽象艺术，真的，别浪费了这天赋！",
            f"等等，我得缓一下，你刚才是认真的吗？我本来还想温柔点的，但你这个发言真的太挑战我的忍耐力了。说真的，你不是来搞笑的吧？如果是的话，那你成功了，全场最佳！",
        ]
        return random.choice(demo_texts)
    else:
        # 首轮：全力吐槽（口语化短句，100字内）
        demo_texts = [
            f"哎哟喂，你这是怎么了？先别说问题本身，就你这个描述方式，我都不知道该从哪开始吐槽。算了随便来一个吧——你觉得你说的这些，连你自己信吗？诚实一点，没人笑话你……大概。",
            f"不是吧不是吧，你都这时候了还在这纠结这个？说实话，你这个问题本身就很有问题。但我欣赏你这种明知山有虎偏向虎行山的勇气，虽然我觉得你可能只是迷路了。",
            f"我看完了，真的看完了。我不知道该说什么好，既想夸你想象力丰富，又想吐槽你完全不按套路出牌。算了，你就当我什么都没说吧，继续，我看看你还能整出什么活来。",
        ]
        return random.choice(demo_texts)


async def _real_roast_response(
    messages_with_system: list[dict],
    character_id: str,
    character_name: str,
) -> dict:
    """调用真实 API 的骂骂响应"""
    try:
        import httpx
        
        api_base = UNIFIED_API_CONFIG.get("base_url", "https://api.deepseek.com/v1")
        api_key = os.getenv("DEEPSEEK_API_KEY", os.getenv("OPENAI_API_KEY", ""))
        api_model = UNIFIED_API_CONFIG.get("api_model", "deepseek-v4-flash")
        
        print(f"[Roast/API] api_base={api_base}, model={api_model}")
        print(f"[Roast/API] api_key={'已配置(' + api_key[:10] + '...)' if api_key else '❌ 未配置!'}")
        
        if not api_key:
            return _error_roast_response("未配置 API 密钥")
        
        # 打印请求摘要（不打印完整 system prompt，太长了）
        msg_count = len(messages_with_system)
        user_msg = ""
        for m in reversed(messages_with_system):
            if m["role"] == "user":
                user_msg = m["content"][:50]
                break
        print(f"[Roast/API] 发送请求: {msg_count} 条消息, 用户输入: '{user_msg}...'")
        
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
            
            print(f"[Roast/API] 响应状态码: {response.status_code}")
            
            if response.status_code != 200:
                print(f"[Roast/API] ❌ API 错误响应: {response.text[:300]}")
                raise Exception(f"API 调用失败: {response.text}")
            
            api_result = response.json()
            full_content = api_result["choices"][0]["message"]["content"]
            print(f"[Roast/API] ✅ API 返回成功! 内容长度: {len(full_content)}, 预览: '{full_content[:80]}...'")
            
            return {
                "id": api_result.get("id", "roast-unknown"),
                "object": "roast.completion",
                "model": api_model,
                "choices": api_result["choices"],
                "content": full_content,
                "voiceUrl": "",
                "voiceText": full_content,
                "characterId": character_id,
                "characterName": character_name,
                "mode": "roast",
            }
            
    except Exception as e:
        return _error_roast_response(f"API 调用异常: {str(e)}")


def _clean_roast_text(text: str) -> str:
    """
    清洗骂骂模式的回复文本，去除所有不适合语音合成的内容
    
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
        print(f"[Clean/Roast] ⚠️ 文本被完全清空！原始文本预览: '{text[:50]}...'")
        cleaned = text
    elif len(cleaned) < 5 and original_len > 20:
        print(f"[Clean/Roast] ⚠️ 清洗后过短({len(cleaned)} vs {original_len})，可能过度清洗")
    
    return cleaned


def _error_roast_response(error_msg: str) -> dict:
    """构造骂骂模式的错误响应"""
    content = f"❌ 骂骂模式出错：{error_msg}"
    return {
        "id": "roast-error",
        "object": "roast.completion",
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
        "mode": "roast",
        "selectedCharacter": "",
    }
