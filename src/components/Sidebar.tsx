import React from 'react'
import {
  MessageSquare,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Swords,        // 辩论模式 - 剑/对抗
  Users,         // 圆桌模式 - 多人讨论
  ThumbsUp,      // 表扬模式
  Flame,         // 吐槽模式
} from 'lucide-react'
import type { Conversation } from '../types'

interface SidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

// 根据对话模式获取对应的图标和颜色
const getModeIcon = (mode?: string) => {
  switch (mode) {
    case 'debate':
      return { icon: Swords, color: 'text-purple-500', bgColor: 'bg-purple-100' }
    case 'roundtable':
      return { icon: Users, color: 'text-green-500', bgColor: 'bg-green-100' }
    case 'praise':
      return { icon: ThumbsUp, color: 'text-orange-500', bgColor: 'bg-orange-100' }
    case 'roast':
      return { icon: Flame, color: 'text-red-500', bgColor: 'bg-red-100' }
    default:
      return { icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-100' }
  }
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`${
        isCollapsed ? 'w-0' : 'w-72'
      } bg-white border-r border-slate-200 flex flex-col transition-all duration-300 overflow-hidden flex-shrink-0 shadow-sm`}
    >
      {/* 头部 */}
      <div className="p-3 border-b border-slate-100">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200/60 font-medium text-sm transition-all cursor-pointer"
        >
          <Plus size={17} />
          <span>新对话</span>
        </button>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-8 px-4">
            暂无对话记录
          </div>
        ) : (
          conversations.map((conv) => {
            const modeConfig = getModeIcon(conv.mode)
            const IconComponent = modeConfig.icon

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  conv.id === currentConversationId
                    ? `${modeConfig.bgColor} shadow-sm`
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-md ${modeConfig.bgColor}`}>
                  <IconComponent size={14} className={`${modeConfig.color} flex-shrink-0`} />
                </div>
                <span className={`flex-1 truncate text-sm font-normal ${
                  conv.id === currentConversationId ? 'text-gray-800' : ''
                }`}>{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteConversation(conv.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* 底部折叠按钮 */}
      <div className="p-3 border-t border-slate-100">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-sm"
        >
          <PanelLeftClose size={16} />
          <span>收起侧边栏</span>
        </button>
      </div>
    </aside>
  )
}

// 折叠状态的侧边栏（只显示一个展开按钮）
export const CollapsedSidebar: React.FC<{ onToggleCollapse: () => void }> = ({
  onToggleCollapse,
}) => {
  return (
    <aside className="w-14 bg-white border-r border-slate-200 flex flex-col items-center pt-4 flex-shrink-0 shadow-sm">
      <button
        onClick={onToggleCollapse}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <PanelLeft size={18} />
      </button>
    </aside>
  )
}

export default Sidebar
