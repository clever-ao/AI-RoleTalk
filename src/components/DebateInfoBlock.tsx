import React, { useState, useEffect, useRef } from 'react'
import { Scale, MessageCircle, ChevronRight, Trophy, ChevronUp, ChevronDown } from 'lucide-react'
import { MODELS } from '../config'
import type { DebateState, CurrentSpeakerInfo } from '../types/debate'

interface DebateInfoBlockProps {
  debateState: DebateState | null
  currentSpeaker?: {
    side: string
    position: string
    name: string
    character_id: string
  } | null
  instruction?: string
  onAction?: (action: 'next' | 'end') => void
  compact?: boolean
  isGeneratingVoice?: boolean  // 是否正在生成语音
}

const DebateInfoBlock: React.FC<DebateInfoBlockProps> = ({
  debateState,
  currentSpeaker,
  instruction,
  onAction,
  compact = false,
  isGeneratingVoice = false
}) => {
  // 展开状态：默认展开
  const [isExpanded, setIsExpanded] = useState(true)
  const prevDebateStateRef = useRef(debateState)

  // 当辩论状态首次出现（从 null 变为有值）或辩论结束时，自动展开
  useEffect(() => {
    const prev = prevDebateStateRef.current

    // 首次接收到 debateState（刚创建）
    if (!prev && debateState) {
      setIsExpanded(true)
    }
    // 辩论结束
    else if (prev?.is_active && !debateState?.is_active) {
      setIsExpanded(true)
    }

    prevDebateStateRef.current = debateState
  }, [debateState])

  if (!debateState) return null

  // 获取模型头像URL
  const getAvatarUrl = (characterId: string) => {
    const model = MODELS.find(m => m.id === characterId)
    // 使用模型配置中的头像，如果没有则使用默认头像路径
    return model?.avatarUrl || `/model-data/pic/${characterId}.png`
  }

  const getPositionLabel = (position: number) => {
    const labels = ['', '一辩', '二辩', '三辩', '四辩']
    return labels[position] || `${position}辩`
  }

  if (compact) {
    // 紧凑模式：底部固定控制栏，支持展开/收起
    return (
      <div className="relative">
        {/* 紧凑视图 - 始终显示 */}
        <div className="flex items-center justify-between gap-3">
          {/* 左侧：图标和基本信息 */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Scale size={16} className="text-indigo-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {debateState.topic}
              </p>
              {currentSpeaker && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img
                    src={getAvatarUrl(currentSpeaker.character_id)}
                    alt={currentSpeaker.name}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <span className={`text-xs font-medium ${
                    currentSpeaker.side === '正方' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {currentSpeaker.name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {currentSpeaker.side}·{currentSpeaker.position}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：状态、展开按钮和操作按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {debateState.current_round && (
              <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded hidden sm:inline-block">
                {debateState.current_round.name}
              </span>
            )}

            {/* 展开/收起按钮 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-700"
              title={isExpanded ? "收起详情" : "展开详情"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* 操作按钮 - 始终显示（当辩论进行中时） */}
            {onAction && debateState.is_active && (
              <>
                <button
                  onClick={() => {
                    if (!isGeneratingVoice) {
                      onAction('next')
                      setIsExpanded(false) // 点击下一位后自动收起
                    }
                  }}
                  disabled={isGeneratingVoice}
                  className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-sm"
                >
                  <ChevronRight size={14} />
                  下一位
                </button>

                <button
                  onClick={() => onAction('end')}
                  disabled={isGeneratingVoice}
                  className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-100 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed text-gray-600 rounded-md text-xs font-medium transition-colors"
                >
                  结束
                </button>
              </>
            )}
          </div>
        </div>

        {/* 展开的详细信息 */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            {/* 队伍信息 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 正方 */}
              <div className="bg-blue-50/50 rounded-lg p-2.5">
                <h4 className="text-xs font-semibold text-blue-800 mb-2">正方</h4>
                <div className="space-y-1.5">
                  {debateState.pro_team.members
                    .sort((a, b) => a.position - b.position)
                    .map((member) => {
                      const isCurrent = currentSpeaker?.character_id === member.id
                      return (
                        <div key={member.id} className={`flex items-center gap-2 p-1.5 rounded ${isCurrent ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                          <img src={getAvatarUrl(member.id)} alt={member.name} className={`w-6 h-6 rounded-full object-cover ${isCurrent ? 'ring-1 ring-white/50' : ''}`} onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-medium truncate ${isCurrent ? 'text-white' : 'text-gray-900'}`}>{member.name}</p>
                            <p className={`text-[9px] ${isCurrent ? 'text-blue-100' : 'text-gray-500'}`}>{getPositionLabel(member.position)}</p>
                          </div>
                          {isCurrent && <MessageCircle size={10} className="animate-pulse flex-shrink-0" />}
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* 反方 */}
              <div className="bg-red-50/50 rounded-lg p-2.5">
                <h4 className="text-xs font-semibold text-red-800 mb-2">反方</h4>
                <div className="space-y-1.5">
                  {debateState.con_team.members
                    .sort((a, b) => a.position - b.position)
                    .map((member) => {
                      const isCurrent = currentSpeaker?.character_id === member.id
                      return (
                        <div key={member.id} className={`flex items-center gap-2 p-1.5 rounded ${isCurrent ? 'bg-red-500 text-white' : 'bg-white'}`}>
                          <img src={getAvatarUrl(member.id)} alt={member.name} className={`w-6 h-6 rounded-full object-cover ${isCurrent ? 'ring-1 ring-white/50' : ''}`} onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-medium truncate ${isCurrent ? 'text-white' : 'text-gray-900'}`}>{member.name}</p>
                            <p className={`text-[9px] ${isCurrent ? 'text-red-100' : 'text-gray-500'}`}>{getPositionLabel(member.position)}</p>
                          </div>
                          {isCurrent && <MessageCircle size={10} className="animate-pulse flex-shrink-0" />}
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* 提示信息和操作按钮 */}
            <div className="space-y-2">
              {instruction && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800 whitespace-pre-line leading-relaxed">{instruction}</p>
                </div>
              )}

              {onAction && debateState.is_active && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!isGeneratingVoice) {
                        onAction('next')
                        setIsExpanded(false) // 点击下一位后自动收起
                      }
                    }}
                    disabled={isGeneratingVoice}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <ChevronRight size={16} />
                    开始答辩 / 下一位发言
                  </button>

                  <button
                    onClick={() => onAction('end')}
                    disabled={isGeneratingVoice}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-100 disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed text-gray-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    结束辩论
                  </button>
                </div>
              )}
            </div>

            {/* 进度条 */}
            {debateState.is_active && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  {Array.from({ length: debateState.total_rounds }).map((_, i) => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                      i < debateState.current_round_index ? 'bg-green-500' :
                      i === debateState.current_round_index ? 'bg-indigo-500 animate-pulse' : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-gray-400">
                  <span>开篇立论</span>
                  <span>总结陈词</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="debate-info-block bg-white border-2 border-indigo-100 rounded-2xl overflow-hidden shadow-sm max-w-3xl mx-auto">
      {/* 头部：辩题和状态 - 更紧凑 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Scale size={18} />
            <h3 className="font-bold text-base">辩论模式</h3>
            {!debateState.is_active && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Trophy size={12} /> 已结束
              </span>
            )}
          </div>

          {debateState.current_round && (
            <div className="text-right ml-4">
              <p className="text-xs text-indigo-200">当前环节</p>
              <p className="text-sm font-semibold">{debateState.current_round.name}</p>
            </div>
          )}
        </div>

        {/* 辩题 - 单行显示 */}
        <p className="text-indigo-100 text-sm mt-2 truncate">
          辩题：<span className="font-semibold text-white">{debateState.topic}</span>
        </p>
      </div>

      {/* 队伍展示 - 更紧凑的布局 */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 gap-0">
        {/* 正方队伍 */}
        <div className="p-3.5 bg-blue-50/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
              正
            </div>
            <h4 className="font-semibold text-blue-900 text-xs">正方</h4>
          </div>

          <div className="space-y-1.5">
            {debateState.pro_team.members
              .sort((a, b) => a.position - b.position)
              .map((member) => {
                const isCurrentSpeaker = currentSpeaker?.character_id === member.id
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                      isCurrentSpeaker
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white hover:bg-blue-50'
                    }`}
                  >
                    {/* 使用真实头像 */}
                    <img
                      src={getAvatarUrl(member.id)}
                      alt={member.name}
                      className={`w-7 h-7 rounded-full flex-shrink-0 object-cover ${
                        isCurrentSpeaker ? 'ring-2 ring-white/50' : ''
                      }`}
                      onError={(e) => {
                        // 图片加载失败时显示首字母
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling!.classList.remove('hidden')
                      }}
                    />
                    {/* 首字母备用显示 */}
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 hidden items-center justify-center text-xs font-bold ${
                      isCurrentSpeaker ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {member.name[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${
                        isCurrentSpeaker ? 'text-white' : 'text-gray-900'
                      }`}>
                        {member.name}
                      </p>
                      <p className={`text-[10px] ${
                        isCurrentSpeaker ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {getPositionLabel(member.position)}
                      </p>
                    </div>

                    {isCurrentSpeaker && (
                      <MessageCircle size={12} className="animate-pulse flex-shrink-0" />
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        {/* 反方队伍 */}
        <div className="p-3.5 bg-red-50/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center text-white font-bold text-xs">
              反
            </div>
            <h4 className="font-semibold text-red-900 text-xs">反方</h4>
          </div>

          <div className="space-y-1.5">
            {debateState.con_team.members
              .sort((a, b) => a.position - b.position)
              .map((member) => {
                const isCurrentSpeaker = currentSpeaker?.character_id === member.id
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                      isCurrentSpeaker
                        ? 'bg-red-500 text-white shadow-md'
                        : 'bg-white hover:bg-red-50'
                    }`}
                  >
                    {/* 使用真实头像 */}
                    <img
                      src={getAvatarUrl(member.id)}
                      alt={member.name}
                      className={`w-7 h-7 rounded-full flex-shrink-0 object-cover ${
                        isCurrentSpeaker ? 'ring-2 ring-white/50' : ''
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.nextElementSibling!.classList.remove('hidden')
                      }}
                    />
                    {/* 首字母备用显示 */}
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 hidden items-center justify-center text-xs font-bold ${
                      isCurrentSpeaker ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                    }`}>
                      {member.name[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${
                        isCurrentSpeaker ? 'text-white' : 'text-gray-900'
                      }`}>
                        {member.name}
                      </p>
                      <p className={`text-[10px] ${
                        isCurrentSpeaker ? 'text-red-100' : 'text-gray-500'
                      }`}>
                        {getPositionLabel(member.position)}
                      </p>
                    </div>

                    {isCurrentSpeaker && (
                      <MessageCircle size={12} className="animate-pulse flex-shrink-0" />
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* 操作按钮和提示信息 */}
      {(instruction || onAction) && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          {instruction && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 whitespace-pre-line leading-relaxed">{instruction}</p>
            </div>
          )}

          {debateState.is_active && onAction && (
            <div className="flex gap-2">
              <button
                onClick={() => onAction('next')}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <ChevronRight size={16} />
                下一位发言
              </button>

              <button
                onClick={() => onAction('end')}
                className="px-3 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                结束辩论
              </button>
            </div>
          )}
        </div>
      )}

      {/* 环节进度条 */}
      {debateState.is_active && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: debateState.total_rounds }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i < debateState.current_round_index
                    ? 'bg-green-500'
                    : i === debateState.current_round_index
                    ? 'bg-indigo-500 animate-pulse'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>开篇立论</span>
            <span>总结陈词</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DebateInfoBlock
