import React, { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar, { CollapsedSidebar } from './components/Sidebar'
import MessageBubble from './components/MessageBubble'
import DebateMessageBubble from './components/DebateMessageBubble'
import PraiseMessageBubble from './components/PraiseMessageBubble'
import RoastMessageBubble from './components/RoastMessageBubble'
import ThinkingMessage from './components/ThinkingMessage'
import DebateInfoBlock from './components/DebateInfoBlock'
import ModelSelector from './components/ModelSelector'
import ChatInput from './components/ChatInput'
import WelcomeScreen from './components/WelcomeScreen'
import NewChatDialog from './components/NewChatDialog'
import ChatInfoPanel from './components/ChatInfoPanel'
import { Settings2 } from 'lucide-react'
import type { Message, Conversation, ChatMode } from './types'
import type { DebateState, CurrentSpeakerInfo } from './types/debate'
import { DEFAULT_MODEL, MODELS } from './config'

const generateId = () => Math.random().toString(36).substring(2, 15)

// 使用共享的辩论类型（从 types/debate.ts 导入）

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)
  
  // 辩论模式状态
  const [debateState, setDebateState] = useState<DebateState | null>(null)
  const [currentSpeaker, setCurrentSpeaker] = useState<CurrentSpeakerInfo | null>(null)
  const [debateInstruction, setDebateInstruction] = useState('')
  const [debateTopic, setDebateTopic] = useState('')
  const [isDebateMode, setIsDebateMode] = useState(false)
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)  // 是否正在生成语音
  const [pendingSpeaker, setPendingSpeaker] = useState<CurrentSpeakerInfo | null>(null)  // 即将发言的人（用于显示思考卡片）

  const currentConversation = conversations.find((c) => c.id === currentConversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation?.messages])

  // 打开新建对话弹窗
  const handleNewChat = useCallback(() => {
    setIsNewChatOpen(true)
  }, [])
  
  // ============ 辩论模式相关函数（提前定义，供其他函数使用）============
  
  // 创建辩论
  const handleCreateDebate = useCallback(async (topic: string, characterIds: string[]) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/debate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          characters: characterIds,
        }),
      })
      
      if (!response.ok) {
        throw new Error('创建辩论失败')
      }
      
      const result = await response.json()

      setDebateState(result.debate_state as any)
      setCurrentSpeaker(result.current_speaker || null)
      // 设置初始提示信息
      setDebateInstruction('✅ 辩论已创建完成！\n\n请点击「开始答辩」按钮开始第一轮发言。')
      setDebateTopic(topic)
      setIsDebateMode(true)

      return result
    } catch (error) {
      console.error('创建辩论失败:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // 下一位发言
  const handleNextSpeech = useCallback(async () => {
    if (!debateState?.debate_id) return

    // 防止重复提交：如果正在生成语音，直接返回
    if (isGeneratingVoice || debateState.is_generating_voice) {
      console.log('[Debate] 正在生成语音，请稍候...')
      return
    }

    try {
      // 标记开始生成语音
      setIsGeneratingVoice(true)
      setDebateInstruction('⏳ 正在思考并生成语音，请稍候...')

      // 立即预测下一个发言者并显示思考卡片
      // 使用与后端相同的 order 数组逻辑
      if (debateState.pro_team && debateState.con_team && debateState.current_round) {
        const currentRound = debateState.current_round as any
        const order: string[] = currentRound.order || []
        const nextIndex = (debateState.current_speaker_index || 0)

        if (nextIndex < order.length) {
          const speakerKey = order[nextIndex]

          // 解析发言者标识（与后端 get_current_speaker 逻辑一致）
          let predictedSpeaker: CurrentSpeakerInfo | null = null

          if (speakerKey.startsWith('pro_')) {
            const position = parseInt(speakerKey.split('_')[1])
            const member = debateState.pro_team.members.find((m: any) => m.position === position)
            if (member) {
              predictedSpeaker = {
                side: '正方',
                position: `${position}辩`,
                name: member.name,
                character_id: member.id
              }
            }
          } else if (speakerKey.startsWith('con_')) {
            const position = parseInt(speakerKey.split('_')[1])
            const member = debateState.con_team.members.find((m: any) => m.position === position)
            if (member) {
              predictedSpeaker = {
                side: '反方',
                position: `${position}辩`,
                name: member.name,
                character_id: member.id
              }
            }
          }

          if (predictedSpeaker) {
            setPendingSpeaker(predictedSpeaker)
            // 立即滚动到底部，让用户看到思考卡片
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)  // 稍微延迟确保 DOM 更新
          }
        }
      }

      const response = await fetch('/api/debate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debate_id: debateState.debate_id,
          action: 'next_speech',
        }),
      })

      if (!response.ok) {
        throw new Error('获取发言失败')
      }

      const result = await response.json()

      // 输出响应信息到控制台（用于调试和查看提示词）
      console.log('\n%c[Debate Response]', 'color: #3b82f6; font-weight: bold; font-size: 14px;')
      console.log('%c发言者:', 'color: #6366f1; font-weight: bold;', result.current_speaker)
      console.log('%c消息类型:', 'color: #6366f1; font-weight: bold;', result.type)
      console.log('%c辩论状态:', 'color: #6366f1; font-weight: bold;', result.debate_state)

      // 显示给模型的提示词（重点！）
      if (result.prompt) {
        console.log('\n%c📝 给模型发送的提示词 (Prompt):', 'color: #059669; font-weight: bold; font-size: 13px; background: #ecfdf5; padding: 4px 8px; border-radius: 4px;')
        console.log('%c' + result.prompt, 'color: #047857; line-height: 1.6; white-space: pre-wrap;')
        console.log('-'.repeat(80))
      }

      if (result.message) {
        console.log('%c发言内容预览:', 'color: #059669; font-weight: bold;', result.message.content?.substring(0, 200) + '...')
      }
      console.log('%c完整响应对象:', 'color: #94a3b8;', result)
      console.log('='.repeat(80) + '\n')

      // 检查是否返回"正在生成"状态
      if (result.type === 'generating' || result.error === 'is_generating') {
        // 后端正在生成语音，更新状态
        setDebateState(result.debate_state as any)
        setDebateInstruction(result.instruction || '⏳ 正在生成语音，请稍候...')
        // 不重置 isGeneratingVoice，等待下次调用
        return result
      }

      // 正常响应
      setDebateState(result.debate_state as any)
      setCurrentSpeaker(result.current_speaker || null)
      setDebateInstruction(result.instruction || '')
      setPendingSpeaker(null)  // 清除预测的发言者（已获取真实数据）

      if (result.message && result.message.content && currentConversationId) {
        // 使用 current_speaker（下划线格式，与后端返回一致）
        const speakerInfo = result.current_speaker
        const newMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: result.message.content,
          timestamp: Date.now(),
          model: speakerInfo?.name || '',
          voiceUrl: result.message.voiceUrl || '',
          voiceText: result.message.voiceText || '',
          speaker: speakerInfo,
          type: result.type,
        }

        setConversations(prev =>
          prev.map(c =>
            c.id === currentConversationId
              ? { ...c, messages: [...c.messages, newMessage], updatedAt: Date.now() }
              : c
          )
        )
      }

      return result
    } catch (error) {
      console.error('获取发言失败:', error)
      setDebateInstruction('❌ 发言获取失败，请重试')
      throw error
    } finally {
      // 重置语音生成状态
      setIsGeneratingVoice(false)
    }
  }, [debateState, currentConversationId, isGeneratingVoice])
  
  // 结束辩论
  const handleEndDebate = useCallback(async () => {
    if (!debateState?.debate_id) return
    
    try {
      const response = await fetch('/api/debate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debate_id: debateState.debate_id,
          action: 'end_debate',
        }),
      })
      
      const result = await response.json()
      
      if (result.debate_state) {
        setDebateState(result.debate_state as any)
      }
      setDebateInstruction('辩论已结束')
      
      if (currentConversationId && result.message) {
        const endMessage: Message = {
          id: generateId(),
          role: 'system',
          content: result.message.content,
          timestamp: Date.now(),
          type: 'debate_end',
        }
        
        setConversations(prev =>
          prev.map(c =>
            c.id === currentConversationId
              ? { ...c, messages: [...c.messages, endMessage], updatedAt: Date.now() }
              : c
          )
        )
      }
    } catch (error) {
      console.error('结束辩论失败:', error)
    }
  }, [debateState, currentConversationId])
  
  // 辩论操作处理
  const handleDebateAction = useCallback((action: 'next' | 'end') => {
    if (action === 'next') {
      handleNextSpeech()
    } else if (action === 'end') {
      handleEndDebate()
    }
  }, [handleNextSpeech, handleEndDebate])

  // 确认新建对话（支持多模型 + 模式）
  const handleConfirmNewChat = useCallback(async (title: string, modelIds: string[], mode: ChatMode, topic?: string) => {
    const newConversation: Conversation = {
      id: generateId(),
      title,
      messages: [],
      model: modelIds[0],
      models: modelIds,
      mode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations((prev) => [newConversation, ...prev])
    setCurrentConversationId(newConversation.id)
    setSelectedModel(modelIds[0])
    
    // 如果是辩论模式，自动创建辩论
    if (mode === 'debate' && topic && modelIds.length >= 2) {
      try {
        await handleCreateDebate(topic, modelIds)
      } catch (error) {
        console.error('创建辩论失败:', error)
      }
    } else {
      // 非辩论模式，重置辩论状态
      setIsDebateMode(false)
      setDebateState(null)
    }
  }, [handleCreateDebate])

  // 选择对话
  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id)
    const conv = conversations.find((c) => c.id === id)
    if (conv) setSelectedModel(conv.model)
  }, [conversations])

  // 删除对话
  const handleDeleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (currentConversationId === id) setCurrentConversationId(null)
  }, [currentConversationId])

  // ============ 夸夸模式专用发送消息函数 ============
  // 夸夸模式的特殊逻辑：随机选模型、携带历史上下文、递进式夸奖
  //
  // 【流程】调用 /api/praise/chat → 后端内部：调大模型API获取文本 + 生成语音 → 一次性返回完整数据 → 前端渲染
  const handlePraiseSendMessage = useCallback(async (content: string) => {
    let convId = currentConversationId

    if (!convId) {
      const newConv: Conversation = {
        id: generateId(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        messages: [],
        model: selectedModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setConversations((prev) => [newConv, ...prev])
      convId = newConv.id
      setCurrentConversationId(convId)
    }

    const currentConv = conversations.find((c) => c.id === convId)
    // 夸夸模式使用 models 列表作为可选模型池
    const selectedModels = currentConv?.models || [currentConv?.model || selectedModel]

    const userMessage: Message = {
      id: generateId(), role: 'user', content, timestamp: Date.now(),
    }

    // 先用占位符创建 AI 消息（显示"思考中"加载状态）
    // _praise 标记用于渲染时将此消息路由到 PraiseMessageBubble 组件
    const aiMessage: Message = {
      id: generateId(), role: 'assistant', content: '', timestamp: Date.now(),
      model: '思考中...', voiceUrl: '', voiceText: '',
      _praise: true,
    }

    // 立即渲染用户消息 + AI 思考中占位
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMessage, aiMessage], updatedAt: Date.now() }
          : c
      )
    )

    setIsLoading(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // 构建历史消息（用于递进式夸奖上下文），不包含刚添加的空 aiMessage
      const existingMessages = [...(currentConv?.messages || []), userMessage]
      const historyMessages = existingMessages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
        .map(m => ({
          role: m.role,
          content: m.content,
          character_name: m.model || '',
        }))
      const historyForApi = historyMessages.slice(0, -1)

      console.log('[Praise] 发送夸夸请求:', { content, selectedModels, historyCount: historyForApi.length })

      // ====== 调用后端 API（后端内部完成：大模型文本 + 语音生成，一次性返回） ======
      const result = await praiseChatWithVoice(content, selectedModels, historyForApi)

      if (controller.signal.aborted) return

      const selectedCharacterId = result.selectedCharacter || ''
      const praiseContent = result.content || ''
      const voiceUrlFromBackend = result.voiceUrl || ''

      if (!praiseContent || !selectedCharacterId) {
        // API 返回无效内容，直接显示错误
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.map((m) => m.id === aiMessage.id ? { ...m, content: '未获得有效回复，请重试', _isGeneratingVoice: false } : m), updatedAt: Date.now() }
              : c
          )
        )
        setIsLoading(false)
        abortControllerRef.current = null
        return
      }

      console.log('[Praise] 后端返回完整数据:', { 
        characterId: selectedCharacterId, 
        contentLength: praiseContent.length, 
        hasVoice: !!voiceUrlFromBackend,
        voiceUrl: voiceUrlFromBackend 
      })

      // ====== 一次性渲染完整消息（文本 + 语音 + 角色信息） ======
      const updatedMessage = {
        content: praiseContent,
        voiceText: praiseContent,
        model: selectedCharacterId,
        voiceUrl: voiceUrlFromBackend,     // 后端已生成好的语音URL
        _isGeneratingVoice: false,
      }

      console.log('[Praise] 准备更新消息:', {
        messageId: aiMessage.id?.slice(0, 8),
        updatedMessage,
      })

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMessage.id
                    ? { ...m, ...updatedMessage }
                    : m
                ),
                updatedAt: Date.now(),
              }
            : c
        )
        
        // 验证更新是否成功
        const targetConv = updated.find(c => c.id === convId)
        const targetMsg = targetConv?.messages.find(m => m.id === aiMessage.id)
        console.log('[Praise] ✅ 消息已更新（渲染到前端）:', {
          contentLength: targetMsg?.content?.length || 0,
          hasVoiceUrl: !!targetMsg?.voiceUrl,
          voiceUrl: targetMsg?.voiceUrl,
          model: targetMsg?.model,
          contentPreview: targetMsg?.content?.slice(0, 50),
        })
        
        return updated
      })
      setIsLoading(false)
      abortControllerRef.current = null

    } catch (error) {
      console.error('夸夸模式请求失败:', error)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => m.id === aiMessage.id ? { ...m, content: `请求失败: ${error instanceof Error ? error.message : '未知错误'}`, _isGeneratingVoice: false } : m) }
            : c
        )
      )
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [currentConversationId, selectedModel, conversations])

  // ============ 骂骂模式专用发送消息函数 ============
  // 骂骂模式的特殊逻辑：随机选模型、携带历史上下文、递进式吐槽
  //
  // 【流程】调用 /api/roast/chat → 后端内部：调大模型API获取文本 + 生成语音 → 一次性返回完整数据 → 前端渲染
  const handleRoastSendMessage = useCallback(async (content: string) => {
    let convId = currentConversationId

    if (!convId) {
      const newConv: Conversation = {
        id: generateId(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        messages: [],
        model: selectedModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setConversations((prev) => [newConv, ...prev])
      convId = newConv.id
      setCurrentConversationId(convId)
    }

    const currentConv = conversations.find((c) => c.id === convId)
    // 骂骂模式使用 models 列表作为可选模型池
    const selectedModels = currentConv?.models || [currentConv?.model || selectedModel]

    const userMessage: Message = {
      id: generateId(), role: 'user', content, timestamp: Date.now(),
    }

    // 先用占位符创建 AI 消息（显示"思考中"加载状态）
    // _roast 标记用于渲染时将此消息路由到 RoastMessageBubble 组件
    const aiMessage: Message = {
      id: generateId(), role: 'assistant', content: '', timestamp: Date.now(),
      model: '思考中...', voiceUrl: '', voiceText: '',
      _roast: true,
    }

    // 立即渲染用户消息 + AI 思考中占位
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMessage, aiMessage], updatedAt: Date.now() }
          : c
      )
    )

    setIsLoading(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // 构建历史消息（用于递进式吐槽上下文），不包含刚添加的空 aiMessage
      const existingMessages = [...(currentConv?.messages || []), userMessage]
      const historyMessages = existingMessages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
        .map(m => ({
          role: m.role,
          content: m.content,
          character_name: m.model || '',
        }))
      const historyForApi = historyMessages.slice(0, -1)

      console.log('[Roast] 发送骂骂请求:', { content, selectedModels, historyCount: historyForApi.length })

      // ====== 调用后端 API（后端内部完成：大模型文本 + 语音生成，一次性返回） ======
      const result = await roastChatWithVoice(content, selectedModels, historyForApi)

      if (controller.signal.aborted) return

      const selectedCharacterId = result.selectedCharacter || ''
      const roastContent = result.content || ''
      const voiceUrlFromBackend = result.voiceUrl || ''

      if (!roastContent || !selectedCharacterId) {
        // API 返回无效内容，直接显示错误
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, messages: c.messages.map((m) => m.id === aiMessage.id ? { ...m, content: '未获得有效回复，请重试', _isGeneratingVoice: false } : m), updatedAt: Date.now() }
              : c
          )
        )
        setIsLoading(false)
        abortControllerRef.current = null
        return
      }

      console.log('[Roast] 后端返回完整数据:', { 
        characterId: selectedCharacterId, 
        contentLength: roastContent.length, 
        hasVoice: !!voiceUrlFromBackend,
        voiceUrl: voiceUrlFromBackend 
      })

      // ====== 一次性渲染完整消息（文本 + 语音 + 角色信息） ======
      const updatedMessage = {
        content: roastContent,
        voiceText: roastContent,
        model: selectedCharacterId,
        voiceUrl: voiceUrlFromBackend,     // 后端已生成好的语音URL
        _isGeneratingVoice: false,
      }

      console.log('[Roast] 准备更新消息:', {
        messageId: aiMessage.id?.slice(0, 8),
        updatedMessage,
      })

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMessage.id
                    ? { ...m, ...updatedMessage }
                    : m
                ),
                updatedAt: Date.now(),
              }
            : c
        )
        
        // 验证更新是否成功
        const targetConv = updated.find(c => c.id === convId)
        const targetMsg = targetConv?.messages.find(m => m.id === aiMessage.id)
        console.log('[Roast] ✅ 消息已更新（渲染到前端）:', {
          contentLength: targetMsg?.content?.length || 0,
          hasVoiceUrl: !!targetMsg?.voiceUrl,
          voiceUrl: targetMsg?.voiceUrl,
          model: targetMsg?.model,
          contentPreview: targetMsg?.content?.slice(0, 50),
        })
        
        return updated
      })
      setIsLoading(false)
      abortControllerRef.current = null

    } catch (error) {
      console.error('骂骂模式请求失败:', error)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => m.id === aiMessage.id ? { ...m, content: `请求失败: ${error instanceof Error ? error.message : '未知错误'}`, _isGeneratingVoice: false } : m) }
            : c
        )
      )
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [currentConversationId, selectedModel, conversations])

  // 发送消息（普通模式：传递 character_id 和 mode 给后端）
  const handleSendMessage = useCallback(async (content: string) => {
    let convId = currentConversationId

    if (!convId) {
      const newConv: Conversation = {
        id: generateId(),
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        messages: [],
        model: selectedModel,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setConversations((prev) => [newConv, ...prev])
      convId = newConv.id
      setCurrentConversationId(convId)
    }

    const currentConv = conversations.find((c) => c.id === convId)
    // 获取当前对话的角色ID和模式（优先从 conversation 中取，否则用 selectedModel 作为 character_id）
    const characterId = currentConv?.model || selectedModel
    const mode = currentConv?.mode || 'debate'
    // 获取角色中文名（用于消息气泡显示）
    const characterName = MODELS.find(m => m.id === characterId)?.name || characterId

    const userMessage: Message = {
      id: generateId(), role: 'user', content, timestamp: Date.now(),
    }

    const aiMessage: Message = {
      id: generateId(), role: 'assistant', content: '', timestamp: Date.now(),
      model: characterName, voiceUrl: '', voiceText: '',
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, userMessage, aiMessage], updatedAt: Date.now() }
          : c
      )
    )

    setIsLoading(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const allMessages = [...(currentConv?.messages || []), userMessage]
      // 传递 character_id 和 mode，model 使用统一 API 模型名
      const result = await streamChatWithVoice('deepseek-chat', allMessages, characterId, mode)

      if (controller.signal.aborted) return

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => m.id === aiMessage.id ? { ...m, content: result.content || m.content, voiceUrl: result.voiceUrl || '', voiceText: result.voiceText || '' } : m) }
            : c
        )
      )
    } catch (error) {
      console.error('请求失败:', error)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => m.id === aiMessage.id ? { ...m, content: `请求失败: ${error instanceof Error ? error.message : '未知错误'}` } : m) }
            : c
        )
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [currentConversationId, selectedModel, conversations])

  // 停止生成
  const handleStop = useCallback(() => { abortControllerRef.current?.abort(); setIsLoading(false) }, [])

  // 处理发送消息（根据模式选择不同的处理逻辑）
  const handleSend = useCallback(async (content: string) => {
    // 如果是辩论模式且辩论状态存在，使用辩论逻辑
    if (isDebateMode && debateState && debateState.is_active) {
      try {
        await handleNextSpeech()
      } catch (error) {
        console.error('获取发言失败:', error)
      }
    } else if (currentConversation?.mode === 'praise') {
      // 夸夸模式：走专用的夸夸接口（随机选模型 + 递进式夸奖）
      await handlePraiseSendMessage(content)
    } else if (currentConversation?.mode === 'roast') {
      // 骂骂模式：走专用的骂骂接口（随机选模型 + 递进式吐槽）
      await handleRoastSendMessage(content)
    } else {
      // 其他模式：使用普通聊天逻辑
      await handleSendMessage(content)
    }
  }, [isDebateMode, debateState, handleNextSpeech, handleSendMessage, handlePraiseSendMessage, currentConversation?.mode])

  const handleSuggestionClick = (text: string) => handleSend(text)

  return (
    <div className="h-screen flex bg-[#f5f7fa] text-slate-800">
      {/* 左侧边栏 */}
      {isSidebarCollapsed ? (
        <CollapsedSidebar onToggleCollapse={() => setIsSidebarCollapsed(false)} />
      ) : (
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* 主区域 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white/70 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
          </div>
          <div className="flex items-center gap-2">
            {/* 对话设置按钮 - 切换右侧栏 */}
            <button
              onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isRightPanelCollapsed
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
              title={isRightPanelCollapsed ? '展开对话配置' : '收起对话配置'}
            >
              <Settings2 size={14} />
              {currentConversation ? (
                <span>配置 ({(currentConversation.models || [currentConversation.model]).length})</span>
              ) : (
                <span>对话设置</span>
              )}
            </button>
          </div>
        </header>

        {/* 消息区域或欢迎页 */}
        {/* 辩论模式下不显示欢迎页面，即使没有消息 */}
        {(!currentConversation || currentConversation.messages.length === 0) && !isDebateMode ? (
<WelcomeScreen onSuggestionClick={handleSuggestionClick} />
) : (
<div className="flex-1 overflow-y-auto">
{/* 辩论模式：只在有系统消息时显示完整信息块（如环节切换提示） */}
{isDebateMode && debateState && debateInstruction && debateInstruction.includes('📢') && (
  <div className="mx-auto max-w-3xl mt-4 px-4">
<DebateInfoBlock
  debateState={debateState}
  currentSpeaker={currentSpeaker}
  instruction={debateInstruction}
  onAction={handleDebateAction}
  compact={false}
  isGeneratingVoice={isGeneratingVoice}
/>
  </div>
)}

{/* 辩论模式下，第一个消息增加顶部间距 */}
{isDebateMode && currentConversation.messages.length > 0 && (
  <div className="h-5"></div>
)}

            {(() => {
              // 在渲染闭包内部捕获当前值，避免 stale closure 问题
              const _conv = currentConversation
              const _isPraise = _conv?.mode === 'praise'

              return _conv.messages.map((message, index) => {
                // 辩论模式使用辩论消息气泡
                if (isDebateMode && (message.speaker || message.type)) {
                  return (
                    <DebateMessageBubble
                      key={message.id}
                      message={{
                        ...message,
                        speaker: message.speaker,
                        type: message.type,
                      } as any}
                      autoPlay={
                        !isLoading && message.role === 'assistant' && !!message.voiceUrl && message.voiceUrl.length > 0 && index === _conv.messages.length - 1
                      }
                    />
                  )
                }

                // 夸夸模式 assistant 消息使用夸夸消息卡片（通过 mode + role + _praise 标记三重判断）
                if (_isPraise && message.role === 'assistant' && (message as any)._praise) {
                  return (
                    <PraiseMessageBubble
                      key={message.id}
                      message={message as any}
                      autoPlay={
                        !isLoading && !!message.voiceUrl && message.voiceUrl!.length > 0 && index === _conv.messages.length - 1
                      }
                    />
                  )
                }

                // 骂骂模式 assistant 消息使用骂骂消息卡片（通过 mode + role + _roast 标记三重判断）
                const _isRoast = _conv?.mode === 'roast'
                if (_isRoast && message.role === 'assistant' && (message as any)._roast) {
                  return (
                    <RoastMessageBubble
                      key={message.id}
                      message={message as any}
                      autoPlay={
                        !isLoading && !!message.voiceUrl && message.voiceUrl!.length > 0 && index === _conv.messages.length - 1
                      }
                    />
                  )
                }

                // 普通模式（含夸夸/骂骂模式的用户消息）使用标准消息气泡
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    autoPlay={
                      !isLoading && message.role === 'assistant' && !!message.voiceUrl && message.voiceUrl.length > 0 && index === _conv.messages.length - 1
                    }
                  />
                )
              })
            })()}

            {/* 思考中消息卡片（语音生成期间显示） - 使用 pendingSpeaker（即将发言的人） */}
            {isDebateMode && isGeneratingVoice && (pendingSpeaker || currentSpeaker) && (
              <ThinkingMessage
                speaker={pendingSpeaker || currentSpeaker!}
                message="正在思考并生成语音..."
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

{/* 输入框 */}
{isDebateMode && debateState && (
  <div className="border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3">
<DebateInfoBlock
  debateState={debateState}
  currentSpeaker={currentSpeaker}
  instruction={debateInstruction}
  onAction={handleDebateAction}
  compact={true}
  isGeneratingVoice={isGeneratingVoice}
/>
  </div>
)}
<ChatInput onSend={handleSend} onStop={handleStop} isLoading={isLoading} />
      </main>

      {/* 右侧栏：对话配置信息（只读，可折叠） */}
      <ChatInfoPanel
        conversation={currentConversation}
        isCollapsed={isRightPanelCollapsed}
        onToggleCollapse={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
      />

      {/* 新建对话弹窗 */}
      <NewChatDialog isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} onConfirm={handleConfirmNewChat} />
    </div>
  )
}

// 带语音信息的聊天请求接口（支持角色扮演）
interface VoiceChatResult { content: string; voiceUrl: string; voiceText: string; characterId?: string; mode?: string }

async function streamChatWithVoice(
  model: string,
  messages: Pick<Message, 'role' | 'content'>[],
  characterId: string = '',
  mode: string = 'debate'
): Promise<VoiceChatResult> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      character_id: characterId,   // 角色ID（如 loxd -> 罗翔）
      mode,                       // 对话模式（praise/roast/roundtable/debate）
    }),
  })
  if (!response.ok) { const error = await response.json(); throw new Error(error.detail || '请求失败') }
  return response.json()
}

