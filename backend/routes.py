# -*- coding: utf-8 -*-
"""
API 路由 - 定义所有 HTTP 接口端点
"""

import json
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from .config import (
    DEMO_MODE,
    UNIFIED_API_CONFIG,
    CHARACTER_FILES,
    MODE_PROMPT_MAP,
)
from .models import ChatRequest, DebateCreateRequest, DebateActionRequest
from .static_files import get_voice_file
from .chat_service import call_chat_api
from .debate_service import (
    create_debate,
    get_debate_info,
    end_debate,
    get_demo_debate_response,
)
from .praise_service import call_praise_chat_api


def register_routes(app: FastAPI):
    """
    注册所有路由到 FastAPI 应用
    
    Args:
        app: FastAPI 实例
    """
    
    # ============ 静态文件：语音文件访问 ============
    
    @app.get("/api/voice/{filename}")
    async def api_get_voice_file(filename: str):
        """提供语音文件的静态访问"""
        return get_voice_file(filename)
    
    # ============ API 接口 ============
    
    @app.get("/")
    async def root():
        """API 根路径 - 服务信息"""
        return {
            "message": "多角色 AI 聊天 API (支持语音 + 角色扮演)",
            "version": "2.0.0",
            "demo_mode": DEMO_MODE,
            "api_model": UNIFIED_API_CONFIG["api_model"],
            "characters": list(CHARACTER_FILES.keys()),
            "modes": list(MODE_PROMPT_MAP.keys()),
            "features": ["text", "voice", "character_roleplay"],
        }
    
    @app.get("/api/models")
    async def list_models():
        """获取可用角色列表（含角色背景信息）"""
        from .background.all import role_background
        return {
            "characters": [
                {
                    "id": char["id"],
                    "name": char["name"],
                    "background": char["base_background"],
                }
                for char in role_background
            ],
            "api_config": UNIFIED_API_CONFIG,
        }
    
    @app.post("/api/chat")
    async def chat(request: ChatRequest):
        """
        聊天接口 - 使用统一 API + 角色提示词
        
        请求参数:
        - model: 实际调用的 API 模型名（如 deepseek-chat）
        - messages: 对话消息列表
        - character_id: 角色 ID（如 loxd, lzjp, yjsds）
        - mode: 对话模式（praise/roast/roundtable/debate）
        
        返回格式:
        {
            "content": "...",
            "voiceUrl": "/api/voice/custom_voice.mp3",
            "voiceText": "你好，有什么能帮助您？",
            "characterId": "loxd",
            "mode": "debate"
        }
        """
        result = await call_chat_api(
            messages=request.messages,
            model=request.model,
            character_id=request.character_id,
            mode=request.mode,
            stream=request.stream,
        )
        
        # 流式请求：用 SSE 格式包装
        if request.stream:
            async def generate():
                data = {
                    "id": result.get("id", f"chatcmpl-{int(time.time())}"),
                    "object": result.get("object", "chat.completion"),
                    "model": request.model,
                    "choices": result.get("choices", []),
                    "voiceUrl": result.get("voiceUrl", ""),
                    "voiceText": result.get("voiceText", ""),
                    "characterId": result.get("characterId", ""),
                    "mode": result.get("mode", ""),
                }
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
            
            return StreamingResponse(
                generate(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                },
            )
        
        # 非流式模式：直接返回 JSON
        return result
    
    # ============ 夸夸模式专用接口 ============
    
    @app.post("/api/praise/chat")
    async def praise_chat(request: dict):
        """
        夸夸模式聊天接口 - 随机选模型 + 递进式夸奖 + 同步生成语音
        
        请求参数:
        - content: 用户本次输入的文本
        - selected_models: 创建对话时选择的模型ID列表（如 ["loxd", "lzjp", "mayp"]）
        - history_messages: 历史对话消息列表（可选）
          格式: [{"role": "user/assistant", "content": "...", "character_name": "角色名"}]
        
        返回格式:
        {
            "content": "夸奖回复文本",
            "voiceUrl": "/api/voice/xxx.wav",
            "voiceText": "回复文本",
            "characterId": "loxd",
            "characterName": "罗翔",
            "mode": "praise",
            "selectedCharacter": "loxd"
        }
        """
        try:
            user_content = request.get("content", "").strip()
            selected_models = request.get("selected_models", [])
            history_messages = request.get("history_messages", [])
            
            if not user_content:
                return {"error": "用户输入内容不能为空"}
            
            if not selected_models:
                return {"error": "请至少选择一个模型"}
            
            # Step 1: 调用夸夸服务获取大模型文本回复
            result = await call_praise_chat_api(
                user_content=user_content,
                selected_models=selected_models,
                history_messages=history_messages,
            )
            
            # Step 2: 同步生成语音（在返回给前端之前完成）
            praise_content = result.get("content", "")
            character_id = result.get("selectedCharacter", "")
            
            if praise_content and character_id:
                try:
                    from .audio_generation import generate_audio
                    print(f"[Praise API] 正在为角色 {character_id} 生成语音, 文本长度: {len(praise_content)}")
                    voice_file_path = generate_audio(praise_content, character_id, use_cache=True)
                    if voice_file_path:
                        voice_url = f"/api/voice/{Path(voice_file_path).name}"
                        result["voiceUrl"] = voice_url
                        print(f"[Praise API] ✅ 语音生成成功: {voice_url}")
                    else:
                        print(f"[Praise API] ⚠️ 语音生成返回空，使用无语音模式")
                        result["voiceUrl"] = ""
                except Exception as audio_err:
                    print(f"[Praise API] ⚠️ 语音生成异常（仅返回文本）: {audio_err}")
                    result["voiceUrl"] = ""
            else:
                result["voiceUrl"] = ""
            
            return result
            
        except Exception as e:
            print(f"[Praise API] 错误: {str(e)}")
            return {"error": f"夸夸模式服务异常: {str(e)}"}
    
    # ============ 骂骂模式专用接口 ============
    
    @app.post("/api/roast/chat")
    async def roast_chat(request: dict):
        """
        骂骂模式聊天接口 - 随机选模型 + 递进式吐槽 + 同步生成语音
        
        请求参数:
        - content: 用户本次输入的文本
        - selected_models: 创建对话时选择的模型ID列表（如 ["loxd", "lzjp", "mayp"]）
        - history_messages: 历史对话消息列表（可选）
          格式: [{"role": "user/assistant", "content": "...", "character_name": "角色名"}]
        
        返回格式:
        {
            "content": "吐槽回复文本",
            "voiceUrl": "/api/voice/xxx.wav",
            "voiceText": "回复文本",
            "characterId": "loxd",
            "characterName": "罗翔",
            "mode": "roast",
            "selectedCharacter": "loxd"
        }
        """
        try:
            user_content = request.get("content", "").strip()
            selected_models = request.get("selected_models", [])
            history_messages = request.get("history_messages", [])
            
            if not user_content:
                return {"error": "用户输入内容不能为空"}
            
            if not selected_models:
                return {"error": "请至少选择一个模型"}
            
            # Step 1: 调用骂骂服务获取大模型文本回复
            from .roast_service import call_roast_chat_api
            
            result = await call_roast_chat_api(
                user_content=user_content,
                selected_models=selected_models,
                history_messages=history_messages,
            )
            
            # Step 2: 同步生成语音（在返回给前端之前完成）
            roast_content = result.get("content", "")
            character_id = result.get("selectedCharacter", "")
            
            if roast_content and character_id:
                try:
                    from .audio_generation import generate_audio
                    print(f"[Roast API] 正在为角色 {character_id} 生成语音, 文本长度: {len(roast_content)}")
                    voice_file_path = generate_audio(roast_content, character_id, use_cache=True)
                    if voice_file_path:
                        voice_url = f"/api/voice/{Path(voice_file_path).name}"
                        result["voiceUrl"] = voice_url
                        print(f"[Roast API] ✅ 语音生成成功: {voice_url}")
                    else:
                        print(f"[Roast API] ⚠️ 语音生成返回空，使用无语音模式")
                        result["voiceUrl"] = ""
                except Exception as audio_err:
                    print(f"[Roast API] ⚠️ 语音生成异常（仅返回文本）: {audio_err}")
                    result["voiceUrl"] = ""
            else:
                result["voiceUrl"] = ""
            
            return result
            
        except Exception as e:
            print(f"[Roast API] 错误: {str(e)}")
            return {"error": f"骂骂模式服务异常: {str(e)}"}
    
    # ============ 辩论模式专用接口 ============
    
    @app.post("/api/debate/create")
    async def create_debate_api(request: DebateCreateRequest):
        """
        创建新的辩论
        
        请求参数:
        - topic: 辩题
        - characters: 选中的角色ID列表（将随机分配到正反方）
        - debate_id: 可选，不传则自动生成
        
        返回:
        - debate_state: 辩论状态（包含队伍分配信息）
        - instruction: 初始提示信息
        """
        import uuid
        
        debate_id = request.debate_id or str(uuid.uuid4())[:8]
        
        if DEMO_MODE:
            # 演示模式：返回模拟的辩论创建响应
            result = get_demo_debate_response(
                debate_id=debate_id,
                topic=request.topic,
                selected_characters=request.characters,
            )
            return result
        else:
            # 真实模式：创建辩论状态
            state = create_debate(debate_id, request.topic, request.characters)
            return {
                "type": "debate_created",
                "debate_state": state.to_dict(),
                "message": {
                    "content": f"🎉 辩论已创建！\n\n**辩题**：{request.topic}\n\n请点击「开始辩论」或发送消息开始第一轮发言。",
                    "voiceUrl": "",
                    "voiceText": "",
                    "role": "system"
                },
                "instruction": f"辩题：{request.topic}\n正方：{', '.join([m['name'] for m in state.pro_team.members])}\n反方：{', '.join([m['name'] for m in state.con_team.members])}"
            }
    
    @app.post("/api/debate/action")
    async def debate_action_api(request: DebateActionRequest):
        """
        执行辩论操作
        
        请求参数:
        - debate_id: 辩论ID
        - action: 操作类型
          - next_speech: 下一位发言
          - end_debate: 结束辩论
          - get_status: 获取当前状态
        - user_message: 用户输入（可选）
        
        返回:
        - type: 响应类型（speech/debate_end/round_transition）
        - debate_state: 更新后的辩论状态
        - current_speaker: 当前发言者信息
        - message: 发言内容或系统消息
        - instruction: 环节提示信息
        """
        if request.action == "get_status":
            # 获取辩论状态
            state = get_debate_info(request.debate_id)
            if not state:
                return {"error": "辩论不存在", "debate_id": request.debate_id}
            return {
                "type": "status",
                "debate_state": state.to_dict()
            }
        
        elif request.action == "end_debate":
            # 结束辩论
            state = end_debate(request.debate_id)
            if not state:
                return {"error": "辩论不存在", "debate_id": request.debate_id}
            return {
                "type": "debate_ended",
                "debate_state": state.to_dict(),
                "message": {
                    "content": "⏹️ 辩论已提前结束。",
                    "role": "system"
                }
            }
        
        elif request.action == "next_speech":
            # 下一位发言（统一使用 get_demo_debate_response，该函数内部会根据 DEMO_MODE 自动选择）
            result = await get_demo_debate_response(
                debate_id=request.debate_id,
                topic="",  # 会从state中获取
                selected_characters=[],  # 会从state中获取
                user_message=request.user_message
            )
            return result
        
        else:
            return {"error": f"未知操作: {request.action}"}

    # ============ 语音生成 API ============

    @app.post("/api/audio/generate")
    async def api_generate_audio(request: dict):
        """
        生成语音文件（带缓存）

        请求体:
        {
            "text": "要转换的文本",
            "character_id": "角色ID (如 lzjp, loxd 等)",
            "use_cache": true  // 可选，是否使用缓存，默认true
        }

        返回:
        {
            "success": true,
            "voiceUrl": "/api/voice/cache/lzjp_abc123.wav",
            "voiceText": "原始文本",
            "fromCache": false,
            "message": "生成成功"
        }
        """
        try:
            from .audio_generation import generate_audio, get_cached_audio_path

            text = request.get("text", "").strip()
            character_id = request.get("character_id", "").strip().lower()
            use_cache = request.get("use_cache", True)

            # 验证参数
            if not text:
                return {
                    "success": False,
                    "error": "文本内容不能为空"
                }

            if not character_id:
                return {
                    "success": False,
                    "error": "角色ID不能为空"
                }

            # 检查是否使用缓存
            cache_path = get_cached_audio_path(character_id, text)
            from_cache = False

            if use_cache and cache_path.exists():
                from_cache = True
                file_path = str(cache_path)
            else:
                # 生成新的音频
                file_path = generate_audio(text, character_id, use_cache=use_cache)

            if not file_path:
                return {
                    "success": False,
                    "error": "语音生成失败，请检查角色ID是否正确"
                }

            # 返回相对路径（供前端访问）
            voice_url = f"/api/voice/{Path(file_path).name}"

            return {
                "success": True,
                "voiceUrl": voice_url,
                "voiceText": text,
                "fromCache": from_cache,
                "message": "从缓存获取" if from_cache else "生成成功",
                "filePath": file_path
            }

        except Exception as e:
            print(f"[API] 语音生成错误: {str(e)}")
            return {
                "success": False,
                "error": f"服务器错误: {str(e)}"
            }

    @app.get("/api/audio/cache/info")
    async def api_get_audio_cache_info():
        """获取语音缓存信息"""
        try:
            from .audio_generation import get_cache_info
            info = get_cache_info()
            return {
                "success": True,
                **info
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @app.post("/api/audio/cache/clear")
    async def api_clear_audio_cache(request: dict = None):
        """清理过期的语音缓存"""
        try:
            from .audio_generation import clear_cache
            max_age = request.get("max_age_hours", 24) if request else 24
            deleted_count = clear_cache(max_age)
            return {
                "success": True,
                "deletedCount": deleted_count,
                "message": f"已清理 {deleted_count} 个过期缓存文件"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
