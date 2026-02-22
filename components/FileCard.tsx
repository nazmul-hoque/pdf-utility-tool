"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/lib/types"
import { ArrowDown, ArrowUp, Eye, FileImage, FileText, GripVertical, Trash2 } from "lucide-react"

interface FileCardProps {
  file: FileItem
  section: "create" | "merge" | "compress"
  index?: number
  totalCount?: number
  onMoveUp?: (index: number) => void
  onMoveDown?: (index: number) => void
  onPreview: (file: File, title: string) => void
  onRemove: (id: string) => void
}

export function FileCard({
  file,
  section,
  index,
  totalCount = 0,
  onMoveUp,
  onMoveDown,
  onPreview,
  onRemove,
}: FileCardProps) {
  return (
    <Card className="p-4 bg-white/5 border-white/5 glass shadow-xl hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-0.5">
      <div className="flex items-center gap-4">
        {section === "merge" && index !== undefined && (
          <div className="flex flex-col items-center gap-2 pr-2 border-r border-white/10">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMoveUp?.(index)}
                disabled={index === 0}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition-all"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMoveDown?.(index)}
                disabled={index === totalCount - 1}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-20 transition-all"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 p-2 bg-background/50 rounded-lg shadow-inner">
          {file.type === "pdf" ? (
            <FileText className="h-8 w-8 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
          ) : (
            <FileImage className="h-8 w-8 text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {section === "merge" && index !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-primary/20 bg-primary/5 text-primary">
                STEP {index + 1}
              </Badge>
            </div>
          )}
          <p className="text-sm font-semibold truncate tracking-tight">{file.name}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">{formatFileSize(file.size)}</span>
            {file.pages && (
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                {file.pages} pages
              </span>
            )}
            {file.isEncrypted && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 text-orange-400 border-orange-400/20 bg-orange-400/5 uppercase tracking-wider font-bold">
                Protected
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {file.type === "pdf" && file.file && file.status === "complete" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview(file.file!, "PDF Preview")}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(file.id)}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
