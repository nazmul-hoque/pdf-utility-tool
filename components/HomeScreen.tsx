"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Merge,
  Scissors,
  Minimize2,
  FileSpreadsheet,
  Stamp,
  Plus,
  ChevronRight,
  Upload,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type ActionCard = {
  tab: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  iconBg: string
  iconColor: string
  hoverBg: string
  hoverBorder: string
  suggestedRing: string
  accepts: string[]
}

const ACTION_CARDS: ActionCard[] = [
  {
    tab: "merge",
    icon: Merge,
    title: "Merge PDFs",
    description: "Combine multiple files into one document",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-500",
    hoverBg: "hover:bg-blue-500/8",
    hoverBorder: "hover:border-blue-500/40",
    suggestedRing: "ring-blue-500/30 border-blue-500/50 bg-blue-500/5",
    accepts: ["pdf"],
  },
  {
    tab: "advanced",
    icon: Scissors,
    title: "Split & Extract",
    description: "Split by page ranges or extract specific pages",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-500",
    hoverBg: "hover:bg-violet-500/8",
    hoverBorder: "hover:border-violet-500/40",
    suggestedRing: "ring-violet-500/30 border-violet-500/50 bg-violet-500/5",
    accepts: ["pdf"],
  },
  {
    tab: "compress",
    icon: Minimize2,
    title: "Compress PDF",
    description: "Reduce file size while preserving structure",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-500",
    hoverBg: "hover:bg-emerald-500/8",
    hoverBorder: "hover:border-emerald-500/40",
    suggestedRing: "ring-emerald-500/30 border-emerald-500/50 bg-emerald-500/5",
    accepts: ["pdf"],
  },
  {
    tab: "convert",
    icon: FileSpreadsheet,
    title: "Convert to PDF",
    description: "Word, Excel, images, HTML and more",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-500",
    hoverBg: "hover:bg-orange-500/8",
    hoverBorder: "hover:border-orange-500/40",
    suggestedRing: "ring-orange-500/30 border-orange-500/50 bg-orange-500/5",
    accepts: ["docx", "doc", "xlsx", "xls", "html", "image"],
  },
  {
    tab: "watermark",
    icon: Stamp,
    title: "Watermark",
    description: "Brand your documents with text overlays",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-500",
    hoverBg: "hover:bg-rose-500/8",
    hoverBorder: "hover:border-rose-500/40",
    suggestedRing: "ring-rose-500/30 border-rose-500/50 bg-rose-500/5",
    accepts: ["pdf"],
  },
  {
    tab: "create",
    icon: Plus,
    title: "Create PDF",
    description: "Build a new PDF from images or text",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-500",
    hoverBg: "hover:bg-sky-500/8",
    hoverBorder: "hover:border-sky-500/40",
    suggestedRing: "ring-sky-500/30 border-sky-500/50 bg-sky-500/5",
    accepts: ["image"],
  },
]

function getFileCategory(file: File): string {
  const name = file.name.toLowerCase()
  const type = file.type
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf"
  if (type.includes("word") || name.endsWith(".docx") || name.endsWith(".doc")) return "docx"
  if (type.includes("excel") || type.includes("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx"
  if (type.startsWith("image/")) return "image"
  if (name.endsWith(".html") || name.endsWith(".htm")) return "html"
  return "other"
}

const RECENT_KEY = "flowpdf-recent-tools"

function getRecentTools(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
  } catch {
    return []
  }
}

export function saveRecentTool(tab: string) {
  if (typeof window === "undefined") return
  try {
    const recent = getRecentTools().filter((t) => t !== tab)
    recent.unshift(tab)
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 3)))
  } catch { }
}

interface HomeScreenProps {
  onNavigate: (tab: string) => void
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [suggestedTabs, setSuggestedTabs] = useState<string[]>([])
  const [recentTools, setRecentTools] = useState<string[]>([])

  useEffect(() => {
    setRecentTools(getRecentTools())
  }, [])

