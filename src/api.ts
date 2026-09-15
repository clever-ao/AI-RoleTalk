import type { Message, ChatRequest } from './types'
import { API_BASE_URL } from './config'

/**
 * 发送聊天请求（流式响应）
 * 返回一个异步生成器，每次产生一段文本
 */
export async function* streamChat(
  model: string,
  messages: Pick<Message, 'role' | 'content'>[]
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    } as ChatRequest),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '请求失败')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6))
            if (data.choices?.[0]?.delta?.content) {
              yield data.choices[0].delta.content
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 非流式聊天请求（备用）
 */
export async function chat(
  model: string,
  messages: Pick<Message, 'role' | 'content'>[]
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    } as ChatRequest),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '请求失败')
  }

  const data = await response.json()
  return data.choices[0].message.content
}
