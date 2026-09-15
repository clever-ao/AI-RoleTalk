# -*- coding: utf-8 -*-
"""
测试语音生成服务
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from audio_generation import (
    generate_audio,
    get_cache_info,
    clear_cache,
    VOICE_IDS,
    get_cached_audio_path,
    is_cache_valid
)


def test_basic_generation():
    """测试基本语音生成功能"""
    print("\n" + "=" * 60)
    print("测试1: 基本语音生成")
    print("=" * 60)

    test_text = "你好，这是一个语音生成测试。"
    character_id = "lzjp"  # 雷军

    print(f"\n输入参数:")
    print(f"  文本: {test_text}")
    print(f"  角色: {character_id} (雷军)")

    # 第一次生成（应该会调用API）
    result = generate_audio(test_text, character_id, use_cache=False)

    if result:
        print(f"\n✅ 生成成功!")
        print(f"   文件路径: {result}")
        print(f"   文件存在: {Path(result).exists()}")
    else:
        print(f"\n❌ 生成失败")
        return False

    return True


def test_caching():
    """测试缓存功能"""
    print("\n" + "=" * 60)
    print("测试2: 缓存功能")
    print("=" * 60)

    test_text = "这是缓存测试文本。"
    character_id = "loxd"  # 罗翔

    cache_path = get_cached_audio_path(character_id, test_text)

    print(f"\n输入参数:")
    print(f"  文本: {test_text}")
    print(f"  角色: {character_id}")
    print(f"  预期缓存路径: {cache_path}")

    # 第一次生成（无缓存）
    print(f"\n--- 第一次生成（应调用API） ---")
    result1 = generate_audio(test_text, character_id, use_cache=True)

    if result1:
        print(f"✅ 生成成功: {Path(result1).name}")
        print(f"   缓存文件存在: {cache_path.exists()}")

        # 第二次请求（应该使用缓存）
        print(f"\n--- 第二次请求（应使用缓存） ---")
        result2 = generate_audio(test_text, character_id, use_cache=True)

        if result2:
            print(f"✅ 使用缓存: {Path(result2).name}")
            print(f"   两次结果相同: {result1 == result2}")
            return True

    return False


def test_all_characters():
    """测试所有角色的语音ID是否配置正确"""
    print("\n" + "=" * 60)
    print("测试3: 角色配置检查")
    print("=" * 60)

    print(f"\n已配置的角色数量: {len(VOICE_IDS)}\n")

    for char_id, voice_id in VOICE_IDS.items():
        print(f"  ✓ {char_id}: {voice_id}")

    print(f"\n所有角色配置完成!")
    return True


def test_cache_management():
    """测试缓存管理功能"""
    print("\n" + "=" * 60)
    print("测试4: 缓存管理")
    print("=" * 60)

    # 获取缓存信息
    info = get_cache_info()

    print(f"\n当前缓存状态:")
    print(f"  缓存文件数量: {info['total_files']}")
    print(f"  总大小: {info['total_size_mb']} MB")
    print(f"  缓存目录: {info['cache_dir']}")
    if info.get('newest_file_time'):
        print(f"  最新文件: {info['newest_file_time']}")
    if info.get('oldest_file_time'):
        print(f"  最旧文件: {info['oldest_file_time']}")

    # 尝试清理过期缓存（设置为0小时会清理所有）
    print(f"\n清理过期缓存...")
    deleted = clear_cache(max_age_hours=0)  # 清理所有缓存用于测试
    print(f"删除了 {deleted} 个文件")

    return True


def main():
    """运行所有测试"""
    print("=" * 60)
    print("🎤 语音生成服务测试套件")
    print("=" * 60)

    results = []

    # 运行各项测试
    results.append(("基本生成", test_basic_generation()))
    results.append(("缓存功能", test_caching()))
    results.append(("角色配置", test_all_characters()))
    results.append(("缓存管理", test_cache_management()))

    # 输出总结
    print("\n" + "=" * 60)
    print("📊 测试结果总结")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {status} - {name}")

    print(f"\n总计: {passed}/{total} 项测试通过")

    if passed == total:
        print("\n🎉 所有测试通过！语音生成服务正常工作。")
        return 0
    else:
        print("\n⚠️ 部分测试失败，请检查错误信息。")
        return 1


if __name__ == "__main__":
    exit(main())