  const handleNavigate = (tab: string) => {
    saveRecentTool(tab)
    setRecentTools(getRecentTools())
    onNavigate(tab)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only fire when leaving the drop zone entirely, not when moving over children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const categories = [...new Set(files.map(getFileCategory))]
    const suggestions = ACTION_CARDS
      .filter((card) => card.accepts.some((a) => categories.includes(a)))
      .map((card) => card.tab)
    setSuggestedTabs(suggestions)
  }, [])

  const hasSuggestions = suggestedTabs.length > 0

  return (
    <div className="space-y-10 max-w-4xl mx-auto py-4">

      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold tracking-tight">
          What do you want to do?
        </h2>
        <p className="text-muted-foreground text-base">
          {hasSuggestions
            ? "Based on your files, here are the recommended tools"
            : "Choose a tool to get started, or drop files below for suggestions"}
        </p>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTION_CARDS.map((card) => {
          const isSuggested = hasSuggestions && suggestedTabs.includes(card.tab)
          const isDeemphasized = hasSuggestions && !isSuggested

          return (
            <button
              key={card.tab}
              onClick={() => handleNavigate(card.tab)}
              className={[
                "group relative p-6 rounded-2xl border text-left transition-all duration-300 cursor-pointer",
                "bg-card/40 backdrop-blur-sm",
                isSuggested
                  ? `ring-1 shadow-lg scale-[1.02] ${card.suggestedRing}`
                  : isDeemphasized
                    ? "border-white/5 opacity-40 scale-[0.98] pointer-events-none"
                    : `border-white/8 ${card.hoverBg} ${card.hoverBorder} hover:scale-[1.02] hover:shadow-lg`,
              ].join(" ")}
            >
              {isSuggested && (
                <Badge
                  className="absolute top-3 right-3 text-[10px] px-2 py-0.5 font-semibold"
                  variant="default"
                >
                  Suggested
                </Badge>
              )}

              <div className={`inline-flex p-3 rounded-xl ${card.iconBg} mb-4`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>

              <h3 className="font-bold text-base tracking-tight">{card.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed pr-4">
                {card.description}
              </p>

              <ChevronRight className="absolute bottom-5 right-5 h-4 w-4 text-muted-foreground/25 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all duration-200" />
            </button>
          )
        })}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
            : hasSuggestions
              ? "border-primary/30 bg-primary/3"
              : "border-muted-foreground/20 hover:border-muted-foreground/35 hover:bg-muted/5",
        ].join(" ")}
      >
        {hasSuggestions ? (
          <div className="space-y-2">
            <Sparkles className="h-7 w-7 mx-auto text-primary" />
            <p className="font-medium text-sm">
              Files analysed — suggested tools are highlighted above
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground text-xs"
              onClick={() => setSuggestedTabs([])}
            >
              Clear suggestions
            </Button>
          </div>
        ) : (
          <>
            <Upload
              className={`h-9 w-9 mx-auto mb-3 transition-colors duration-200 ${isDragging ? "text-primary" : "text-muted-foreground/40"
                }`}
            />
            <p
              className={`font-medium transition-colors text-sm ${isDragging ? "text-primary" : "text-muted-foreground"
                }`}
            >
              Drop files here for tool suggestions
            </p>
            <p className="text-xs text-muted-foreground/45 mt-1">
              PDF, Word, Excel, images supported
            </p>
          </>
        )}
      </div>

      {/* Recent Tools — "Jump back in" */}
      {recentTools.length > 0 && (
        <div className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Jump back in
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTools.map((tab) => {
              const card = ACTION_CARDS.find((c) => c.tab === tab)
              if (!card) return null
              return (
                <button
                  key={tab}
                  onClick={() => handleNavigate(tab)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 bg-card/40 backdrop-blur-sm text-sm font-medium hover:bg-card/70 hover:border-white/15 transition-all duration-200 group"
                >
                  <card.icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                  <span>{card.title}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30 group-hover:translate-x-0.5 group-hover:text-muted-foreground/60 transition-all duration-200" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
