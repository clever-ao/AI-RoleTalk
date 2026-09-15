# AI对话角色工坊

<p align="center">
  <b>基于TTS多轮对话的AI角色工坊</b><br>
  <sub>与你所塑造的AI角色一同对话、交流、辩论 ✨</sub>
</p>

<p align="center">
  <img src="docs\\icons\\React.svg" alt="React 19" />
  <img src="docs\\icons\\TypeScript-6.svg" alt="TypeScript 6" />
  <img src="docs\\icons\\TailwindCSS.svg" alt="TailwindCSS 4" />
  <img src="docs\\icons\\Python.svg" alt="Python" />
  <img src="docs\\icons\\\\FastAPI.svg" alt="FastAPI" />
  <img src="docs\\icons\\DeepSeek-V4.svg" alt="DeepSeek V4" />
</p>

---

## 🌟 项目简介

这是一个基于 **DeepSeek V4 Flash** 大模型与 **TTS 语音合成** 技术构建的多智能体（Multi-Agent）对话应用。它打破了传统 AI 单一问答的局限，允许用户自定义多个 AI 角色，并让它们在同一场景下进行**多轮、有立场、有情感**的交互
![[docs\\images\\current.png]]

### ✨ 核心特性

- 🤖 **真实 AI 对话** — 接入 DeepSeek V4 Flash 大模型，生成高质量辩论内容
- 🎭 **多种模式** — 支持经典辩论、夸夸模式、骂骂模式
- 🎙️ **语音合成** — 支持多角色 TTS 语音播放，沉浸式辩论体验
- 👤 **自定义角色** — 可自定义辩论角色、头像、声音和立场
- 🎨 **精美 UI** — 使用 Tailwind CSS 打造现代化响应式界面

### 🌟核心模式详解

#### 🤝 辩论模式（经典辩论 / 圆桌讨论）

- **场景描述**：模拟真实的辩论赛或圆桌会议。用户可以设定一个辩题（如“人工智能是否会取代人类”），并配置正反双方的角色。
- **交互逻辑**：系统按照**顺序或随机**的方式调度 Agent 发言。每个 Agent 拥有独立的“提示词/画像”、“知识库（KB/RAG）”和“LLM 引擎”。
- **流程**：用户输入初始话题 → Agent 调度器分配发言权 → LLM 生成逻辑严密的辩词 → TTS 引擎合成语音 → 全局对话历史数据库（H）记录上下文 → 循环至最大轮次或用户终止。
- **特点**：逻辑严谨，立场鲜明，适合深度思考和观点碰撞。

#### 🌟 夸夸模式（情感治愈 / 正向反馈）

- **场景描述**：当你伤心、受挫或需要鼓励时，AI 角色会化身为“夸夸群群主”。
- **交互逻辑**：AI 会根据你的输入（如“我论文被拒了”），生成**温暖、鼓励、共情**的回复。
- **案例展示**：
  - **用户**：“我的论文又被拒了，这次是我第三次被拒稿了，怎么办？”
  - **AI（芙宁娜）**：“哼！三次被拒？多么精彩的剧本铺垫！正是这样的反复打磨，才能让最终登场的演出更加震撼人心！每个伟大的故事都需要经历转折点，而你的转折序幕已经拉开。别担心，聚光灯终会照向你，好戏永远值得等待。甜点时间过后，再战一次如何？”
  - **AI（三月七）**：“哎呀，听着就让人心疼！我懂这种感觉，就像照相时明明觉得完美，结果胶片曝光了一样难受。但是你看，咱们开拓之旅什么时候一帆风顺过？三次算什么，咱们可是要把故事写成传奇的人！等下次冒险结束，我请你喝最甜的饮品庆祝！”
- **特点**：情感细腻，语言风格贴合角色设定，提供情绪价值。

#### 🔥 骂骂模式（清醒剂 / 情绪发泄）

- **场景描述**：当你过于骄傲自满，或者感到憋屈需要发泄时，AI 角色会变成“毒舌”或“严师”，给你当头棒喝。
- **交互逻辑**：AI 会以**犀利、直接、甚至略带攻击性**的语言进行回复，旨在打破你的幻想或帮你释放压力。
- **案例展示**：
  - **用户**：“我今天 nature 文章中了，今天晚上我要吃顿大的，明天后天给自己放假出去玩。”
  - **AI（老教授）**：“中了一篇 Nature 就飘成这样？你数据备份了没？重复性实验补全了没？审稿人的质疑你都逐条回应了吗？吃大餐玩两天？梦里啥都有！今晚 12 点前把原始数据打包发我，不然这篇推送你只能靠朋友圈了！”
  - **AI（三月七）**：“哈哈哈！研究生刚上岸就惦记上院士了？那您可得先学会等审稿人三个月不回邮件时说‘谢谢老师辛苦了’呢！科学院的院士评审要是看见您这样，估计得连夜改章程。梦先别醒，趁还没被打回原形，麻溜儿请我喝奶茶，不然我就在丹恒面前揭你老底，说你连实验数据都躺网盘里没备份呢！”
- **特点**：言辞犀利，一针见血，适合需要清醒或寻求“痛并快乐着”解压体验的用户。

---

### 🏗️ 技术架构

```
┌──────────────────────────────────────────────┐
│                   Frontend                   │
│  React 19 + TypeScript + Tailwind CSS 4      │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Debate  │ │ Sidebar  │ │ Voice Player │   │
│  │  Board  │ │   Panel  │ │  Component   │   │
│  └────┬────┘ └────┬─────┘ └──────┬───────┘   │
│       └───────────┼──────────────┘           │
│                   │ REST API                 │
├───────────────────┼──────────────────────────┤
│                   │        Backend           │
│  ┌────────────────┴───────────────────────┐  │
│  │  FastAPI + Python                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │ Routes   │ │ Services │ │ TTS     │ │  │
│  │  └──────────┘ └────┬─────┘ └─────────┘ │  │
│  └────────────────────┼───────────────────┘  │
│                       │                      │
│  ┌────────────────────┴──────────────────┐   │
│  │  DeepSeek API (LLM)    │  TTS Engine  │   │
│  └────────────────────────┴──────────────┘   │
└──────────────────────────────────────────────┘
```

