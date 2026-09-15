// 辩论模式相关类型定义

export interface DebateTeamMember {
  id: string
  name: string
  position: number
  background?: string  // 可选字段
}

export interface DebateTeam {
  side: string
  name: string
  members: DebateTeamMember[]
}

export interface DebateRound {
  id: string
  name: string
  order?: string[]       // 可选，DebateInfoBlock 可能用到
  description?: string    // 可选，DebateInfoBlock 可能用到
}

export interface DebateState {
  debate_id: string
  topic: string
  pro_team: DebateTeam
  con_team: DebateTeam
  current_round: DebateRound | null
  current_round_index: number
  phase: string
  is_active: boolean
  total_rounds: number
  is_generating_voice?: boolean  // 是否正在生成语音
  current_speaker_index?: number  // 当前发言者索引（用于预测下一个发言者）
}

export interface CurrentSpeakerInfo {
  side: string
  position: string
  name: string
  character_id: string
}
