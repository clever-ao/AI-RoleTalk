import React, { useState, useRef, useEffect } from 'react'
import { User, Bot, Play, Pause, Volume2, ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react'
import type { Message } from '../types'
import { MODELS } from '../config'

interface MessageBubbleProps {
  message: Message
  autoPlay?: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, autoPlay = false }) => {
  const [copied, setCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTextExpanded, setIsTextExpanded] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const hasAutoPlayedRef = useRef(false)

  const isUser = message.role === 'user'

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

    setAudioError(null)

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
          .catch((err) => {
            console.error('播放失败:', err.name, err.message)
            setAudioError(`播放失败: ${err.message}`)
            setIsPlaying(false)
          })
      }
    }
  }

  // 音频事件回调
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onEnded = () => { setIsPlaying(false) }
    const onPause = () => { setIsPlaying(false) }
    const onPlay = () => { setIsPlaying(true) }

    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)

    return () => {
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
    }
  }, [message.voiceUrl])

  // 自动播放逻辑
  useEffect(() => {
    if (autoPlay && message.voiceUrl && !hasAutoPlayedRef.current && !isUser) {
      hasAutoPlayedRef.current = true
      const timer = setTimeout(() => {
        const audio = audioRef.current
        if (audio) {
          audio.src = message.voiceUrl!
          audio.load()
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch((err) => console.warn('自动播放失败:', err.message))
          }
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, message.voiceUrl, isUser])

  // 切换文本展开/折叠，并自动滚动调整位置
  const handleToggleText = () => {
    if (!isUser && message.voiceUrl) {
      const willExpand = !isTextExpanded
      setIsTextExpanded(willExpand)
      setTimeout(() => {
        const el = document.getElementById(`msg-${message.id}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, willExpand ? 50 : 350)
    }
  }

  return (
    <div id={`msg-${message.id}`} className={`py-3 ${isUser ? 'bg-transparent' : 'bg-slate-50/50'}`}>
      <div className="max-w-3xl mx-auto px-4 flex gap-3.5">
        {/* 头像 - 用户显示默认图标，AI根据角色ID显示对应头像 */}
        {isUser ? (
          <div className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <User size={20} />
          </div>
        ) : (
          (() => {
            const modelConfig = MODELS.find(m => m.id === message.model)
            const avatarUrl = modelConfig?.avatarUrl || `/model-data/pic/${message.model}.png`
            return (
              <img
                src={avatarUrl}
                alt={modelConfig?.name || message.model || 'AI'}
                className="shrink-0 w-11 h-11 rounded-full object-cover shadow-sm"
                onError={(e) => {
                  // 图片加载失败时回退到默认图标
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            )
          })()
        )}
        {/* AI头像加载失败时的回退图标 */}
        {!isUser && (
          <div className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-emerald-400 to-teal-500 text-white hidden fallback-avatar">
            <Bot size={20} />
          </div>
        )}

        {/* 消息内容 */}
        <div className="flex-1 min-w-0">
          {/* 角色名 - 将 model ID 转为中文名显示 */}
          <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
            {isUser ? '你' : (() => {
              // 根据 model ID 查找对应的中文名
              const modelConfig = MODELS.find(m => m.id === message.model)
              return modelConfig?.name || message.model || 'AI 助手'
            })()}
          </div>

          {/* 用户消息 */}
          {isUser ? (
            <div className="bg-blue-500 text-white rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm shadow-blue-200/50 inline-block max-w-[85%] leading-relaxed text-[15px]">
              {message.content}
            </div>
          ) : (
            /* AI 消息 */
            <div className="space-y-2">
              {/* 隐藏的音频元素 */}
              {message.voiceUrl && message.voiceUrl.length > 0 && (
                <audio
                  ref={audioRef}
                  src={message.voiceUrl}
                  preload="auto"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    const target = e.target as HTMLAudioElement
                    setAudioError(`音频加载失败: ${target.error?.message || '未知错误'}`)
                  }}
                  onCanPlay={() => setAudioError(null)}
                />
              )}

              {/* 语音播放器 / 语音生成中 / 加载动画 / 纯文本 */}
              {(message.voiceUrl && message.voiceUrl.length > 0) ? (
                /* 有语音URL：显示完整语音播放器（参照辩论模式） */
                <div className={`voice-player ${isPlaying ? 'playing' : ''}`} onClick={togglePlay}>
                  <div className="play-btn">
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
                  </div>
                  <div className="waveform">
                    {Array.from({ length: 12 }).map((_, i) => <div key={i} className="bar" />)}
                  </div>
                  <span className={`voice-hint flex items-center gap-1 ${audioError ? 'text-red-400' : ''}`}>
                    <Volume2 size={14} />
                    {audioError ? '播放出错' : isPlaying ? '播放中...' : '点击播放'}
                  </span>
                </div>
              ) : (message as any)._isGeneratingVoice ? (
                /* 语音生成中：显示文本内容 + 生成中提示 */
                <div className="space-y-2">
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm text-slate-700 leading-relaxed text-[15px]">
                    {message.content}
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <Loader2 size={14} className="animate-spin text-emerald-500" />
                    <span className="text-xs text-slate-400">正在生成语音...</span>
                  </div>
                </div>
              ) : (!message.content || message.content.length === 0) ? (
                /* 加载中状态 */
                <div className="ai-loading-container">
                  <div className="ai-loading-avatar">
                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                  </div>
                  <div className="ai-loading-content">
                    <div className="ai-loading-dots">
                      <span className="dot" />
                      <span className="dot" style={{ animationDelay: '0.15s' }} />
                      <span className="dot" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <span className="ai-loading-text">AI 正在思考</span>
                  </div>
                </div>
              ) : (
                /* 无语音纯文本 */
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm text-slate-700 leading-relaxed text-[15px]">
                  {message.content}
                </div>
              )}

              {/* 文本展开/折叠区域 */}
              {(message.voiceText || message.content) && message.voiceUrl && message.voiceUrl.length > 0 && (
                <>
                  <button onClick={handleToggleText} className="text-reveal-toggle">
                    {isTextExpanded ? <>收起文本 <ChevronUp size={14} /></> : <>点击展开文本内容 <ChevronDown size={14} /></>}
                  </button>
                  <div className={`text-reveal-area bg-white border border-slate-100 rounded-xl p-3 ${isTextExpanded ? '' : 'collapsed'}`}
                    style={{ 
                      maxHeight: isTextExpanded ? '500px' : undefined,
                      overflowY: isTextExpanded ? 'auto' : 'hidden'
                    }}>
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">文本内容</span>
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(message.voiceText || message.content) }}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                        {copied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
                      </button>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[15px] whitespace-pre-wrap">{message.voiceText || message.content}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
