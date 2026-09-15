import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Send, Square, ArrowUp, Mic } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop: () => void
  isLoading: boolean
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isLoading,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  // 自动调整高度
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
    }
  }

  // 是否可以发送
  const canSubmit = value.trim().length > 0 && !isComposing && !isLoading

  // 发送消息
  const handleSubmit = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || disabled || isLoading || isComposing) return

    const message = value.trim()
    if (!message) return

    onSend(message)
    setValue('')
    if (textarea) {
      textarea.style.height = 'auto'
    }
  }, [value, disabled, isLoading, isComposing, onSend])

  // 输入变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    adjustHeight()
  }

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // IME 输入法开始/结束
  const handleCompositionStart = () => setIsComposing(true)
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false)
    handleChange(e as unknown as React.ChangeEvent<HTMLTextAreaElement>)
  }

  // 聚焦状态
  useEffect(() => {
    textareaRef.current?.focus()
  }, [disabled])

  return (
    <div className="border-t border-slate-200/80 bg-white px-4 pt-2 pb-3">
      <div className="max-w-3xl mx-auto">
        {/* 主输入区域 */}
        <div
          className={`relative flex items-end rounded-3xl border transition-all duration-200 ${
            isFocused
              ? 'border-blue-300 bg-white shadow-lg shadow-blue-100/50 ring-4 ring-blue-500/5'
              : 'border-slate-200 bg-slate-50 shadow-sm hover:border-slate-300'
          } ${isLoading ? 'border-orange-200 bg-orange-50/30' : ''}`}
        >
          <div className="flex-1 flex items-end gap-1 px-4 py-3">
            <textarea
              ref={textareaRef}
              value={value}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="输入消息..."
              disabled={disabled || isLoading}
              rows={1}
              className="flex-1 bg-transparent text-slate-700 placeholder-slate-300 resize-none outline-none max-h-40 text-[15px] leading-relaxed min-h-6 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fieldSizing: 'content' }}
            />
          </div>

          {/* 右侧按钮区 */}
          <div className="flex items-center gap-1.5 pb-2.5 pr-2.5">
            {isLoading ? (
              <button
                onClick={onStop}
                className="p-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white transition-all cursor-pointer shadow-sm shadow-orange-200/60 active:scale-95"
                title="停止生成"
              >
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                  canSubmit
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200/60'
                    : 'bg-slate-200 text-slate-400 cursor-default'
                }`}
                title="发送消息 (Enter)"
              >
                <ArrowUp size={17} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* 底部提示栏 */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-2 text-xs text-slate-350">
            <span className="inline-flex items-center gap-0.5 text-slate-400">
              <kbd className="hidden sm:inline-flex items-center justify-center h-4.5 px-1.5 rounded bg-slate-100 text-[10px] font-medium text-slate-400 border border-slate-200">Enter</kbd>
              <span className="text-slate-300 hidden sm:inline">发送</span>
            </span>
            <span className="inline-flex items-center gap-0.5 text-slate-400">
              <kbd className="hidden sm:inline-flex items-center justify-center h-4.5 px-1.5 rounded bg-slate-100 text-[10px] font-medium text-slate-400 border border-slate-200">Shift+Enter</kbd>
              <span className="text-slate-300 hidden sm:inline">换行</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-light">
            点击展开按钮可查看文本内容 · AI 可能出错请核实
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
