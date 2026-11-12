import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[#15191F] border border-[#272D36] rounded-lg p-5 shadow-2xl">
        <div className="flex items-start gap-3.5 mb-4">
          <div className={`p-2 rounded-md ${isDestructive ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#3B82F6]/10 text-[#3B82F6]'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF4] mb-1">{title}</h3>
            <p className="text-xs text-[#8B95A5] leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#272D36]">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium bg-[#1A1F27] hover:bg-[#272D36] text-[#E8EDF4] border border-[#272D36] rounded transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors text-white ${
              isDestructive ? 'bg-[#EF4444] hover:bg-[#DC2626]' : 'bg-[#3B82F6] hover:bg-[#2563EB]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

