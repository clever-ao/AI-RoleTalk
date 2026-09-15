# -*- coding: utf-8 -*-
"""
静态文件服务 - 提供语音文件等静态资源的访问

支持两个目录：
- MOCK_DATA_DIR: 通用语音文件（如 custom_voice.mp3）
- MODEL_DATA_DIR: 角色专属语音文件（如 loxd.wav, lzjp.wav）
"""

from fastapi import HTTPException
from fastapi.responses import FileResponse

from pathlib import Path

from .config import MOCK_DATA_DIR, MODEL_DATA_DIR


# MIME 类型映射
MIME_TYPES = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm',
}

# 允许访问的文件扩展名
ALLOWED_EXTENSIONS = set(MIME_TYPES.keys())

# 缓存目录路径
CACHE_DIR = Path("voice_cache")

# 可访问的目录列表（按优先级排序）
VOICE_DIRS = [
    ("cache", CACHE_DIR),        # 生成的语音缓存（最高优先级）
    ("model", MODEL_DATA_DIR),   # 角色语音文件
    ("mock", MOCK_DATA_DIR),     # 通用语音文件（降级）
]


def get_voice_file(filename: str) -> FileResponse:
    """
    提供语音文件的静态访问
    
    查找顺序：
    1. MODEL_DATA_DIR/{filename}  （角色语音，如 loxd.wav）
    2. MOCK_DATA_DIR/{filename}   （通用语音，如 custom_voice.mp3）
    
    安全措施：
    - 防止路径穿越攻击（..）
    - 仅允许音频格式文件
    
    Args:
        filename: 语音文件名
    
    Returns:
        FileResponse 或抛出 HTTPException
    """
    # 遍历所有可访问目录查找文件
    for dir_name, base_dir in VOICE_DIRS:
        file_path = base_dir / filename
        
        # 安全检查：防止路径穿越
        try:
            file_path.resolve().relative_to(base_dir.resolve())
        except ValueError:
            continue
        
        if file_path.exists():
            ext = file_path.suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail="不支持的音频格式")
            
            return FileResponse(
                path=str(file_path),
                media_type=MIME_TYPES.get(ext, 'audio/mpeg'),
                filename=filename,
            )
    
    # 所有目录都找不到
    raise HTTPException(
        status_code=404,
        detail=f"语音文件不存在: {filename}（已搜索目录: {[str(d) for _, d in VOICE_DIRS]}）"
    )
