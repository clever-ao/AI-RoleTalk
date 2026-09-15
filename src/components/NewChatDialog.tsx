import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Sparkles, Check } from 'lucide-react'
import type { ChatMode } from '../types'
import { MODELS, CHAT_MODES, DEFAULT_MODE } from '../config'

interface NewChatDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string, modelIds: string[], mode: ChatMode, topic?: string) => void
}

const NewChatDialog: React.FC<NewChatDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  const [title, setTitle] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectedMode, setSelectedMode] = useState<ChatMode>(DEFAULT_MODE)
  const [debateTopic, setDebateTopic] = useState('')  // 辩题
  const inputRef = useRef<HTMLInputElement>(null)
  // 每个模型一个 audio 实例，避免切换时冲突
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const currentPlayingRef = useRef<string | null>(null) // 当前正在播放的模型 ID

  // 默认标题
  const defaultTitle = `对话 ${new Date().toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`

  // 打开时初始化
  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle)
      setSelectedModels([]) // 初始不选任何模型
      setSelectedMode(DEFAULT_MODE)
      setDebateTopic('')  // 重置辩题
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isOpen])

  // 清理所有音频
  useEffect(() => {
    return () => {
      stopAllAudio()
    }
  }, [])

  // 停止所有正在播放的音频
  const stopAllAudio = useCallback(() => {
    audioMapRef.current.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    currentPlayingRef.current = null
  }, [])

  // 确认创建
  const handleConfirm = () => {
    if (selectedModels.length === 0) return
    
    // 辩论模式需要至少2个模型和辩题
    if (selectedMode === 'debate') {
      if (selectedModels.length < 2) {
        alert('辩论模式至少需要选择2个模型')
        return
      }
      if (!debateTopic.trim()) {
        alert('辩论模式请输入辩题')
        return
      }
    }
    
    stopAllAudio() // 关闭时停止所有音频
    onConfirm(title || defaultTitle, selectedModels, selectedMode, debateTopic.trim())
    onClose()
  }

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirm()
    }
  }

  // 停止当前播放的音频
  const stopCurrentAudio = useCallback(() => {
    const currentId = currentPlayingRef.current
    if (currentId) {
      const currentAudio = audioMapRef.current.get(currentId)
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
      currentPlayingRef.current = null
    }
  }, [])

  // 播放指定模型的语音（互斥：先停旧的，再播新的）
  const playModelAudio = useCallback((modelId: string) => {
    const model = MODELS.find(m => m.id === modelId)
    if (!model?.audioUrl) return

    try {
      // 1. 先停止当前正在播放的音频
      stopCurrentAudio()

      // 2. 获取或创建该模型的 audio 实例
      let audio = audioMapRef.current.get(modelId)
      if (!audio) {
        audio = new Audio(model.audioUrl)
        audioMapRef.current.set(modelId, audio)
      }

      // 3. 标记为当前播放，开始播放
      currentPlayingRef.current = modelId
      audio.currentTime = 0
      audio.play().catch(() => {
        currentPlayingRef.current = null
      })

      // 4. 播放结束自动清理标记
      const onEnded = () => { currentPlayingRef.current = null }
      audio.addEventListener('ended', onEnded, { once: true })
    } catch {
      currentPlayingRef.current = null
    }
  }, [stopCurrentAudio])

  // 模型点击：切换选中状态 + 播放对应语音（严格互斥）
  const handleModelClick = useCallback((modelId: string) => {
    // 先立即停止当前正在播放的所有音频（保证最多只有1个声音）
    stopAllAudio()

    // 切换选中
    setSelectedModels((prev) => {
      const wasSelected = prev.includes(modelId)
      const nextList = wasSelected
        ? prev.filter((id) => id !== modelId)   // 取消选中
        : [...prev, modelId]                   // 新增选中

      // 只有新增选中时才播放语音
      if (!wasSelected && nextList.length > 0) {
        // 新增选中 → 立即播放该模型语音（旧的已被 stopAllAudio 清理）
        // 用 requestAnimationFrame 确保 DOM 更新后再播放，避免浏览器节流
        requestAnimationFrame(() => {
          playModelAudio(modelId)
        })
      }
      // 取消选中或列表为空 → 不播放任何音频（已通过 stopAllAudio 静音）

      return nextList
    })
  }, [playModelAudio, stopAllAudio])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* 弹窗主体 */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] overflow-y-auto animate-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200/50">
              <Sparkles size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">新建对话</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 第一栏：聊天名称 */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">对话名称</label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-[15px] outline-none transition-all focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/5 placeholder:text-slate-300"
            />
          </div>

          {/* 第二栏：模型多选 - 上4下4 */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              选择模型 <span className="text-slate-400 font-normal">（可多选，点击头像播放声音）</span>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {MODELS.map((model) => {
                const isSelected = selectedModels.includes(model.id)
                // 计算在已选列表中的序号（用于显示选中顺序）
                const selectedOrder = selectedModels.indexOf(model.id) + 1
                return (
                  <button
                    key={model.id}
                    onClick={() => handleModelClick(model.id)}
                    className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-400 bg-blue-50/60 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {/* 模型头像 - 真实图片 + 点击播放声音 */}
                    <div className="relative">
                      {/* 选中时显示顺序编号角标 */}
                      {isSelected && (
                        <span
                          className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm z-10"
                          style={{ backgroundColor: model.color }}
                        >
                          {selectedOrder}
                        </span>
                      )}
                      {/* 头像：优先使用真实图片，降级用 emoji */}
                      {model.avatarUrl ? (
                        <img
                          src={model.avatarUrl}
                          alt={model.name}
                          className={`w-11 h-11 rounded-full object-cover transition-transform group-hover:scale-110 group-active:scale-95 ${
                            isSelected ? 'shadow-md ring-2 ring-blue-200' : ''
                          }`}
                          title={`${model.name} - ${model.description}\n点击播放声音`}
                        />
                      ) : (
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-xl transition-transform group-hover:scale-110 group-active:scale-95 ${
                            isSelected ? 'shadow-md ring-2 ring-blue-200' : ''
                          }`}
                          style={{ backgroundColor: `${model.color}12` }}
                          title={`${model.name} - ${model.description}\n点击播放声音`}
                        >
                          {model.icon}
                        </div>
                      )}
                    </div>

                    {/* 模型名称 */}
                    <span className={`text-xs font-medium truncate w-full text-center leading-tight ${
                      isSelected ? 'text-blue-600' : 'text-slate-600'
                    }`}>
                      {model.name}
                    </span>

                    {/* 选中标记（多选用 ✓） */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {/* 已选数量提示 */}
            <p className="mt-1.5 text-xs text-slate-400">
              已选择 {selectedModels.length} 个模型：{selectedModels.map(id => MODELS.find(m => m.id === id)?.name).join('、')}
            </p>
          </div>

          {/* 第三栏：模式选择 */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">对话模式</label>
            <div className="grid grid-cols-4 gap-2.5">
              {CHAT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedMode === mode.id
                      ? 'border-current shadow-sm'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                  style={{
                    borderColor: selectedMode === mode.id ? mode.color : undefined,
                    backgroundColor: selectedMode === mode.id ? `${mode.color}08` : undefined,
                  }}
                >
                  <span className="text-2xl">{mode.icon}</span>
                  <span className={`text-xs font-medium text-center leading-tight ${
                    selectedMode === mode.id ? '' : 'text-slate-600'
                  }`}
                  style={{ color: selectedMode === mode.id ? mode.color : undefined }}
                  >
                    {mode.name}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400 text-center">
              {CHAT_MODES.find(m => m.id === selectedMode)?.description}
            </p>
          </div>

          {/* 第四栏：辩题（仅辩论模式显示） */}
          {selectedMode === 'debate' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                辩题 <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-1">（正反方将随机分配）</span>
              </label>
              <input
                type="text"
                value={debateTopic}
                onChange={(e) => setDebateTopic(e.target.value)}
                placeholder="例如：人工智能是否会取代人类"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-[15px] outline-none transition-all focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-300"
              />
              {selectedModels.length > 0 && (
                <p className="mt-1.5 text-xs text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                  📢 将从已选的 {selectedModels.length} 个角色中随机分配到正反方（各 {Math.ceil(selectedModels.length / 2)} vs {Math.floor(selectedModels.length / 2)} 人）
                </p>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedModels.length === 0}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
              selectedModels.length > 0
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200/50'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            开始对话 ({selectedModels.length})
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dialog-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in { animation: dialog-in 0.2s ease-out; }
      `}</style>
    </div>
  )
}

export default NewChatDialog
