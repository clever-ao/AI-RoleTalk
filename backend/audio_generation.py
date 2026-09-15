import os
import hashlib
import time
from pathlib import Path
from typing import Optional

# Fish Audio SDK
from fishaudio import FishAudio
from fishaudio.utils import save

# 初始化 Fish Audio 客户端
client = FishAudio(api_key="your-fish-audio-api-key-here")  # 替换为实际的 API Key

# 角色语音 ID 映射
VOICE_IDS = {
    "lzjp": "aebaa2305aa2452fbdc8f41eec852a79",    # 雷军
    "loxd": "96500cc8c71e457d9c072158a718dbc7",     # 罗翔
    "mayp": "1c5e38754e594247bdc15982a2418092",      # 马云
    "yjsds": "62222f4a424349828331888d19c9b594",     # 老教授
    "dsmzvu": "422ffcc29b9f49019251618c3e0f45b9",    # 董明珠
    "lqxcyj": "1a39deeb67ae47febb89f8ffac0dca26",    # 刘晓艳
    "sjytqi": "c8b8dcbb0862465fbc545607041568b8",    # 三月七
    "funzna": "0deeb42abac64d5ebeaac36edca2b4f6",    # 芙宁娜
}

# 缓存目录配置
CACHE_DIR = Path("voice_cache")
CACHE_DIR.mkdir(exist_ok=True)  # 确保缓存目录存在


def get_text_hash(text: str) -> str:
    """
    生成文本的 MD5 哈希值，用于缓存文件名
    """
    return hashlib.md5(text.encode('utf-8')).hexdigest()


def get_cached_audio_path(character_id: str, text: str) -> Path:
    """
    获取缓存的音频文件路径
    格式: voice_cache/{character_id}_{text_hash}.wav
    """
    text_hash = get_text_hash(text)
    return CACHE_DIR / f"{character_id}_{text_hash}.wav"


def is_cache_valid(file_path: Path, max_age_hours: int = 24) -> bool:
    """
    检查缓存文件是否有效（存在且未过期）
    
    Args:
        file_path: 缓存文件路径
        max_age_hours: 最大缓存时间（小时），默认24小时
    
    Returns:
        True 如果缓存有效，False 否则
    """
    if not file_path.exists():
        return False
    
    # 检查文件大小（确保不是空文件）
    if file_path.stat().st_size == 0:
        return False
    
    # 检查文件年龄
    file_age_hours = (time.time() - file_path.stat().st_mtime) / 3600
    return file_age_hours <= max_age_hours


def generate_audio(text: str, character_id: str, use_cache: bool = True) -> Optional[str]:
    """
    生成音频文件，支持缓存机制
    
    Args:
        text: 要转换的文本内容
        character_id: 角色 ID（如 'lzjp', 'loxd' 等）
        use_cache: 是否使用缓存，默认为 True
    
    Returns:
        音频文件的相对路径（如 "voice_cache/lzjp_abc123.wav"）
        如果生成失败则返回 None
    """
    # 验证角色 ID
    if character_id not in VOICE_IDS:
        print(f"[Audio] 未知的角色 ID: {character_id}")
        return None
    
    # 获取该角色的语音 reference_id
    reference_id = VOICE_IDS[character_id]
    
    # 检查缓存
    cache_path = get_cached_audio_path(character_id, text)
    if use_cache and is_cache_valid(cache_path):
        print(f"[Audio] 使用缓存: {cache_path.name}")
        return str(cache_path)
    
    # 生成新的音频
    try:
        print(f"[Audio] 正在生成语音: {character_id} - {text[:20]}...")
        
        # 调用 Fish Audio API 生成语音
        audio = client.tts.convert(
            text=text,
            reference_id=reference_id,
            model="s2.1-pro-free"
        )
        
        # 保存到缓存目录
        file_path = save(audio, str(cache_path))
        
        print(f"[Audio] 语音生成成功: {cache_path.name}")
        return str(cache_path)
        
    except Exception as e:
        print(f"[Audio] 语音生成失败: {str(e)}")
        return None


def clear_cache(max_age_hours: int = 24) -> int:
    """
    清理过期的缓存文件
    
    Args:
        max_age_hours: 保留小于此时间的缓存（小时）
    
    Returns:
        删除的文件数量
    """
    count = 0
    current_time = time.time()
    
    for file_path in CACHE_DIR.glob("*.wav"):
        file_age_hours = (current_time - file_path.stat().st_mtime) / 3600
        if file_age_hours > max_age_hours:
            file_path.unlink()
            count += 1
            print(f"[Audio] 已删除过期缓存: {file_path.name}")
    
    if count > 0:
        print(f"[Audio] 清理完成，删除了 {count} 个过期缓存文件")
    else:
        print("[Audio] 无需清理的缓存文件")
    
    return count


def get_cache_info() -> dict:
    """
    获取缓存信息
    
    Returns:
        包含缓存统计信息的字典
    """
    total_files = 0
    total_size = 0
    oldest_file = None
    newest_file = None
    
    for file_path in CACHE_DIR.glob("*.wav"):
        total_files += 1
        total_size += file_path.stat().st_size
        
        file_mtime = file_path.stat().st_mtime
        if oldest_file is None or file_mtime < oldest_file:
            oldest_file = file_mtime
        if newest_file is None or file_mtime > newest_file:
            newest_file = file_mtime
    
    return {
        "total_files": total_files,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "cache_dir": str(CACHE_DIR),
        "oldest_file_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(oldest_file)) if oldest_file else None,
        "newest_file_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(newest_file)) if newest_file else None,
    }


# 兼容旧接口的函数
def generate_audio_legacy(text: str, reference_id: str) -> str:
    """
    旧的接口函数（保持向后兼容）
    
    Deprecated: 建议使用 generate_audio() 函数
    """
    audio = client.tts.convert(
        text=text,
        reference_id=reference_id,
        model="s2.1-pro-free"
    )
    
    filename = f"legacy_{int(time.time())}.wav"
    return save(audio, str(CACHE_DIR / filename))


if __name__ == "__main__":
    # 测试代码
    print("=" * 50)
    print("语音生成服务测试")
    print("=" * 50)
    
    # 测试生成语音
    test_text = "你好，这是一个测试。"
    test_character = "lzjp"
    
    print(f"\n测试参数:")
    print(f"  文本: {test_text}")
    print(f"  角色: {test_character}")
    
    result = generate_audio(test_text, test_character)
    
    if result:
        print(f"\n✅ 测试成功！")
        print(f"   文件路径: {result}")
    else:
        print(f"\n❌ 测试失败")
    
    # 显示缓存信息
    print(f"\n{'=' * 50}")
    print("缓存信息:")
    info = get_cache_info()
    for key, value in info.items():
        print(f"  {key}: {value}")
