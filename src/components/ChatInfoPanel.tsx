import React from 'react'
import { Bot, Settings2, Layers, Sparkles, PanelRightClose, PanelRightOpen } from 'lucide-react'
import type { Conversation } from '../types'
import { MODELS, CHAT_MODES } from '../config'

interface ChatInfoPanelProps {
  conversation: Conversation | null | undefined
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({ conversation, isCollapsed, onToggleCollapse }) => {
  // 折叠状态：只显示一个窄条 + 切换按钮
  if (isCollapsed) {
    return (
      <div className="w-10 border-l border-slate-200/80 bg-white shrink-0 hidden lg:flex flex-col items-center py-3 gap-2">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          title="展开对话配置"
        >
          <PanelRightOpen size={16} />
        </button>
        {conversation && (
          <div className="flex flex-col items-center gap-2 mt-2">
            {/* 模型数量指示 */}
            <div className="relative group">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                <Layers size={12} className="text-blue-500" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                {(conversation.models || [conversation.model]).length}
              </span>
            </div>
            {/* 模式图标 */}
            {conversation.mode && (() => {
              const mc = CHAT_MODES.find(m => m.id === conversation.mode)
              return mc ? (
                <span className="text-base" title={`${mc.name}: ${mc.description}`}>{mc.icon}</span>
              ) : null
            })()}
          </div>
        )}
      </div>
    )
  }

  // 空状态（未选择对话）
  if (!conversation) {
    return (
      <div className="w-64 border-l border-slate-200/80 bg-white shrink-0 hidden lg:flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Settings2 size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">配置</span>
          </div>
          <button onClick={onToggleCollapse} className="p-1 rounded-md hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer" title="收起面板">
            <PanelRightClose size={14} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-slate-300 text-center leading-relaxed">选择对话<br/>查看配置</p>
        </div>
      </div>
    )
  }

  const selectedModels = conversation.models || [conversation.model]
  const mode = conversation.mode
  const modeConfig = CHAT_MODES.find(m => m.id === mode)

  return (
    <div className="w-64 border-l border-slate-200/80 bg-white/80 backdrop-blur-sm shrink-0 hidden lg:flex flex-col overflow-y-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-500">
          <Settings2 size={15} />
          <span className="text-xs font-semibold uppercase tracking-wider">对话配置</span>
        </div>
        <button onClick={onToggleCollapse} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" title="收起面板">
          <PanelRightClose size={14} />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* 对话名称 */}
        <div>
          <label className="flex text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            对话名称
          </label>
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-sm font-medium text-slate-700 truncate">{conversation.title}</p>
          </div>
        </div>

        {/* 已选模型（按选中顺序显示，带序号） */}
        <div>
          <label className="flex text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 items-center gap-1.5">
            <Layers size={12} />
            已选模型 ({selectedModels.length})
          </label>
          <div className="space-y-1.5">
            {selectedModels.map((modelId, index) => {
              const model = MODELS.find(m => m.id === modelId)
              if (!model) return null
              return (
                <div
                  key={model.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  {/* 序号圆标 */}
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: model.color }}
                  >
                    {index + 1}
                  </span>
                  {/* 模型头像 - 优先使用真实图片 */}
                  {model.avatarUrl ? (
                    <img
                      src={model.avatarUrl}
                      alt={model.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                      title={model.name}
                    />
                  ) : (
                    <span className="text-sm w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${model.color}14` }}>
                      {model.icon}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{model.name}</p>
                    <p className="text-[10px] text-slate-400">{model.provider}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 对话模式（只读展示） */}
        <div>
          <label className="flex text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 items-center gap-1.5">
            <Sparkles size={12} />
            对话模式
          </label>
          {modeConfig ? (
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2"
              style={{
                borderColor: `${modeConfig.color}30`,
                backgroundColor: `${modeConfig.color}08`,
              }}
            >
              <span className="text-xl">{modeConfig.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: modeConfig.color }}>
                  {modeConfig.name}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{modeConfig.description}</p>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 text-sm">
              未设置模式
            </div>
          )}
        </div>

        {/* 对话信息 */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            <Bot size={12} className="inline mr-1" />
            统计信息
          </label>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-3 py-1.5 rounded-md bg-slate-50 text-xs">
              <span className="text-slate-400">消息数</span>
              <span className="font-medium text-slate-600">{conversation.messages.length}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-1.5 rounded-md bg-slate-50 text-xs">
              <span className="text-slate-400">创建时间</span>
              <span className="font-medium text-slate-600">
                {new Date(conversation.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部分隔提示 */}
      <div className="px-4 py-2.5 border-t border-slate-100">
        <p className="text-[10px] text-slate-300 text-center">配置在创建时确定，不可修改</p>
      </div>
    </div>
  )
}

export default ChatInfoPanel
