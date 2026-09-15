# -*- coding: utf-8 -*-
"""
辩论模式服务 - 管理辩论流程、队伍分配、发言控制
"""

import json
import random
from typing import Optional
from dataclasses import dataclass, field, asdict

from .config import CHARACTER_FILES, DEMO_MODE
from .models import load_character_prompt
from .background.all import (
    role_background,
    DEBATE_ROUNDS,
    DEBATE_POSITION_DUTIES,
    DEBATE_PRO_GENERATE_PROMPT,
    DEBATE_CON_GENERATE_PROMPT,
    DEBATE_SUMMARY_PROMPT,
)


@dataclass
class DebateTeam:
    """辩论队伍"""
    side: str  # "pro" 或 "con"
    name: str  # "正方" 或 "反方"
    members: list[dict] = field(default_factory=list)  # [{id, name, position, background}]
    
    def add_member(self, character_id: str, position: int):
        """添加队员"""
        char_info = next((c for c in role_background if c["id"] == character_id), None)
        if char_info:
            self.members.append({
                "id": character_id,
                "name": char_info["name"],
                "position": position,
                "background": char_info["base_background"]
            })
    
    def get_member_by_position(self, position: int) -> Optional[dict]:
        """根据辩位获取成员"""
        return next((m for m in self.members if m["position"] == position), None)
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "side": self.side,
            "name": self.name,
            "members": sorted(self.members, key=lambda x: x["position"])
        }


@dataclass
class DebateState:
    """辩论状态"""
    debate_id: str = ""
    topic: str = ""
    pro_team: DebateTeam = field(default_factory=lambda: DebateTeam("pro", "正方"))
    con_team: DebateTeam = field(default_factory=lambda: DebateTeam("con", "反方"))
    current_round_index: int = 0
    current_speaker_index: int = 0
    history: list[dict] = field(default_factory=list)  # 发言历史
    summary: str = ""  # 当前摘要
    is_active: bool = True
    phase: str = "waiting"  # waiting, opening, cross_examination, free_debate, closing, finished
    is_generating_voice: bool = False  # 是否正在生成语音（防止重复提交）

    def to_dict(self) -> dict:
        """转换为字典（用于API响应）"""
        return {
            "debate_id": self.debate_id,
            "topic": self.topic,
            "pro_team": self.pro_team.to_dict(),
            "con_team": self.con_team.to_dict(),
            "current_round": DEBATE_ROUNDS[self.current_round_index] if self.current_round_index < len(DEBATE_ROUNDS) else None,
            "current_round_index": self.current_round_index,
            "current_speaker_index": self.current_speaker_index,  # 暴露给前端，用于预测下一个发言者
            "phase": self.phase,
            "is_active": self.is_active,
            "total_rounds": len(DEBATE_ROUNDS),
            "is_generating_voice": self.is_generating_voice  # 暴露给前端
        }


# 存储进行中的辩论（生产环境应使用Redis或数据库）
active_debates: dict[str, DebateState] = {}


