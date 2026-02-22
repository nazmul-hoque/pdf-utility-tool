"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  FolderOpen,
  X,
  Scissors,
  Minimize2,
  Stamp,
  Merge,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/utils"
import { fileShelf, useFileShelf, type ShelfFile, type ShelfFileType } from "@/lib/file-shelf"

// ─── Context-aware tool suggestions ──────────────────────────────────────────

type ToolOption = {
  tab: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TOOL_OPTIONS: Record<ShelfFileType, ToolOption[]> = {
  pdf: [
    { tab: "merge",    label: "Merge",     icon: Merge     },
    { tab: "compress", label: "Compress",  icon: Minimize2 },
    { tab: "watermark",label: "Watermark", icon: Stamp     },
    { tab: "advanced", label: "Split",     icon: Scissors  },
  ],
  image: [
    { tab: "create",  label: "Create PDF", icon: Plus           },
    { tab: "convert", label: "Convert",    icon: FileSpreadsheet },
  ],
  document: [
    { tab: "convert", label: "Convert to PDF", icon: FileSpreadsheet },
  ],
  other: [],
}

// ─── File type icon ───────────────────────────────────────────────────────────

function FileTypeIcon({ fileType }: { fileType: ShelfFileType }) {
  switch (fileType) {
    case "pdf":      return <FileText      className="h-4 w-4 text-red-400 shrink-0" />
    case "image":    return <ImageIcon     className="h-4 w-4 text-blue-400 shrink-0" />
    case "document": return <FileSpreadsheet className="h-4 w-4 text-green-400 shrink-0" />
    default:         return <File          className="h-4 w-4 text-muted-foreground shrink-0" />
  }
}

// ─── Individual shelf file card ───────────────────────────────────────────────

function ShelfCard({ shelfFile }: { shelfFile: ShelfFile }) {
  const tools = TOOL_OPTIONS[shelfFile.fileType] ?? []

  return (
    <div className="flex-shrink-0 w-52 rounded-xl border border-white/8 bg-muted/30 p-3 space-y-2.5 group/card relative">
      {/* Remove button */}
      <button
        onClick={() => fileShelf.remove(shelfFile.id)}
        className="absolute top-2 right-2 p-0.5 rounded text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity"
        aria-label="Remove from shelf"
      >
        <X className="h-3 w-3" />
      </button>

      {/* File info */}
      <div className="flex items-start gap-2 pr-4">
        <FileTypeIcon fileType={shelfFile.fileType} />
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate leading-tight">{shelfFile.name}</p>
          <p className="text-[10px] text-muted-foreground">{formatFileSize(shelfFile.size)}</p>
        </div>
      </div>

      {/* Action pills */}
      {tools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tools.map((tool) => (
            <button
              key={tool.tab}
              onClick={() => fileShelf.sendToTab(tool.tab, shelfFile)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-white/10 bg-background/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all duration-150"
            >
              <tool.icon className="h-2.5 w-2.5" />
              {tool.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FileShelf strip ──────────────────────────────────────────────────────────

export function FileShelf() {
  const files = useFileShelf()
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show when files exist
  if (files.length === 0) return null

  const pdfCount   = files.filter((f) => f.fileType === "pdf").length
  const imageCount = files.filter((f) => f.fileType === "image").length
  const docCount   = files.filter((f) => f.fileType === "document").length

  const summary = [
    pdfCount   > 0 && `${pdfCount} PDF${pdfCount   > 1 ? "s" : ""}`,
    imageCount > 0 && `${imageCount} image${imageCount > 1 ? "s" : ""}`,
    docCount   > 0 && `${docCount} doc${docCount   > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="mb-6 rounded-xl border border-white/8 bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
      >
        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground">Session Files</span>
        <span className="text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full font-medium">
          {files.length}
        </span>
        {!isExpanded && (
          <span className="text-[10px] text-muted-foreground/50 ml-1 hidden sm:inline">
            {summary}
          </span>
        )}
        <div className="ml-auto text-muted-foreground/50">
          {isExpanded
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expanded file cards */}
      {isExpanded && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {files.map((f) => (
              <ShelfCard key={f.id} shelfFile={f} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-2">
            Click an action pill to open that tool with the file pre-loaded. Files are cleared when you close the tab.
          </p>
        </div>
      )}
    </div>
  )
}