// ============ 夸夸模式专用请求接口 ============
interface PraiseChatResult {
  content: string
  voiceUrl: string
  voiceText: string
  characterId: string
  characterName: string       // 后端返回的角色中文名
  mode: string
  selectedCharacter: string   // 本次随机选中的角色ID
}

/**
 * 夸夸模式专用聊天接口
 * 
 * @param content 用户输入文本
 * @param selectedModels 创建对话时选择的模型ID列表
 * @param historyMessages 历史对话消息（不含当前用户消息）
 */
async function praiseChatWithVoice(
  content: string,
  selectedModels: string[],
  historyMessages: Array<{ role: string; content: string; character_name?: string }> = []
): Promise<PraiseChatResult> {
  const response = await fetch('/api/praise/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      selected_models: selectedModels,
      history_messages: historyMessages,
    }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.detail || '夸夸模式请求失败')
  }
  return response.json()
}

// ============ 骂骂模式专用请求接口 ============
interface RoastChatResult {
  content: string
  voiceUrl: string
  voiceText: string
  characterId: string
  characterName: string       // 后端返回的角色中文名
  mode: string
  selectedCharacter: string   // 本次随机选中的角色ID
}

/**
 * 骂骂模式专用聊天接口
 * 
 * @param content 用户输入文本
 * @param selectedModels 创建对话时选择的模型ID列表
 * @param historyMessages 历史对话消息（不含当前用户消息）
 */
async function roastChatWithVoice(
  content: string,
  selectedModels: string[],
  historyMessages: Array<{ role: string; content: string; character_name?: string }> = []
): Promise<RoastChatResult> {
  const response = await fetch('/api/roast/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      selected_models: selectedModels,
      history_messages: historyMessages,
    }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.detail || '骂骂模式请求失败')
  }
  return response.json()
}

export default App