def create_debate(debate_id: str, topic: str, selected_characters: list[str]) -> DebateState:
    """
    创建新的辩论
    
    Args:
        debate_id: 辩论唯一ID
        topic: 辩题
        selected_characters: 选中的角色ID列表
        
    Returns:
        DebateState: 创建的辩论状态
    """
    # 随机打乱角色列表
    shuffled_chars = selected_characters.copy()
    random.shuffle(shuffled_chars)
    
    # 分配到正反两队（尽可能均分）
    mid_point = len(shuffled_chars) // 2
    pro_chars = shuffled_chars[:mid_point + (len(shuffled_chars) % 2)]  # 正方可能多一人
    con_chars = shuffled_chars[mid_point + (len(shuffled_chars) % 2):]
    
    # 创建队伍并分配辩位
    state = DebateState(
        debate_id=debate_id,
        topic=topic,
        phase="opening"
    )
    
    # 分配正方（1, 3, 5, 7...辩位）
    for i, char_id in enumerate(pro_chars[:4]):  # 最多4人
        position = i * 2 + 1  # 1, 3, 5, 7
        state.pro_team.add_member(char_id, (position // 2) + 1)
    
    # 分配反方（2, 4, 6, 8...辩位）
    for i, char_id in enumerate(con_chars[:4]):  # 最多4人
        position = (i + 1) * 2  # 2, 4, 6, 8
        state.con_team.add_member(char_id, (i + 1))
    
    active_debates[debate_id] = state
    return state


def _build_dynamic_order(state: DebateState, round_config: dict) -> list[str]:
    """
    根据实际队伍成员数量，动态构建发言顺序
    
    解决问题：当队伍成员不足4人时，原始 DEBATE_ROUNDS 配置中的 pro_2, pro_3 等找不到对应成员
    
    Args:
        state: 辩论状态
        round_config: 当前环节配置
        
    Returns:
        list[str]: 动态调整后的发言顺序
    """
    base_order = round_config["order"]
    pro_count = len(state.pro_team.members)
    con_count = len(state.con_team.members)
    
    dynamic_order = []
    for key in base_order:
        if key.startswith("pro_"):
            pos = int(key.split("_")[1])
            # 只保留存在的辩位（position <= 实际成员数）
            if pos <= pro_count:
                dynamic_order.append(key)
            else:
                print(f"[Debate] ⚠️ 跳过 pro_{pos}（正方只有 {pro_count} 名成员）")
        elif key.startswith("con_"):
            pos = int(key.split("_")[1])
            if pos <= con_count:
                dynamic_order.append(key)
            else:
                print(f"[Debate] ⚠️ 跳过 con_{pos}（反方只有 {con_count} 名成员）")
        else:
            # free, _vs_ 等特殊标识保持不变
            dynamic_order.append(key)
    
    # 如果动态顺序为空，至少保证每人发一次言
    if not dynamic_order:
        print("[Debate] ⚠️ 原始顺序全部无效，使用默认轮流顺序")
        for i in range(max(pro_count, con_count)):
            if i < pro_count:
                dynamic_order.append(f"pro_{i+1}")
            if i < con_count:
                dynamic_order.append(f"con_{i+1}")
    
    return dynamic_order


def get_current_speaker(state: DebateState) -> Optional[dict]:
    """
    获取当前应该发言的选手信息

    Returns:
        dict or None: {side, position, character_id, name} 或 None（如果辩论结束）
    """
    print(f"[Debate Debug] get_current_speaker 被调用")
    print(f"[Debate Debug]   is_active: {state.is_active}")
    print(f"[Debate Debug]   current_round_index: {state.current_round_index}")
    print(f"[Debate Debug]   current_speaker_index: {state.current_speaker_index}")
    print(f"[Debate Debug]   总轮次数: {len(DEBATE_ROUNDS)}")

    if not state.is_active or state.current_round_index >= len(DEBATE_ROUNDS):
        print(f"[Debate Debug] ❌ 辩论已结束或索引越界，返回 None")
        return None

    current_round = DEBATE_ROUNDS[state.current_round_index]
    
    # 使用动态构建的发言顺序（根据实际成员数量调整）
    order = _build_dynamic_order(state, current_round)

    print(f"[Debate Debug]   当前环节: {current_round['name']}")
    print(f"[Debate Debug]   发言顺序(原始): {current_round['order']}")
    print(f"[Debate Debug]   发言顺序(动态): {order}")
    print(f"[Debate Debug]   正方成员: {[m['name'] + '(' + str(m['position']) + '辩)' for m in state.pro_team.members]}")
    print(f"[Debate Debug]   反方成员: {[m['name'] + '(' + str(m['position']) + '辩)' for m in state.con_team.members]}")

    if state.current_speaker_index >= len(order):
        print(f"[Debate Debug] ❌ 发言索引 ({state.current_speaker_index}) >= 顺序长度 ({len(order)})，返回 None")
        return None

    speaker_key = order[state.current_speaker_index]
    print(f"[Debate Debug]   当前发言者标识: {speaker_key}")
    
    # 解析发言者标识
    if speaker_key.startswith("pro_"):
        position = int(speaker_key.split("_")[1])
        member = state.pro_team.get_member_by_position(position)
        if member:
            return {
                "side": "pro",
                "position": position,
                "character_id": member["id"],
                "name": member.get("name", "未知"),
                "background": member.get("background", "")
            }
        else:
            print(f"[Debate Debug] ❌ 找不到正方 {position}辩 成员")
    elif speaker_key.startswith("con_"):
        position = int(speaker_key.split("_")[1])
        member = state.con_team.get_member_by_position(position)
        if member:
            return {
                "side": "con",
                "position": position,
                "character_id": member["id"],
                "name": member.get("name", "未知"),
                "background": member.get("background", "")
            }
        else:
            print(f"[Debate Debug] ❌ 找不到反方 {position}辩 成员")
    elif speaker_key == "free":
        # 自由辩论：轮流从正反方选择
        total_pro = len(state.pro_team.members)
        total_con = len(state.con_team.members)
        # 简化处理：正方先开始
        if state.current_speaker_index % 2 == 0:
            pos = (state.current_speaker_index // 2) % total_pro + 1
            member = state.pro_team.get_member_by_position(pos)
            if member:
                return {
                    "side": "pro",
                    "position": pos,
                    "character_id": member["id"],
                    "name": member.get("name", "未知"),
                    "background": member.get("background", "")
                }
        else:
            pos = (state.current_speaker_index // 2) % total_con + 1
            member = state.con_team.get_member_by_position(pos)
            if member:
                return {
                    "side": "con",
                    "position": pos,
                    "character_id": member["id"],
                    "name": member.get("name", "未知"),
                    "background": member.get("background", "")
                }
    elif "_vs_" in speaker_key:
        # 攻辩环节：如 pro_1_vs_con_2
        parts = speaker_key.split("_vs_")
        side = parts[0].split("_")[0]  # pro 或 con
        position = int(parts[0].split("_")[1])
        team = state.pro_team if side == "pro" else state.con_team
        member = team.get_member_by_position(position)
        if member:
            return {
                "side": side,
                "position": position,
                "character_id": member["id"],
                "name": member.get("name", "未知"),
                "background": member.get("background", "")
            }
    
    return None


def generate_speech_prompt(state: DebateState, speaker: dict) -> str:
    """
    为当前发言者生成提示词
    
    Args:
        state: 辩论状态
        speaker: 发言者信息
        
    Returns:
        str: 完整的提示词
    """
    position_str = str(speaker["position"])
    position_duties = DEBATE_POSITION_DUTIES.get(position_str, "")
    
    # 选择模板
    if speaker["side"] == "pro":
        template = DEBATE_PRO_GENERATE_PROMPT
    else:
        template = DEBATE_CON_GENERATE_PROMPT
    
    prompt = template.format(
        position=f"{speaker['position']}辩",
        position_duties=position_duties,
        character_name=speaker["name"],
        background=speaker["background"],
        topic=state.topic,
        summary=state.summary or "这是开场发言，请阐述你的核心观点。"
    )
    
    return prompt


def record_speech(state: DebateState, speaker: dict, content: str):
    """
    记录发言并推进到下一位
    
    Args:
        state: 辩论状态
        speaker: 发言者信息
        content: 发言内容
    """
    # 记录到历史
    speech_record = {
        "round": DEBATE_ROUNDS[state.current_round_index]["name"],
        "side": speaker["side"],
        "position": f"{speaker['position']}辩",
        "character_id": speaker.get("character_id", ""),
        "character_name": speaker.get("name", "未知"),
        "content": content,
        "timestamp": __import__("time").time()
    }
    state.history.append(speech_record)
    
    # 推进发言索引
    state.current_speaker_index += 1
    
    # 检查当前环节是否结束
    current_round = DEBATE_ROUNDS[state.current_round_index]
    if state.current_speaker_index >= len(current_round["order"]):
        # 进入下一环节
        state.current_round_index += 1
        state.current_speaker_index = 0
        
        if state.current_round_index >= len(DEBATE_ROUNDS):
            # 辩论结束
            state.phase = "finished"
            state.is_active = False
        else:
            state.phase = DEBATE_ROUNDS[state.current_round_index]["id"]
        
        # 生成摘要（实际项目中这里会调用LLM）
        state.summary = _generate_summary_placeholder(state)


def _generate_summary_placeholder(state: DebateState) -> str:
    """
    生成摘要占位符（演示模式使用，实际应调用LLM）
    
    TODO: 集成真实LLM调用
    """
    recent_speeches = state.history[-10:] if len(state.history) > 10 else state.history
    
    summary_parts = [
        f"## 辩论摘要 - {state.topic}",
        f"\n### 当前环节：{state.phase}",
        f"\n### 正方论点：",
    ]
    
    # 提取正方论点
    pro_args = [h["content"][:100] + "..." for h in recent_speeches if h["side"] == "pro"]
    for i, arg in enumerate(pro_args[-3:], 1):
        summary_parts.append(f"{i}. {arg}")
    
    summary_parts.append(f"\n### 反方论点：")
    con_args = [h["content"][:100] + "..." for h in recent_speeches if h["side"] == "con"]
    for i, arg in enumerate(con_args[-3:], 1):
        summary_parts.append(f"{i}. {arg}")
    
    return "\n".join(summary_parts)


def get_debate_info(debate_id: str) -> Optional[DebateState]:
    """获取辩论信息"""
    return active_debates.get(debate_id)


def end_debate(debate_id: str) -> Optional[DebateState]:
    """提前结束辩论"""
    state = active_debates.get(debate_id)
    if state:
        state.is_active = False
        state.phase = "finished"
    return state


# ============ 真实 API 调用（异步） ============

async def _call_deepseek_api(speaker: dict, prompt: str) -> str:
    """
    异步调用 DeepSeek API 生成发言内容

    Args:
        speaker: 发言者信息
        prompt: 完整的提示词

    Returns:
        str: 生成的文字内容
    """
    import os
    import httpx

    api_key = os.getenv("DEEPSEEK_API_KEY", "")

    if not api_key:
        print("[Debate] ERROR: 未配置 DEEPSEEK_API_KEY，使用模拟内容")
        return _generate_demo_speech(speaker, "", prompt)

    try:
        print(f"[Debate] 正在调用 DeepSeek API 为 {speaker['name']} 生成文字...")

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"请开始你的{speaker['position']}辩发言。"}
        ]

        # 使用异步客户端，避免阻塞事件循环
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-v4-flash",
                    "messages": messages,
                }
            )

            if response.status_code == 200:
                api_result = response.json()
                content = api_result["choices"][0]["message"]["content"]
                print(f"[Debate] ✅ DeepSeek API 调用成功，生成 {len(content)} 字符")
                return content
            else:
                print(f"[Debate] ❌ API 错误 {response.status_code}: {response.text[:200]}")
                fallback_content = _generate_demo_speech(speaker, "", prompt)
                return f"[API_ERROR_{response.status_code}] {fallback_content}"

    except httpx.TimeoutException:
        print("[Debate] ❌ API 请求超时（120秒），使用模拟内容")
        return _generate_demo_speech(speaker, "", prompt)
    except httpx.NetworkError as e:
        print(f"[Debate] ❌ 网络错误: {str(e)}")
        return _generate_demo_speech(speaker, "", prompt)
    except Exception as e:
        print(f"[Debate] ❌ 异常: {str(e)}")
        return _generate_demo_speech(speaker, "", prompt)


