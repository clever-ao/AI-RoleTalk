// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'

// 单条消息
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  model?: string
  // 语音相关字段
  voiceUrl?: string        // 语音文件 URL
  voiceText?: string       // 语音对应的文本内容（默认隐藏，双击展开）
  // 辩论模式相关字段
  speaker?: {
    side: 'pro' | 'con'    // 正方或反方
    position: string        // 辩位（如"一辩"）
    name: string            // 角色名称
    character_id: string     // 角色ID
  }
  type?: 'speech' | 'system' | 'round_transition' | 'debate_end'  // 消息类型
  // 内部标记字段（不序列化到后端）
  _praise?: boolean         // 夸夸模式标记（用于渲染时路由到 PraiseMessageBubble）
  _roast?: boolean          // 骂骂模式标记（用于渲染时路由到 RoastMessageBubble）
  _isGeneratingVoice?: boolean  // 语音生成中标记
}

// 对话/会话
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: string              // 当前主模型（兼容）
  models?: string[]          // 多选模型列表
  mode?: ChatMode            // 对话模式
  createdAt: number
  updatedAt: number
}

// 模型配置
export interface ModelConfig {
  id: string
  name: string
  provider: string
  description: string
  icon?: string           // 图标 emoji（降级显示）
  color?: string          // 主题色
  avatarUrl?: string      // 头像图片 URL
  audioUrl?: string       // 点击播放的语音 URL
}

// 对话模式
export type ChatMode = 'debate' | 'roundtable' | 'praise' | 'roast'

// 模式配置
export interface ChatModeConfig {
  id: ChatMode
  name: string
  description: string
  icon: string            // emoji 图标
  color: string           // 主题色
}

// API 请求体
export interface ChatRequest {
  model: string
  messages: { role: string; content: string }[]
  stream?: boolean
}
