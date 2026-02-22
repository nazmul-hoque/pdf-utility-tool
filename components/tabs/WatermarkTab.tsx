"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { DropZone } from "@/components/DropZone"
import { FileCard } from "@/components/FileCard"
import { buildFileItems } from "@/lib/file-utils"
import { PDFProcessor, type ProcessingProgress, type WatermarkOptions } from "@/lib/pdf-utils"
import { usePDFWorker } from "@/lib/use-pdf-worker"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/lib/types"
import { ChevronDown, Download, Eye, FileText, Stamp } from "lucide-react"
import { PostOperationPanel } from "@/components/PostOperationPanel"
import { pendingFile } from "@/lib/pending-file"
import { fileShelf, SHELF_USE_EVENT, type ShelfUseEventDetail } from "@/lib/file-shelf"

interface WatermarkTabProps {
  onOpenPreview: (params: { file?: File | null; pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
  onNavigate?: (tab: string) => void
}

const COLOR_PRESETS = [
  { label: "Gray",  value: { r: 0.5, g: 0.5, b: 0.5 } },
  { label: "Red",   value: { r: 0.8, g: 0.1, b: 0.1 } },
  { label: "Blue",  value: { r: 0.1, g: 0.2, b: 0.8 } },
  { label: "Black", value: { r: 0.0, g: 0.0, b: 0.0 } },
]

const ROTATION_OPTIONS = [0, 30, 45, 60]

const DEFAULT_OPTIONS: WatermarkOptions = {
  text: "CONFIDENTIAL",
  fontSize: 48,
  opacity: 0.3,
  rotation: 45,
  color: { r: 0.5, g: 0.5, b: 0.5 },
}

export function WatermarkTab({ onOpenPreview, onNavigate }: WatermarkTabProps) {
  const [inputFile, setInputFile] = useState<FileItem | null>(null)
  const [outputFile, setOutputFile] = useState<FileItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const [options, setOptions] = useState<WatermarkOptions>(DEFAULT_OPTIONS)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const worker = usePDFWorker()

  // Consume a file passed from another tab (e.g. Merge → Watermark)
  useEffect(() => {
    const pending = pendingFile.consume()
    if (!pending) return
    const blob = new Blob([pending.pdfBytes], { type: "application/pdf" })
    const file = new File([blob], pending.fileName, { type: "application/pdf" })
    setInputFile({
      id: "pending-" + Date.now(),
      name: pending.fileName,
      size: pending.pdfBytes.length,
      type: "pdf",
      status: "complete",
      file,
    })
  }, [])

  // Listen for shelf "send to watermark" events
  useEffect(() => {
    const handler = (e: Event) => {
      const { targetTab, shelfFile } = (e as CustomEvent<ShelfUseEventDetail>).detail
      if (targetTab !== "watermark") return
      setInputFile({
        id: "shelf-" + shelfFile.id,
        name: shelfFile.name,
        size: shelfFile.size,
        type: "pdf",
        status: "complete",
        file: shelfFile.file,
      })
      setOutputFile(null)
      setProcessingProgress(null)
    }
    window.addEventListener(SHELF_USE_EVENT, handler)
    return () => window.removeEventListener(SHELF_USE_EVENT, handler)
  }, [])

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const items = await buildFileItems(files, "compress")
    if (items.length > 0) {
      if (items[0].file) fileShelf.add(items[0].file)
      setInputFile(items[0])
      setOutputFile(null)
      setProcessingProgress(null)
    }
  }

  const applyWatermark = async () => {
    if (!inputFile?.file || !options.text.trim()) return
    setIsProcessing(true)
    setProcessingProgress(null)
    setOutputFile(null)

    try {
      let pdfBytes: Uint8Array
      if (worker) {
        setProcessingProgress({ progress: 10, status: "processing", message: "Preparing..." })
        const buffer = await inputFile.file.arrayBuffer()
        setProcessingProgress({ progress: 30, status: "processing", message: "Applying watermark in background..." })
        pdfBytes = await worker.addWatermark(buffer, options)
        setProcessingProgress({ progress: 100, status: "complete", message: "Watermark applied!" })
      } else {
        pdfBytes = await PDFProcessor.addWatermark(inputFile.file, options, (p) => setProcessingProgress(p))
      }

      setOutputFile({
        id: "wm-" + Date.now(),
        name: `watermarked-${inputFile.name}`,
        size: pdfBytes.length,
        type: "pdf",
        status: "complete",
        pdfBytes,
      })
    } catch (error) {
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader>
          <CardTitle>Add Watermark</CardTitle>
          <CardDescription>Apply a diagonal text watermark to every page of your PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DropZone accept=".pdf" multiple={false} onFilesSelected={handleFiles}>
            <Stamp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Drop PDF file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </DropZone>

          {inputFile && (
            <div className="space-y-2">
              <Label>Selected File</Label>
              <FileCard
                file={inputFile}
                section="compress"
                onPreview={(f, title) => onOpenPreview({ file: f, fileName: f.name, title })}
                onRemove={() => { setInputFile(null); setOutputFile(null) }}
              />
            </div>
          )}

          {/* Watermark Options */}
          <Card className="border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Watermark Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Text — always visible */}
              <div className="space-y-2">
                <Label>Watermark Text</Label>
                <Input
                  value={options.text}
                  onChange={(e) => setOptions((o) => ({ ...o, text: e.target.value }))}
                  placeholder="e.g. CONFIDENTIAL"
                  className="font-mono tracking-widest uppercase"
                />
              </div>

              {/* Font Size — always visible */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Font Size</Label>
                  <span className="text-sm text-muted-foreground">{options.fontSize}pt</span>
                </div>
                <Slider
                  min={24} max={96} step={4}
                  value={[options.fontSize ?? 48]}
                  onValueChange={([v]) => setOptions((o) => ({ ...o, fontSize: v }))}
                />
              </div>

              {/* ── Advanced appearance options (collapsed by default) ── */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1">
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`}
                    />
                    {advancedOpen ? "Hide" : "Show"} appearance options
                    {!advancedOpen && (
                      <span className="ml-auto text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-full">
                        {Math.round((options.opacity ?? 0.3) * 100)}% · {options.rotation}° · {COLOR_PRESETS.find(
                          (p) => p.value.r === options.color?.r && p.value.g === options.color?.g && p.value.b === options.color?.b
                        )?.label ?? "Custom"}
                      </span>
                    )}
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-5 pt-3">
                  {/* Opacity */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Opacity</Label>
                      <span className="text-sm text-muted-foreground">{Math.round((options.opacity ?? 0.3) * 100)}%</span>
                    </div>
                    <Slider
                      min={10} max={50} step={5}
                      value={[Math.round((options.opacity ?? 0.3) * 100)]}
                      onValueChange={([v]) => setOptions((o) => ({ ...o, opacity: v / 100 }))}
                    />
                  </div>

                  {/* Rotation */}
                  <div className="space-y-2">
                    <Label>Rotation</Label>
                    <div className="flex gap-2">
                      {ROTATION_OPTIONS.map((deg) => (
                        <Button
                          key={deg}
                          variant={options.rotation === deg ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setOptions((o) => ({ ...o, rotation: deg }))}
                        >
                          {deg}°
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      {COLOR_PRESETS.map((preset) => {
                        const isActive =
                          options.color?.r === preset.value.r &&
                          options.color?.g === preset.value.g &&
                          options.color?.b === preset.value.b
                        return (
                          <Button
                            key={preset.label}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setOptions((o) => ({ ...o, color: preset.value }))}
                          >
                            {preset.label}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          <Button
            onClick={applyWatermark}
            disabled={isProcessing || !inputFile || !options.text.trim()}
            className="w-full"
          >
            <Stamp className="h-4 w-4 mr-2" />
            {isProcessing ? "Applying Watermark..." : "Apply Watermark"}
          </Button>

          {isProcessing && processingProgress && (
            <div className="space-y-2">
              <Progress value={processingProgress.progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{processingProgress.message}</p>
            </div>
          )}

          {processingProgress?.status === "error" && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{processingProgress.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {outputFile && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Output File</CardTitle>
            <CardDescription>Your watermarked PDF is ready</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium">{outputFile.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(outputFile.size)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenPreview({ pdfBytes: outputFile.pdfBytes, fileName: outputFile.name, title: "Watermarked PDF Preview" })}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => outputFile.pdfBytes && PDFProcessor.downloadPDF(outputFile.pdfBytes, outputFile.name)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            {outputFile.pdfBytes && (
              <PostOperationPanel
                sourceTab="watermark"
                pdfBytes={outputFile.pdfBytes}
                fileName={outputFile.name}
                onNavigate={onNavigate}
                onReset={() => { setOutputFile(null); setInputFile(null); setProcessingProgress(null) }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