# ============ 演示模式的模拟响应 ============

async def get_demo_debate_response(
    debate_id: str,
    topic: str,
    selected_characters: list[str],
    user_message: str = ""
) -> dict:
    """
    演示模式：返回模拟的辩论响应
    
    Args:
        debate_id: 辩论ID
        topic: 辩题
        selected_characters: 选中的角色
        user_message: 用户消息
        
    Returns:
        dict: 包含辩论状态和响应的字典
    """
    # 获取或创建辩论
    state = active_debates.get(debate_id)
    
    if not state or not state.is_active:
        # 创建新辩论
        state = create_debate(debate_id, topic, selected_characters)
        
        # 返回初始状态（显示队伍分配）
        return {
            "type": "debate_start",
            "debate_state": state.to_dict(),
            "message": {
                "content": "",
                "voiceUrl": "",
                "voiceText": "",
                "role": "system"
            },
            "instruction": f"🎉 辩论已创建！\n\n**辩题**：{topic}\n\n**正方队伍**（支持）：{', '.join([m['name'] for m in state.pro_team.members])}\n\n**反方队伍**（反对）：{', '.join([m['name'] for m in state.con_team.members])}\n\n请点击「开始辩论」按钮，或输入任意内容开始第一轮发言。"
        }
    
    # 获取当前发言者
    speaker = get_current_speaker(state)

    # 检查是否正在生成语音（防止重复提交）
    if state.is_generating_voice:
        return {
            "type": "generating",
            "debate_state": state.to_dict(),
            "current_speaker": None,
            "message": None,
            "instruction": "⏳ 正在生成语音，请稍候...",
            "error": "is_generating"
        }

    if not speaker:
        # 辩论结束
        end_debate(debate_id)
        return {
            "type": "debate_end",
            "debate_state": state.to_dict(),
            "message": {
                "content": "🏆 辩论圆满结束！感谢各位辩手的精彩表现！",
                "voiceUrl": "",
                "voiceText": "辩论结束",
                "role": "assistant"
            },
            "instruction": "辩论已结束。您可以查看完整记录，或开始新一轮辩论。"
        }
    
    # 生成发言提示词
    prompt = generate_speech_prompt(state, speaker)

    # 输出提示词到控制台（用于调试和后续接入模型）
    print("\n" + "="*80)
    print(f"[Debate Prompt] 发言者: {speaker['name']} ({speaker['side']}-{speaker['position']}辩)")
    print(f"[Debate Prompt] 辩题: {state.topic}")
    print(f"[Debate Prompt] 当前环节: {DEBATE_ROUNDS[state.current_round_index]['name']}")
    print("-"*80)
    print(prompt)
    print("="*80 + "\n")

    # 根据模式选择：演示模式 vs 真实 API 模式
    if DEMO_MODE:
        # 演示模式：使用模拟内容
        demo_content = _generate_demo_speech(speaker, state.topic, prompt)
        print(f"[Debate] DEMO_MODE: Using simulated content")
    else:
        # 真实模式：调用 DeepSeek API 生成文字内容
        demo_content = await _call_deepseek_api(speaker, prompt)

    # 记录发言
    record_speech(state, speaker, demo_content)

    # 调用真实的语音生成API（带缓存）
    voice_url = None
    character_id = speaker.get('character_id', '')

    # 标记开始生成语音
    state.is_generating_voice = True

    try:
        if character_id:
            from .audio_generation import generate_audio
            print(f"[Debate] 正在为 {speaker['name']} ({character_id}) 生成语音...")
            voice_file_path = generate_audio(demo_content, character_id, use_cache=True)

            if voice_file_path:
                # 返回相对路径供前端访问
                from pathlib import Path
                voice_url = f"/api/voice/{Path(voice_file_path).name}"
                print(f"[Debate] 语音生成成功: {Path(voice_file_path).name}")
            else:
                print(f"[Debate] 语音生成失败，使用默认语音")
                voice_url = f"/api/voice/{character_id}.wav"
        else:
            voice_url = f"/api/voice/loxd.wav"
    except Exception as e:
        print(f"[Debate] 语音生成异常: {str(e)}")
        voice_url = f"/api/voice/{character_id if character_id else 'loxd'}.wav"
    finally:
        # 无论成功失败，都重置状态
        state.is_generating_voice = False
    
    # 判断是否需要进入下一环节
    current_round = DEBATE_ROUNDS[state.current_round_index] if state.current_round_index < len(DEBATE_ROUNDS) else None
    instruction = ""
    
    if state.current_speaker_index == 0 and state.current_round_index > 0 and state.is_active:
        # 新一轮开始
        round_name = current_round["name"] if current_round else "未知"
        instruction = f"📢 **{round_name}环节即将开始**\n\n{current_round.get('description', '')}\n\n请确认后继续..."
    elif not state.is_active:
        instruction = "🎊 所有环节已完成！"
    
    return {
        "type": "speech",
        "debate_state": state.to_dict(),
        "current_speaker": {
            "side": "正方" if speaker["side"] == "pro" else "反方",
            "position": f"{speaker.get('position', 1)}辩",
            "name": speaker.get("name", "未知"),
            "character_id": speaker.get("character_id", "")
        },
        "message": {
            "content": demo_content,
            "voiceUrl": voice_url,
            "voiceText": demo_content,
            "role": "assistant",
            "model": speaker["name"]
        },
        "instruction": instruction,
        "prompt": prompt  # 返回提示词给前端，用于调试和查看
    }


