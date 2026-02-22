"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { DropZone } from "@/components/DropZone"
import { PDFProcessor, type WatermarkOptions } from "@/lib/pdf-utils"
import { usePDFWorker } from "@/lib/use-pdf-worker"
import { formatFileSize } from "@/lib/utils"
import type { BatchQueueItem } from "@/lib/types"
import { Download, FileText, ListTodo, Minimize2, Stamp, Trash2, X } from "lucide-react"

type Operation = "compress" | "watermark" | "convert"

interface BatchTabProps {
  onOpenPreview: (params: { pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
}

const DEFAULT_WATERMARK: WatermarkOptions = {
  text: "CONFIDENTIAL",
  fontSize: 48,
  opacity: 0.3,
  rotation: 45,
  color: { r: 0.5, g: 0.5, b: 0.5 },
}

const COLOR_PRESETS = [
  { label: "Gray",  value: { r: 0.5, g: 0.5, b: 0.5 } },
  { label: "Red",   value: { r: 0.8, g: 0.1, b: 0.1 } },
  { label: "Blue",  value: { r: 0.1, g: 0.2, b: 0.8 } },
  { label: "Black", value: { r: 0.0, g: 0.0, b: 0.0 } },
]

const ROTATION_OPTIONS = [0, 30, 45, 60]

const ACCEPT_BY_OP: Record<Operation, string> = {
  compress: ".pdf",
  watermark: ".pdf",
  convert: ".docx,.xlsx,.txt,.html,.png,.jpg,.jpeg,.webp",
}

function statusBadge(status: BatchQueueItem["status"]) {
  switch (status) {
    case "pending":    return <Badge variant="secondary">Pending</Badge>
    case "processing": return <Badge variant="default" className="bg-blue-500">Processing</Badge>
    case "complete":   return <Badge variant="default" className="bg-green-600">Done</Badge>
    case "error":      return <Badge variant="destructive">Error</Badge>
  }
}

export function BatchTab({ onOpenPreview }: BatchTabProps) {
  const [operation, setOperation] = useState<Operation>("compress")
  const [queue, setQueue] = useState<BatchQueueItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>(DEFAULT_WATERMARK)
  const worker = usePDFWorker()

  const updateItem = useCallback((id: string, patch: Partial<BatchQueueItem>) => {
    setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newItems: BatchQueueItem[] = Array.from(files).map((file) => ({
      id: `batch-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      status: "pending",
      progress: 0,
    }))
    setQueue((q) => [...q, ...newItems])
  }

  const removeItem = (id: string) => {
    setQueue((q) => q.filter((item) => item.id !== id))
  }

  const clearCompleted = () => {
    setQueue((q) => q.filter((item) => item.status !== "complete" && item.status !== "error"))
  }

  const processQueue = async () => {
    const pending = queue.filter((item) => item.status === "pending")
    if (pending.length === 0) return
    setIsRunning(true)

    for (const item of pending) {
      updateItem(item.id, { status: "processing", progress: 0 })
      try {
        let bytes: Uint8Array

        if (operation === "compress") {
          if (worker) {
            updateItem(item.id, { progress: 20 })
            const buffer = await item.file.arrayBuffer()
            updateItem(item.id, { progress: 50 })
            bytes = await worker.compressPDF(buffer)
          } else {
            bytes = await PDFProcessor.compressPDF(item.file, (p) =>
              updateItem(item.id, { progress: p.progress })
            )
          }
        } else if (operation === "watermark") {
          if (worker) {
            updateItem(item.id, { progress: 20 })
            const buffer = await item.file.arrayBuffer()
            updateItem(item.id, { progress: 50 })
            bytes = await worker.addWatermark(buffer, watermarkOptions)
          } else {
            bytes = await PDFProcessor.addWatermark(item.file, watermarkOptions, (p) =>
              updateItem(item.id, { progress: p.progress })
            )
          }
        } else {
          // Convert — must run on main thread (html2canvas needs DOM)
          bytes = await PDFProcessor.convertDocumentToPDF(item.file, (p) =>
            updateItem(item.id, { progress: p.progress })
          )
        }

        updateItem(item.id, { status: "complete", progress: 100, outputBytes: bytes })
      } catch (error) {
        updateItem(item.id, {
          status: "error",
          progress: 0,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    setIsRunning(false)
  }

  const pendingCount = queue.filter((i) => i.status === "pending").length
  const doneCount = queue.filter((i) => i.status === "complete" || i.status === "error").length

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader>
          <CardTitle>Batch Processing</CardTitle>
          <CardDescription>Apply one operation to multiple files in sequence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operation selector */}
          <div className="space-y-2">
            <Label>Operation</Label>
            <div className="flex gap-2">
              <Button
                variant={operation === "compress" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setOperation("compress"); setQueue([]) }}
                disabled={isRunning}
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Compress
              </Button>
              <Button
                variant={operation === "watermark" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setOperation("watermark"); setQueue([]) }}
                disabled={isRunning}
              >
                <Stamp className="h-4 w-4 mr-2" />
                Watermark
              </Button>
              <Button
                variant={operation === "convert" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setOperation("convert"); setQueue([]) }}
                disabled={isRunning}
              >
                <FileText className="h-4 w-4 mr-2" />
                Convert
              </Button>
            </div>
          </div>

          {/* Watermark options — shown only for watermark operation */}
          {operation === "watermark" && (
            <Card className="border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Watermark Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Watermark Text</Label>
                  <Input
                    value={watermarkOptions.text}
                    onChange={(e) => setWatermarkOptions((o) => ({ ...o, text: e.target.value }))}
                    placeholder="e.g. CONFIDENTIAL"
                    className="font-mono tracking-widest uppercase"
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Font Size</Label>
                    <span className="text-sm text-muted-foreground">{watermarkOptions.fontSize}pt</span>
                  </div>
                  <Slider
                    min={24} max={96} step={4}
                    value={[watermarkOptions.fontSize ?? 48]}
                    onValueChange={([v]) => setWatermarkOptions((o) => ({ ...o, fontSize: v }))}
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Opacity</Label>
                    <span className="text-sm text-muted-foreground">{Math.round((watermarkOptions.opacity ?? 0.3) * 100)}%</span>
                  </div>
                  <Slider
                    min={10} max={50} step={5}
                    value={[Math.round((watermarkOptions.opacity ?? 0.3) * 100)]}
                    onValueChange={([v]) => setWatermarkOptions((o) => ({ ...o, opacity: v / 100 }))}
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rotation</Label>
                  <div className="flex gap-2">
                    {ROTATION_OPTIONS.map((deg) => (
                      <Button
                        key={deg}
                        variant={watermarkOptions.rotation === deg ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setWatermarkOptions((o) => ({ ...o, rotation: deg }))}
                        disabled={isRunning}
                      >
                        {deg}°
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {COLOR_PRESETS.map((preset) => {
                      const isActive =
                        watermarkOptions.color?.r === preset.value.r &&
                        watermarkOptions.color?.g === preset.value.g &&
                        watermarkOptions.color?.b === preset.value.b
                      return (
                        <Button
                          key={preset.label}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setWatermarkOptions((o) => ({ ...o, color: preset.value }))}
                          disabled={isRunning}
                        >
                          {preset.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drop zone */}
          <DropZone
            accept={ACCEPT_BY_OP[operation]}
            multiple
            onFilesSelected={handleFiles}
          >
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {operation === "convert" ? "Drop documents or images here" : "Drop PDF files here"}
            </p>
            <p className="text-sm text-muted-foreground">or click to browse — multiple files allowed</p>
          </DropZone>

          {/* Queue actions */}
          {queue.length > 0 && (
            <div className="flex gap-2 justify-end">
              {doneCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearCompleted} disabled={isRunning}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Completed ({doneCount})
                </Button>
              )}
              <Button onClick={processQueue} disabled={isRunning || pendingCount === 0}>
                <ListTodo className="h-4 w-4 mr-2" />
                {isRunning ? "Processing..." : `Process Queue (${pendingCount})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Queue list */}
      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Queue</CardTitle>
            <CardDescription>{queue.length} file{queue.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(item.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(item.status)}
                    {item.status === "complete" && item.outputBytes && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenPreview({ pdfBytes: item.outputBytes, fileName: item.name, title: item.name })}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => PDFProcessor.downloadPDF(item.outputBytes!, `${operation}-${item.name}`)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </>
                    )}
                    {item.status === "pending" && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {item.status === "processing" && (
                  <Progress value={item.progress} className="h-1.5" />
                )}

                {item.status === "error" && item.errorMessage && (
                  <p className="text-xs text-destructive">{item.errorMessage}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