#### 技术栈

| 层级              | 技术                                         |
| ----------------- | -------------------------------------------- |
| **前端**    | React 19, TypeScript 6, Tailwind CSS 4, Vite |
| **后端**    | Python 3.10+, FastAPI, Uvicorn               |
| **AI 模型** | DeepSeek V4 Flash (OpenAI 兼容接口)          |
| **语音**    | 自定义 TTS / Fish Speech (可选)              |
| **构建**    | npm, Vite                                    |

### 🥳 项目开发彩蛋

<img src="docs\\images\\problem.png"/>

---

## 🎬 效果预览

### 辩论模式

选择模型

<img src="docs\\images\\role_choice.png"/>

辩题设立

<img src="docs\\images\\debate.png"/>

辩论细节

<img src="docs\\images\\pre1.png"/>

<img src="docs\\images\\pre2.png"/>

<img src="docs\\images\\pre3.png"/>

### 夸夸模式

<img src="docs\\images\\kwkw.png"/>

演示效果

<img src="docs\\images\\pre_kwkw.png"/>

### 骂骂模式

<img src="docs\\images\\mama.png"/>

演示截图

<img src="docs\\images\\pre_mama.png"/>

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0
- **Python** >= 3.10
- **DeepSeek API Key** ([获取地址](https://platform.deepseek.com/api_keys))
- **FishSpeech API Key** 更改 `backend`下的 `audio_generation.py`

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ai-debate-simulator.git
cd ai-debate-simulator/chat-app
```

### 2. 启动后端

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install fastapi uvicorn httpx python-dotenv

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 DeepSeek API Key

# 启动后端服务
python main.py
```

后端服务将在 `http://localhost:8000` 启动。

### 3. 启动前端

```bash
# 回到项目根目录
cd chat-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://localhost:5173` 启动。

### 4. 开始使用

打开浏览器访问 `http://localhost:5173`

---

## ⚙️ 配置说明

### 环境变量 (`.env`)

```env
# DeepSeek API Key (必需，用于真实 AI 对话)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# 运行模式
# true  = 演示模式（使用模拟数据，无需 API Key）
# false = 真实模式（调用 DeepSeek API 生成内容）
DEMO_MODE=false

backend 下的 `audio_generation.py` api-key
```

## 🗂️ 项目结构

```
chat-app/
├── backend/                 # Python 后端
│   ├── main.py             # FastAPI 主入口
│   ├── debate_service.py   # 辩论服务核心逻辑
│   ├── chat_service.py     # 聊天服务
│   ├── routes.py           # API 路由
│   ├── models.py           # 数据模型
│   ├── config.py           # 配置文件
│   ├── static_files.py     # 静态文件服务
│   └── backgrounds/        # 角色背景数据
│       ├── loxd.py
│       ├── lzjp.py
│       └── ...
├── src/                    # React 前端
│   ├── App.tsx             # 主应用组件
│   ├── components/         # UI 组件
│   │   ├── Sidebar.tsx     # 侧边栏
│   │   ├── DebateBoard.tsx # 辩论面板
│   │   ├── VoicePlayer.tsx # 语音播放器
│   │   └── ...
│   ├── types/              # TypeScript 类型定义
│   └── assets/             # 静态资源
├── public/                 # 公开资源
│   ├── model-data/         # 模型数据
│   └── api/                # API 相关
├── voice_cache/            # 语音缓存
├── .env.example            # 环境变量示例
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

---

## 🔧 开发指南

### 添加新的辩论模式

1. 在 `backend/models.py` 中定义新的模式枚举
2. 在 `backend/debate_service.py` 中实现对应逻辑
3. 在 `src/App.tsx` 中添加前端交互

### 自定义角色

在 `backend/backgrounds/` 目录下创建新的角色文件，定义角色的背景信息和发言风格。

### 更换大模型

修改 `backend/debate_service.py` 中的 API 调用配置即可切换为其他 OpenAI 兼容接口。

---

## 🐛 常见问题

**Q: 502 Bad Gateway 错误？**

> 请检查后端是否正常启动，确认端口 8000 未被占用。

**Q: API 调用失败怎么办？**

> 系统会自动降级到演示模式。请检查 API Key 是否正确，或网络连接是否正常。

**Q: 没有 API Key 可以使用吗？**

> 可以！将 `DEMO_MODE` 设置为 `true` 即可使用演示模式体验完整功能。

**Q: 如何更换其他大模型？**

> 修改 `backend/debate_service.py` 中的 `model` 参数和 API 地址即可切换到其他 OpenAI 兼容模型。

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！在贡献代码前，请确保：

1. 代码风格与项目保持一致
2. 新功能包含相应的注释文档
3. 提交前进行本地测试

```bash
# Fork 并克隆项目
git clone https://github.com/your-username/ai-debate-simulator.git

# 创建功能分支
git checkout -b feature/your-feature-name

# 提交更改
git commit -m "feat: add your feature"

# 推送到远程
git push origin feature/your-feature-name
```

---

## ⭐ Star History

如果这个项目对你有帮助，欢迎给个 ⭐ Star 支持！

<p align="center">
  <sub>Built with ❤️ using React + FastAPI + DeepSeek + Fish Speech</sub>
</p>
