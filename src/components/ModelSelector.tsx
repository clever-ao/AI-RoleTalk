import React from 'react'
import { ChevronDown } from 'lucide-react'
import { MODELS, DEFAULT_MODEL } from '../config'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS.find((m) => m.id === DEFAULT_MODEL)!

  return (
    <div className="relative">
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
      >
        <span className="font-semibold">{currentModel.name}</span>
        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
          {currentModel.provider}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层，点击关闭 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full mt-2 left-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg z-20 overflow-hidden">
            <div className="p-1.5">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    model.id === selectedModel
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm">{model.name}</span>
                    <span className="text-[11px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                      {model.provider}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{model.description}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ModelSelector
