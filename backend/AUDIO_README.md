# 语音生成服务

## 功能特性

✅ **实时语音生成** - 调用 Fish Audio API 将文本转换为语音
✅ **智能缓存机制** - 自动缓存已生成的语音，避免重复调用 API
✅ **多角色支持** - 支持 8 个不同角色的语音（雷军、罗翔、马云等）
✅ **自动过期清理** - 可配置缓存过期时间，自动清理旧文件
✅ **RESTful API** - 提供标准化的 HTTP 接口供前端调用

## 角色列表

| 角色 ID | 名称 | 说明 |
|---------|------|------|
| `lzjp` | 雷军 | 科技企业家 |
| `loxd` | 罗翔 | 法学教授 |
| `mayp` | 马云 | 企业家 |
| `yjsds` | 老教授 | 学术专家 |
| `dsmzvu` | 董明珠 | 企业家 |
| `lqxcyj` | 刘晓艳 | 教育工作者 |
| `sjytqi` | 三月七 | 游戏角色 |
| `funzna` | 芙宁娜 | 游戏角色 |

## API 接口

### 1. 生成语音

**POST** `/api/audio/generate`

**请求体:**
```json
{
    "text": "要转换的文本内容",
    "character_id": "lzjp",
    "use_cache": true
}
```

**响应:**
```json
{
    "success": true,
    "voiceUrl": "/api/voice/lzjp_abc123.wav",
    "voiceText": "原始文本",
    "fromCache": false,
    "message": "生成成功"
}
```

**示例 (curl):**
```bash
curl -X POST http://localhost:8000/api/audio/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "你好，这是一个测试",
    "character_id": "lzjp"
  }'
```

### 2. 查询缓存信息

**GET** `/api/audio/cache/info`

**响应:**
```json
{
    "success": true,
    "total_files": 15,
    "total_size_mb": 12.5,
    "cache_dir": "voice_cache"
}
```

### 3. 清理缓存

**POST** `/api/audio/cache/clear`

**请求体（可选）:**
```json
{
    "max_age_hours": 24
}
```

**响应:**
```json
{
    "success": true,
    "deletedCount": 3,
    "message": "已清理 3 个过期缓存文件"
}
```

## 缓存机制

### 工作原理

1. **请求到达时** → 计算文本的 MD5 哈希值
2. **检查缓存** → 查找 `{角色ID}_{文本哈希}.wav`
3. **命中缓存** → 直接返回文件路径（快速响应）
4. **未命中** → 调用 Fish Audio API 生成语音并保存到缓存

### 缓存文件命名规则

```
voice_cache/
├── lzjp_a1b2c3d4e5f6.wav      # 雷军的某段语音
├── loxd_f7g8h9i0j1k2.wav     # 罗翔的某段语音
└── mayp_m3n4o5p6q7r8.wav     # 马云的某段语音
```

### 缓存有效期

- **默认**: 24 小时
- **可配置**: 通过 `max_age_hours` 参数调整
- **自动清理**: 可手动或定时清理过期文件

## 使用示例

### Python 后端调用

```python
from audio_generation import generate_audio

# 生成语音（自动使用缓存）
result = generate_audio(
    text="你好，世界！",
    character_id="lzjp"  # 雷军的声音
)

if result:
    print(f"语音文件路径: {result}")
    # 输出: voice_cache/lzjp_abc123.wav
```

### 前端 JavaScript 调用

```javascript
async function generateVoice(text, characterId) {
    const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: text,
            character_id: characterId
        })
    })

    const data = await response.json()

    if (data.success) {
        console.log('语音URL:', data.voiceUrl)
        console.log('是否来自缓存:', data.fromCache)

        // 播放语音
        const audio = new Audio(data.voiceUrl)
        audio.play()
    }
}

// 使用示例
generateVoice('今天天气真好', 'loxd')  // 使用罗翔的声音
```

## 配置选项

### 在 `audio_generation.py` 中修改

```python
# 缓存目录（默认: voice_cache）
CACHE_DIR = Path("voice_cache")

# 缓存有效期（默认: 24小时）
MAX_CACHE_AGE_HOURS = 24
```

### 添加新角色

在 `VOICE_IDS` 字典中添加新的映射：

```python
VOICE_IDS = {
    # ... 已有角色 ...
    "new_character": "fish_audio_reference_id",  # 添加新角色
}
```

## 测试

运行测试套件：

```bash
cd backend
python test_audio.py
```

测试内容包括：
- ✅ 基本语音生成功能
- ✅ 缓存读写测试
- ✅ 所有角色配置验证
- ✅ 缓存管理功能

## 目录结构

```
backend/
├── audio_generation.py   # 核心生成逻辑 + 缓存
├── test_audio.py         # 测试脚本
├── voice_cache/          # 自动创建的缓存目录
│   ├── lzjp_*.wav
│   ├── loxd_*.wav
│   └── ...
└── AUDIO_README.md       # 本文档
```

## 注意事项

### ⚠️ API Key 安全

- 当前 API Key 直接写在代码中（仅用于开发测试）
- 生产环境应使用环境变量：
  ```python
  import os
  api_key = os.getenv("FISH_AUDIO_API_KEY")
  ```

### ⚠️ 网络依赖

- 语音生成需要联网调用 Fish Audio API
- 首次生成某个文本时会较慢（约 2-5 秒）
- 之后相同文本会立即返回（从缓存读取）

### ⚠️ 存储空间

- 缓存文件会占用磁盘空间
- 建议定期清理或设置合理的过期时间
- 可通过 `/api/audio/cache/info` 监控缓存大小

## 故障排查

### 问题：语音生成失败

**可能原因：**
1. 角色 ID 不正确
2. 网络连接问题
3. Fish Audio API 配额用尽

**解决方案：**
```python
# 检查角色 ID 是否正确
from audio_generation import VOICE_IDS
print(VOICE_IDS.keys())  # 查看所有可用角色
```

### 问题：缓存不生效

**可能原因：**
1. 文本有微小差异（空格、标点等）
2. 缓存文件被删除
3. 缓存已过期

**解决方案：**
```python
# 查看实际生成的缓存文件名
from audio_generation import get_cached_audio_path, get_text_hash
text_hash = get_text_hash("你的文本")
cache_path = get_cached_audio_path("lzjp", text)
print(f"缓存路径: {cache_path}")
print(f"文件存在: {cache_path.exists()}")
```

## 更新日志

### v2.0.0 (2024-01)
- ✨ 新增智能缓存机制
- ✨ 支持多角色语音
- ✨ 添加 RESTful API 接口
- 🔧 优化错误处理和日志输出
- 📝 完善文档和测试

---

**作者**: AI Assistant  
**版本**: 2.0.0  
**许可证**: MIT
