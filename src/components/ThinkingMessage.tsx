import React from 'react'
import { Loader2 } from 'lucide-react'
import type { CurrentSpeakerInfo } from '../types/debate'

interface ThinkingMessageProps {
  speaker: CurrentSpeakerInfo
  message?: string  // 可选的自定义消息，默认为"正在思考..."
}

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({
  speaker,
  message = "正在思考并生成语音..."
}) => {
  // 根据阵营决定样式
  const isPro = speaker.side === '正方'

  return (
    <div className={`flex justify-${isPro ? 'start' : 'end'} mb-4 animate-fadeIn`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
          isPro
            ? 'bg-white border-2 border-blue-200 shadow-sm'
            : 'bg-white border-2 border-red-200 shadow-sm'
        }`}
      >
        {/* 头部：发言者信息 */}
        <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${
          isPro ? 'border-blue-100' : 'border-red-100'
        }`}>
          {/* 加载动画 */}
          <div className="relative">
            <Loader2
              size={18}
              className={`animate-spin ${isPro ? 'text-blue-500' : 'text-red-500'}`}
            />
            {/* 脉冲效果 */}
            <div
              className={`absolute inset-0 rounded-full ${
                isPro ? 'bg-blue-400' : 'bg-red-400'
              } opacity-20 animate-ping`}
              style={{ animationDuration: '2s' }}
            />
          </div>

          {/* 发言者信息 */}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${
              isPro ? 'text-blue-800' : 'text-red-800'
            }`}>
              {speaker.name}
            </p>
            <p className={`text-xs ${
              isPro ? 'text-blue-500' : 'text-red-500'
            }`}>
              {speaker.side} · {speaker.position}
            </p>
          </div>
        </div>

        {/* 思考内容区域 */}
        <div className="space-y-2">
          {/* 打字机效果的点 */}
          <div className="flex items-center gap-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isPro ? 'bg-blue-400' : 'bg-red-400'
              } animate-bounce`}
              style={{ animationDelay: '0ms' }}
            />
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isPro ? 'bg-blue-400' : 'bg-red-400'
              } animate-bounce`}
              style={{ animationDelay: '150ms' }}
            />
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isPro ? 'bg-blue-400' : 'bg-red-400'
              } animate-bounce`}
              style={{ animationDelay: '300ms' }}
            />
          </div>

          {/* 提示文字 */}
          <p className={`text-xs italic ${
            isPro ? 'text-blue-600/70' : 'text-red-600/70'
          }`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ThinkingMessage
