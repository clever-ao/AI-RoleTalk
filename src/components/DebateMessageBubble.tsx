import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { MODELS } from '../config'

interface DebateMessage {
  id: string
  role: 'pro' | 'con' | 'system' | 'user'
  content: string
  timestamp: number
  speaker?: {
    side: string  // 支持 'pro', 'con', '正方', '反方'
    position: string
    name: string
    character_id: string
  }
  voiceUrl?: string
  voiceText?: string
  type?: 'speech' | 'system' | 'round_transition' | 'debate_end'
}

interface DebateMessageBubbleProps {
  message: DebateMessage
  autoPlay?: boolean
}

const DebateMessageBubble: React.FC<DebateMessageBubbleProps> = ({ 
  message, 
  autoPlay = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTextExpanded, setIsTextExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // 判断消息位置：正方在左，反方在右，系统/用户居中
  // 支持英文（pro/con）和中文（正方/反方）两种格式
  const speakerSide = message.speaker?.side?.toLowerCase()
  const isPro = speakerSide === 'pro' || message.speaker?.side === '正方'
  const isCon = speakerSide === 'con' || message.speaker?.side === '反方'
  const isSystem = message.role === 'system' || message.type === 'system'

  // 复制文本
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 播放/暂停语音
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio || !message.voiceUrl) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      if (!audio.src || audio.src !== window.location.origin + message.voiceUrl) {
        audio.src = message.voiceUrl
      }
      audio.load()
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false))
      }
    }
  }

  // 音频事件回调
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onEnded = () => setIsPlaying(false)
    const onPause = () => setIsPlaying(false)
    const onPlay = () => setIsPlaying(true)

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)

    return () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
    }
  }, [message.voiceUrl])

  // 自动播放
  useEffect(() => {
    if (autoPlay && message.voiceUrl && !isSystem) {
      const timer = setTimeout(() => {
        const audio = audioRef.current
        if (audio) {
          audio.src = message.voiceUrl!
          audio.load()
          audio.play().catch(() => {})
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, message.voiceUrl, isSystem])

  // 系统消息样式（居中显示）
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className={`max-w-2xl w-full ${
          message.type === 'debate_end' 
            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-md'
            : message.type === 'round_transition'
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-xl p-4'
            : 'bg-gray-50 border border-gray-200 rounded-xl p-4'
        }`}>
          <p className="text-center text-gray-700 whitespace-pre-line leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // 获取模型头像URL
  const getAvatarUrl = (characterId: string) => {
    const model = MODELS.find(m => m.id === characterId)
    return model?.avatarUrl || `/model-data/pic/${characterId}.png`
  }

  // 正反方发言消息
  return (
    <div className={`flex ${isCon ? 'justify-end' : 'justify-start'} mb-6 max-w-[800px] mx-auto w-full`}>
      {/* 隐藏的音频元素 */}
      {message.voiceUrl && (
        <audio ref={audioRef} preload="none" />
      )}

      <div className={`flex gap-3 max-w-[70%] ${isCon ? 'flex-row-reverse' : ''}`}>
        {/* 头像 - 使用真实头像 */}
        <div className={`flex-shrink-0 w-11 h-11 rounded-full overflow-hidden shadow-md ${
          isPro
            ? 'ring-2 ring-blue-200'
            : 'ring-2 ring-red-200'
        }`}>
          <img
            src={getAvatarUrl(message.speaker?.character_id || '')}
            alt={message.speaker?.name || '?'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时显示首字母背景
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.className = `flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md ${
                  isPro
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                    : 'bg-gradient-to-br from-red-500 to-red-600'
                }`
                parent.innerHTML = message.speaker?.name[0] || '?'
              }
            }}
          />
        </div>

        {/* 消息内容 */}
        <div className={`flex flex-col ${isCon ? 'items-end' : ''}`}>
          {/* 发言者信息 */}
          <div className={`flex items-center gap-2 mb-1.5 ${isCon ? 'flex-row-reverse' : ''}`}>
            <span className={`font-semibold text-sm ${
              isPro ? 'text-blue-700' : 'text-red-700'
            }`}>
              {message.speaker?.name || '未知'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isPro 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {message.speaker?.position || ''}
            </span>
            <span className={`text-xs font-medium ${
              isPro ? 'text-blue-500' : 'text-red-500'
            }`}>
              {isPro ? '正方' : '反方'}
            </span>
          </div>

          {/* 消息气泡 */}
          <div className={`relative group ${
            isPro 
              ? 'bg-white border-2 border-blue-200 rounded-2xl rounded-tl-none shadow-sm hover:shadow-md transition-shadow' 
              : 'bg-white border-2 border-red-200 rounded-2xl rounded-tr-none shadow-sm hover:shadow-md transition-shadow'
          }`}>
            {/* 语音播放器或文本内容 */}
            {(message.voiceUrl && message.voiceUrl.length > 0) ? (
              <div
                className={`voice-player flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                  isPro
                    ? 'hover:bg-blue-50 bg-gradient-to-r from-blue-50/80 to-white'
                    : 'con-theme hover:bg-red-50 bg-gradient-to-l from-red-50/80 to-white'
                }`}
                onClick={togglePlay}
              >
                <div className={`play-btn w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                  isPro
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white transition-colors transform hover:scale-105`}>
                  {isPlaying
                    ? <Pause size={16} fill="currentColor" />
                    : <Play size={16} className="ml-0.5" fill="currentColor" />
                  }
                </div>

                {/* 波形动画 - 反方使用更深的红色系 */}
                <div className="waveform flex items-center gap-0.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`bar w-1 rounded-full transition-all duration-200 ${
                        isPlaying ? 'animate-wave' : ''
                      }`}
                      style={{
                        height: `${Math.random() * 20 + 8}px`,
                        backgroundColor: isPro ? '#3b82f6' : '#dc2626',  // 反方使用更深的红色
                        animationDelay: `${i * 0.05}s`,
                        boxShadow: isPlaying
                          ? (isPro ? '0 0 6px rgba(59,130,246,0.4)' : '0 0 6px rgba(220,38,38,0.4)')
                          : 'none'
                      }}
                    />
                  ))}
                </div>

                <span className={`text-sm font-medium flex items-center gap-1.5 ${
                  isPro ? 'text-blue-700' : 'text-red-700'
                }`}>
                  <Volume2 size={14} className={isPro ? 'text-blue-500' : 'text-red-500'} />
                  {isPlaying ? '播放中...' : '点击播放'}
                </span>
              </div>
            ) : (
              /* 纯文本内容 */
              <div className="px-4 py-3">
                <p className="text-gray-800 leading-relaxed text-[15px] whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            )}

            {/* 展开文本区域 */}
            {(message.voiceText || message.content) && message.voiceUrl && (
              <>
                <button 
                  onClick={() => setIsTextExpanded(!isTextExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-xs font-medium border-t transition-colors ${
                    isPro 
                      ? 'text-blue-600 hover:bg-blue-50 border-blue-100' 
                      : 'text-red-600 hover:bg-red-50 border-red-100'
                  }`}
                >
                  <span>{isTextExpanded ? '收起文本' : '展开完整文本'}</span>
                  {isTextExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <div 
                  className={`overflow-hidden transition-all duration-300 ${
                    isTextExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-0'
                  }`}
                >
                  <div className="px-4 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">发言全文</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(message.voiceText || message.content)
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500"
                      >
                        {copied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
                      </button>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {message.voiceText || message.content}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DebateMessageBubble