def _generate_demo_speech(speaker: dict, topic: str, prompt: str) -> str:
    """生成演示模式的模拟发言"""
    side_name = "正方" if speaker["side"] == "pro" else "反方"
    position = f"{speaker['position']}辩"
    
    # 根据不同辩位生成不同的模拟内容
    templates = {
        "1": f"谢谢主席，各位好。我是{side_name}{position}{speaker['name']}。\n\n关于「{topic}」这个辩题，我方的核心观点是...\n\n首先，从{speaker['background'][:50]}...的角度来看...",
        "2": f"我接续我方一辩的观点，进一步阐述...\n\n作为{speaker['name']}，我认为{topic}这个问题还需要考虑...",
        "3": f"对方辩友的论述存在几个明显的逻辑漏洞。\n\n第一，...；第二，...；第三，...\n\n而我方的立场是...",
        "4": f"纵观整场辩论，双方就{topic}展开了深入的探讨。\n\n我方始终坚持...，这是因为...\n\n最后，我想说..."
    }
    
    position_key = str(speaker["position"]) if speaker["position"] <= 4 else "4"
    base_template = templates.get(position_key, templates["1"])
    
    # 添加一些随机变化
    variations = [
        "\n\n这是一个值得深思的问题。",
        "\n\n让我们用理性的眼光来看待这个议题。",
        "\n\n事实胜于雄辩，数据说明一切。",
        "\n\n综上所述，我方的立场是站得住脚的。"
    ]
    
    content = base_template + random.choice(variations)
    
    return content
