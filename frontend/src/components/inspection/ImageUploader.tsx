import React, { useState, useRef } from 'react'
import { UploadCloud, X, AlertCircle } from 'lucide-react'

interface ImageUploaderProps {
  onInspect: (file: File, notes: string) => void
  isLoading?: boolean
}

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_MB = 15

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onInspect, isLoading = false }) => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndSetFile = (selectedFile: File) => {
    setError(null)

    if (!SUPPORTED_FORMATS.includes(selectedFile.type)) {
      setError(`Unsupported file format. Please upload JPG, PNG, or WEBP image.`)
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`)
      return
    }

    setFile(selectedFile)
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    onInspect(file, notes)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          isDragging
            ? 'border-[#3B82F6] bg-[#3B82F6]/5'
            : file
            ? 'border-[#272D36] bg-[#15191F]'
            : 'border-[#272D36] hover:border-[#3B82F6]/50 bg-[#15191F] cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        {previewUrl ? (
          <div className="relative inline-block max-w-full">
            <img
              src={previewUrl}
              alt="Inspection candidate"
              className="max-h-72 w-auto mx-auto rounded-md object-contain border border-[#272D36]"
            />
            {!isLoading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
                className="absolute top-2 right-2 p-1 bg-[#101318]/80 hover:bg-[#EF4444] text-[#E8EDF4] border border-[#272D36] rounded-full transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="mt-2 text-[11px] text-[#8B95A5]">
              {file?.name} ({(file?.size ? file.size / 1024 : 0).toFixed(1)} KB)
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#1A1F27] border border-[#272D36] flex items-center justify-center text-[#3B82F6]">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-[#E8EDF4]">
                Click to browse or drag and drop solar panel image
              </div>
              <div className="text-xs text-[#8B95A5] mt-1">
                Supports JPG, PNG, WEBP (Max 15MB) • High-res orthomosaic or handheld
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-md text-xs text-[#EF4444]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Notes Input */}
      <div>
        <label className="block text-xs font-semibold text-[#8B95A5] uppercase tracking-wider mb-1.5">
          Inspection Notes / String Identifier (Optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Inverter Array 3, Module #24B, East Substation"
          disabled={isLoading}
          className="w-full px-3.5 py-2 bg-[#15191F] border border-[#272D36] rounded-md text-xs text-[#E8EDF4] placeholder-[#8B95A5]/60 focus:outline-none focus:border-[#3B82F6] transition-colors"
        />
      </div>

      {/* Submit Action */}
      <button
        type="submit"
        disabled={!file || isLoading}
        className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold tracking-wide transition-all ${
          !file || isLoading
            ? 'bg-[#1A1F27] text-[#8B95A5] border border-[#272D36] cursor-not-allowed'
            : 'bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-sm'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Executing MobileNetV2 Neural Diagnostic...</span>
          </span>
        ) : (
          'Run AI Defect Analysis'
        )}
      </button>
    </form>
  )
}

