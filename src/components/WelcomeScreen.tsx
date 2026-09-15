import React from 'react'
import { MessageSquare, Sparkles, Zap, Mic } from 'lucide-react'

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void
}

const suggestions = [
  {
    icon: <Sparkles size={18} />,
    title: '解释一个概念',
    text: '请用简单的语言解释什么是量子计算',
    color: 'bg-violet-50 text-violet-500 border-violet-100 hover:bg-violet-100',
  },
  {
    icon: <Zap size={18} />,
    title: '编写代码',
    text: '帮我写一个 Python 快速排序算法',
    color: 'bg-amber-50 text-amber-500 border-amber-100 hover:bg-amber-100',
  },
  {
    icon: <Mic size={18} />,
    title: '语音对话',
    text: '你好，请用语音回复我',
    color: 'bg-emerald-50 text-emerald-500 border-emerald-100 hover:bg-emerald-100',
  },
]

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Logo / 标题 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200/50 mb-5">
            <MessageSquare size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            多模型 AI 助手
          </h1>
          <p className="text-slate-400 text-[15px] font-normal">
            选择不同的 AI 模型，开始你的对话 · 支持语音回复
          </p>
        </div>

        {/* 建议卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion.text)}
              className={`group p-4 bg-white border rounded-xl text-left transition-all cursor-pointer hover:shadow-md ${suggestion.color}`}
            >
              <div className={`flex items-center gap-2 mb-2`}>
                <span className={``}>{suggestion.icon}</span>
                <span className="font-semibold text-sm text-slate-700">{suggestion.title}</span>
              </div>
              <p className="text-sm text-slate-400 group-hover:text-slate-500 leading-relaxed">
                {suggestion.text}
              </p>
            </button>
          ))}
        </div>

        {/* 底部特性标签 */}
        <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
          {['流式输出', 'Markdown 渲染', '语音播放', '多模型切换'].map((tag, i) => (
            <span key={i} className="px-3 py-1 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
