import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react'
import { MODELS } from '../config'

interface PraiseMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: string                    // 角色ID（如 loxd, lzjp）
  voiceUrl?: string
  voiceText?: string
  _isGeneratingVoice?: boolean      // 标记：正在生成语音
}

interface PraiseMessageBubbleProps {
  message: PraiseMessage
  autoPlay?: boolean
}

const PraiseMessageBubble: React.FC<PraiseMessageBubbleProps> = ({ 
  message, 
  autoPlay = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isTextExpanded, setIsTextExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // 复制文本
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 获取完整的音频 URL（处理相对路径）
  const getAudioSrc = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    // 确保相对路径正确拼接
    return `${window.location.origin}${url.startsWith('/') ? url : '/' + url}`
  }

  // 播放/暂停语音
  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio || !message.voiceUrl) {
      console.warn('[PraiseMessageBubble] togglePlay: 无音频元素或 voiceUrl 为空', { hasAudio: !!audio, voiceUrl: message.voiceUrl })
      return
    }

    console.log('[PraiseMessageBubble] togglePlay:', { voiceUrl: message.voiceUrl, isPlaying })

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      const fullSrc = getAudioSrc(message.voiceUrl)
      if (!audio.src || audio.src !== fullSrc) {
        console.log('[PraiseMessageBubble] 设置音频 src:', fullSrc)
        audio.src = fullSrc
      }
      audio.load()
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[PraiseMessageBubble] ✅ 音频播放成功')
            setIsPlaying(true)
          })
          .catch((err) => {
            console.warn('[PraiseMessageBubble] ⚠️ 音频播放失败:', err)
            setIsPlaying(false)
          })
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

  // 自动播放（当消息数据更新后触发）
  useEffect(() => {
    if (autoPlay && message.voiceUrl && isAssistant && message.content) {
      console.log('[PraiseMessageBubble] 触发自动播放:', { 
        voiceUrl: message.voiceUrl, 
        hasContent: !!message.content,
        contentLength: message.content.length 
      })
      const timer = setTimeout(() => {
        const audio = audioRef.current
        if (audio) {
          const fullSrc = getAudioSrc(message.voiceUrl!)
          console.log('[PraiseMessageBubble] autoPlay 设置 src:', fullSrc)
          audio.src = fullSrc
          audio.load()
          audio.play().then(() => {
            console.log('[PraiseMessageBubble] ✅ autoPlay 播放成功')
            setIsPlaying(true)
          }).catch((err) => {
            console.warn('[PraiseMessageBubble] ⚠️ autoPlay 播放失败:', err)
          })
        } else {
          console.warn('[PraiseMessageBubble] autoPlay: audio 元素不存在')
        }
      }, 500)  // 增加延迟确保 DOM 完全渲染
      return () => clearTimeout(timer)
    }
  }, [autoPlay, message.voiceUrl, isAssistant, message.content])  // 添加 content 依赖

  // 获取模型头像URL
  const getAvatarUrl = (characterId: string) => {
    const model = MODELS.find(m => m.id === characterId)
    return model?.avatarUrl || `/model-data/pic/${characterId}.png`
  }

  // 获取角色中文名
  const getCharacterName = (characterId?: string) => {
    if (!characterId) return 'AI'
    const model = MODELS.find(m => m.id === characterId)
    return model?.name || characterId
  }

  // ========== 用户消息 ==========
  if (isUser) {
    return (
      <div className="flex justify-end mb-6 max-w-200 mx-auto w-full">
        <div className="flex gap-3 max-w-[70%] flex-row-reverse">
          {/* 用户头像 */}
          <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden shadow-md ring-2 ring-blue-200">
            <div className="w-full h-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base">
              你
            </div>
          </div>

          {/* 用户消息气泡 */}
          <div className="flex flex-col items-end">
            <div className="bg-blue-500 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-sm leading-relaxed text-[15px]">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== AI 消息（夸夸模式模型卡片） ==========
  // characterId 来自 message.model（由后端 selectedCharacter 字段设置，如 "loxd", "lzjp"）
  const characterId = (message.model && message.model !== '思考中...') ? message.model : ''
  const characterName = getCharacterName(characterId)

  // 调试日志：打印接收到的消息数据
  console.log('[PraiseMessageBubble] 渲染消息:', {
    id: message.id?.slice(0, 8),
    role: message.role,
    contentLength: message.content?.length || 0,
    contentPreview: message.content?.slice(0, 50),
    voiceUrl: message.voiceUrl,
    model: message.model,
    characterId,
    voiceTextLength: message.voiceText?.length || 0,
  })

  return (
    <div className="flex justify-start mb-6 max-w-200 mx-auto w-full">
      {/* 隐藏的音频元素 */}
      {message.voiceUrl && (
        <audio ref={audioRef} preload="none" />
      )}

      <div className="flex gap-3 max-w-[70%]">
        {/* 头像 - 使用真实头像图片 */}
        {characterId ? (
          <div className="shrink-0 w-11 h-11 rounded-full overflow-hidden shadow-md ring-2 ring-orange-200 bg-orange-50">
            <img
              src={getAvatarUrl(characterId)}
              alt={characterName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // 图片加载失败时显示首字母背景
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.className = `shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md bg-gradient-to-br from-orange-500 to-orange-600`
                  parent.innerHTML = characterName[0] || '?'
                }
              }}
            />
          </div>
        ) : (
          /* 思考中状态：显示 loading 头像 */
          <div className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center shadow-md ring-2 ring-orange-200 bg-orange-100">
            <Loader2 size={18} className="animate-spin text-orange-500" />
          </div>
        )}

        {/* 消息内容 */}
        <div className="flex flex-col">
          {/* 角色信息 */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold text-sm text-orange-700">
              {characterName}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
              夸夸模式
            </span>
          </div>

          {/* 消息气泡 */}
          <div className={`relative group ${
            message.voiceUrl && message.voiceUrl.length > 0
              ? 'bg-white border-2 border-orange-200 rounded-2xl rounded-tl-none shadow-sm hover:shadow-md transition-shadow'
              : 'bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm'
          }`}>
            {/* 状态1: 有语音URL - 显示完整语音播放器 + 文本预览（仿辩论模式） */}
            {(message.voiceUrl && message.voiceUrl.length > 0) ? (
              <>
                {/* 语音播放器 */}
                <div
                  className={`voice-player flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-orange-50 bg-linear-to-r from-orange-50/80 to-white`}
                  onClick={togglePlay}
                >
                  <div className="play-btn w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md bg-orange-500 hover:bg-orange-600 text-white transition-colors transform hover:scale-105">
                    {isPlaying
                      ? <Pause size={16} fill="currentColor" />
                      : <Play size={16} className="ml-0.5" fill="currentColor" />
                    }
                  </div>

                  {/* 波形动画 */}
                  <div className="waveform flex items-center gap-0.5">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className={`bar w-1 rounded-full transition-all duration-200 ${
                          isPlaying ? 'animate-wave' : ''
                        }`}
                        style={{
                          height: `${Math.random() * 20 + 8}px`,
                          backgroundColor: '#f97316',  // orange-500
                          animationDelay: `${i * 0.05}s`,
                          boxShadow: isPlaying
                            ? '0 0 6px rgba(249,115,22,0.4)'
                            : 'none'
                        }}
                      />
                    ))}
                  </div>

                  <span className="text-sm font-medium flex items-center gap-1.5 text-orange-700">
                    <Volume2 size={14} className="text-orange-500" />
                    {isPlaying ? '播放中...' : '点击播放'}
                  </span>
                </div>

                {/* 文本预览（直接显示在播放器下方，无需展开） */}
                <div className="px-4 pb-3 pt-1">
                  <p className="text-gray-700 leading-relaxed text-[14px] whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </>
            ) : message._isGeneratingVoice ? (
              /* 状态2: 语音生成中 - 显示文本 + 生成中提示 */
              <div className="space-y-0">
                <div className="px-4 py-3">
                  <p className="text-gray-800 leading-relaxed text-[15px] whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 pb-3">
                  <Loader2 size={14} className="animate-spin text-orange-500" />
                  <span className="text-xs text-slate-400">正在生成语音...</span>
                </div>
              </div>
            ) : (!message.content || message.content.length === 0) ? (
              /* 状态3: 加载中（API 思考中） */
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <Loader2 size={16} className="animate-spin text-orange-500" />
                  <span className="text-sm text-slate-400">AI 正在思考...</span>
                </div>
              </div>
            ) : (
              /* 状态4: 纯文本（无语音） */
              <div className="px-4 py-3">
                <p className="text-gray-800 leading-relaxed text-[15px] whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            )}

            {/* 复制按钮（有文本时显示） */}
            {(message.voiceText || message.content) && message.voiceUrl && message.voiceUrl.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-orange-100">
                <span className="text-xs text-gray-400"></span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(message.voiceText || message.content)
                  }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors cursor-pointer"
                >
                  {copied ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制文本</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PraiseMessageBubble
