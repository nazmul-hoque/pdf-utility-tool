"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { FileCard } from "@/components/FileCard"
import { DropZone } from "@/components/DropZone"
import { buildFileItems } from "@/lib/file-utils"
import { PDFProcessor, type ProcessingProgress } from "@/lib/pdf-utils"
import { usePDFWorker } from "@/lib/use-pdf-worker"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/lib/types"
import { AlertTriangle, Download, Eye, FileText, Minimize2, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { PostOperationPanel } from "@/components/PostOperationPanel"
import { pendingFile } from "@/lib/pending-file"
import { fileShelf, SHELF_USE_EVENT, type ShelfUseEventDetail } from "@/lib/file-shelf"

interface CompressTabProps {
  onOpenPreview: (params: { file?: File | null; pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
  onNavigate?: (tab: string) => void
}

export function CompressTab({ onOpenPreview, onNavigate }: CompressTabProps) {
  const [compressFile, setCompressFile] = useState<FileItem | null>(null)
  const [outputFile, setOutputFile] = useState<FileItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const worker = usePDFWorker()

  // Consume a file passed from another tab (e.g. Merge → Compress)
  useEffect(() => {
    const pending = pendingFile.consume()
    if (!pending) return
    const blob = new Blob([pending.pdfBytes], { type: "application/pdf" })
    const file = new File([blob], pending.fileName, { type: "application/pdf" })
    setCompressFile({
      id: "pending-" + Date.now(),
      name: pending.fileName,
      size: pending.pdfBytes.length,
      type: "pdf",
      status: "complete",
      file,
    })
  }, [])

  // Listen for shelf "send to compress" events
  useEffect(() => {
    const handler = (e: Event) => {
      const { targetTab, shelfFile } = (e as CustomEvent<ShelfUseEventDetail>).detail
      if (targetTab !== "compress") return
      setCompressFile({
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
      setCompressFile(items[0])
    }
  }

  const processCompress = async () => {
    if (!compressFile?.file) return
    setIsProcessing(true)
    setProcessingProgress(null)
    setOutputFile(null)

    try {
      let pdfBytes: Uint8Array
      if (worker) {
        setProcessingProgress({ progress: 20, status: "processing", message: "Loading PDF for compression..." })
        const buffer = await compressFile.file.arrayBuffer()
        setProcessingProgress({ progress: 50, status: "processing", message: "Compressing in background..." })
        pdfBytes = await worker.compressPDF(buffer)
        setProcessingProgress({ progress: 100, status: "complete", message: "PDF compressed successfully!" })
      } else {
        const onProgress = (p: ProcessingProgress) => setProcessingProgress(p)
        pdfBytes = await PDFProcessor.compressPDF(compressFile.file, onProgress)
      }

      setOutputFile({
        id: "output-" + Date.now(),
        name: `compressed-${compressFile.name}`,
        size: pdfBytes.length,
        pages: 1,
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
          <CardTitle>Compress PDF</CardTitle>
          <CardDescription>Reduce the file size of your PDF while maintaining quality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-600 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <span className="font-semibold">Browser compression has limitations.</span> This tool removes redundant metadata and optimises structure, but cannot re-encode images. PDFs that are already optimised or image-heavy may not shrink — or may increase slightly in size.
            </p>
          </div>

          <DropZone accept=".pdf" multiple={false} onFilesSelected={handleFiles}>
            <Minimize2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Drop PDF file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </DropZone>

          {compressFile && (
            <div className="space-y-4">
              <Label>Selected File</Label>
              <FileCard
                file={compressFile}
                section="compress"
                onPreview={(f, title) => onOpenPreview({ file: f, fileName: f.name, title })}
                onRemove={() => setCompressFile(null)}
              />
            </div>
          )}

          <Button onClick={processCompress} disabled={isProcessing || !compressFile} className="w-full">
            <Minimize2 className="h-4 w-4 mr-2" />
            {isProcessing ? "Compressing PDF..." : "Compress PDF"}
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

      {outputFile && compressFile && (() => {
        const originalSize = compressFile.size
        const compressedSize = outputFile.size
        const delta = compressedSize - originalSize
        const pct = Math.round((delta / originalSize) * 100)
        const saved = pct < -1
        const grew = pct > 1
        // neutral: within ±1%

        return (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Compression Result</CardTitle>
              <CardDescription>
                {saved
                  ? `Reduced by ${Math.abs(pct)}% — good result for this PDF`
                  : grew
                    ? "File grew slightly — this PDF was already well-optimised"
                    : "No meaningful size change — this PDF was already optimised"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Size comparison */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Original</p>
                  <p className="font-semibold">{formatFileSize(originalSize)}</p>
                </div>
                <div className={`p-3 rounded-lg flex flex-col items-center justify-center ${saved ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : grew ? "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800" : "bg-muted/50"}`}>
                  <p className="text-xs text-muted-foreground mb-1">Change</p>
                  <div className="flex items-center gap-1">
                    {saved
                      ? <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                      : grew
                        ? <TrendingUp className="h-4 w-4 text-orange-500" />
                        : <Minus className="h-4 w-4 text-muted-foreground" />}
                    <p className={`font-semibold ${saved ? "text-green-600 dark:text-green-400" : grew ? "text-orange-500" : "text-muted-foreground"}`}>
                      {pct > 0 ? "+" : ""}{pct}%
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Compressed</p>
                  <p className="font-semibold">{formatFileSize(compressedSize)}</p>
                </div>
              </div>

              {grew && (
                <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700 p-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    The output is slightly larger. This PDF is likely already well-optimised, or it contains mostly images which browser-based compression cannot re-encode. The original may be the better file to use.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium">{outputFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(compressedSize)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenPreview({ pdfBytes: outputFile.pdfBytes, fileName: outputFile.name, title: "Compressed PDF Preview" })}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button size="sm" onClick={() => outputFile.pdfBytes && PDFProcessor.downloadPDF(outputFile.pdfBytes, outputFile.name)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              {outputFile.pdfBytes && (
                <PostOperationPanel
                  sourceTab="compress"
                  pdfBytes={outputFile.pdfBytes}
                  fileName={outputFile.name}
                  onNavigate={onNavigate}
                  onReset={() => { setOutputFile(null); setCompressFile(null); setProcessingProgress(null) }}
                />
              )}
            </CardContent>
          </Card>
        )
      })()}
    </>
  )
}
