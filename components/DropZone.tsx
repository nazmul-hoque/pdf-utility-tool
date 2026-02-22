"use client"

import type React from "react"

interface DropZoneProps {
  accept: string
  multiple?: boolean
  children: React.ReactNode
  onFilesSelected: (files: FileList | null) => void
}

export function DropZone({ accept, multiple = true, children, onFilesSelected }: DropZoneProps) {
  return (
    <div
      className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-2xl p-12 text-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-500 cursor-pointer group relative overflow-hidden shadow-inner"
      onDrop={(e) => {
        e.preventDefault()
        onFilesSelected(e.dataTransfer.files)
      }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = accept
        input.multiple = multiple
        input.onchange = (e) => onFilesSelected((e.target as HTMLInputElement).files)
        input.click()
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-500 ease-out">
        {children}
      </div>
    </div>
  )
}
