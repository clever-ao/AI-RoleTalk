import type { ModelConfig, ChatModeConfig } from './types'

// 可用模型列表 - 8个模型（人物角色），上4下4排列
export const MODELS: ModelConfig[] = [
  // 上排 4 个
  {
    id: 'loxd',
    name: '罗翔',
    provider: '法学教授',
    description: '普法达人，幽默风趣',
    icon: '🧑‍⚖️',
    color: '#1a56db',
    avatarUrl: '/model-data/pic/loxd.png',
    audioUrl: '/model-data/audio/loxd.wav',
  },
  {
    id: 'dsmzvu',
    name: '董明珠',
    provider: '格力电器',
    description: '铁娘子，雷厉风行',
    icon: '👩‍💼',
    color: '#c0272d',
    avatarUrl: '/model-data/pic/dsmzvu.png',
    audioUrl: '/model-data/audio/dsmzvu.wav',
  },
  {
    id: 'funzna',
    name: '芙宁娜',
    provider: '枫丹',
    description: '水神，古灵精怪',
    icon: '🌊',
    color: '#4fc3f7',
    avatarUrl: '/model-data/pic/funzna.png',
    audioUrl: '/model-data/audio/funzna.wav',
  },
  {
    id: 'lqxcyj',
    name: '刘晓艳',
    provider: '考研英语',
    description: '英语名师，风趣幽默',
    icon: '📚',
    color: '#7b1fa2',
    avatarUrl: '/model-data/pic/lqxcyj.png',
    audioUrl: '/model-data/audio/lqxcyj.wav',
  },
  // 下排 4 个
  {
    id: 'lzjp',
    name: '雷军',
    provider: '小米科技',
    description: 'Are you OK？',
    icon: '📱',
    color: '#ff6900',
    avatarUrl: '/model-data/pic/lzjp.png',
    audioUrl: '/model-data/audio/lzjp.wav',
  },
  {
    id: 'mayp',
    name: '马云',
    provider: '阿里巴巴',
    description: '马云爸爸，创业教父',
    icon: '💰',
    color: '#ff6a00',
    avatarUrl: '/model-data/pic/mayp.png',
    audioUrl: '/model-data/audio/mayp.wav',
  },
  {
    id: 'sjytqi',
    name: '三月七',
    provider: '星穹铁道',
    description: '活泼可爱，元气满满',
    icon: '🌸',
    color: '#ec407a',
    avatarUrl: '/model-data/pic/sjytqi.png',
    audioUrl: '/model-data/audio/sjytqi.wav',
  },
  {
    id: 'yjsds',
    name: '老教授',
    provider: '学术泰斗',
    description: '学识渊博，严谨治学',
    icon: '🎓',
    color: '#5d4037',
    avatarUrl: '/model-data/pic/yjsds.png',
    audioUrl: '/model-data/audio/yjsds.wav',
  },
]

// 默认模型
export const DEFAULT_MODEL = 'loxd'

// 对话模式 - 4种
export const CHAT_MODES: ChatModeConfig[] = [
  {
    id: 'debate',
    name: '辩论模式',
    description: 'AI 会从反面角度挑战你的观点，激发深度思考',
    icon: '⚔️',
    color: '#ef4444',
  },
  {
    id: 'roundtable',
    name: '圆桌会议',
    description: '多角色讨论，从不同视角全面分析问题',
    icon: '🏛️',
    color: '#8b5cf6',
  },
  {
    id: 'praise',
    name: '夸夸模式',
    description: 'AI 会积极鼓励你，给予正向反馈和赞美',
    icon: '🌟',
    color: '#f59e0b',
  },
  {
    id: 'roast',
    name: '骂骂模式',
    description: 'AI 会犀利吐槽，用幽默方式指出问题',
    icon: '🔥',
    color: '#ec4899',
  },
]

// 默认模式
export const DEFAULT_MODE = 'debate' as const

// API 基础地址
export const API_BASE_URL = '/api'
