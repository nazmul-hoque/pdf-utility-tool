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
import { Download, Eye, FileText, Merge } from "lucide-react"
import { PostOperationPanel } from "@/components/PostOperationPanel"
import { fileShelf, SHELF_USE_EVENT, type ShelfUseEventDetail } from "@/lib/file-shelf"

interface MergeTabProps {
  onOpenPreview: (params: { file?: File | null; pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
  onNavigate?: (tab: string) => void
}

export function MergeTab({ onOpenPreview, onNavigate }: MergeTabProps) {
  const [mergeFiles, setMergeFiles] = useState<FileItem[]>([])
  const [outputFile, setOutputFile] = useState<FileItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const worker = usePDFWorker()

  // Listen for shelf "send to merge" events
  useEffect(() => {
    const handler = (e: Event) => {
      const { targetTab, shelfFile } = (e as CustomEvent<ShelfUseEventDetail>).detail
      if (targetTab !== "merge") return
      const item: FileItem = {
        id: "shelf-" + shelfFile.id,
        name: shelfFile.name,
        size: shelfFile.size,
        type: "pdf",
        status: "complete",
        file: shelfFile.file,
      }
      setMergeFiles((prev) => {
        const alreadyAdded = prev.some((f) => f.name === item.name && f.size === item.size)
        return alreadyAdded ? prev : [...prev, item]
      })
    }
    window.addEventListener(SHELF_USE_EVENT, handler)
    return () => window.removeEventListener(SHELF_USE_EVENT, handler)
  }, [])

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const items = await buildFileItems(files, "merge")
    items.forEach((item) => { if (item.file) fileShelf.add(item.file) })
    setMergeFiles((prev) => [...prev, ...items])
  }

  const moveFileUp = (index: number) => {
    if (index === 0) return
    setMergeFiles((prev) => {
      const next = [...prev]
      const tmp = next[index]
      next[index] = next[index - 1]
      next[index - 1] = tmp
      return next
    })
  }

  const moveFileDown = (index: number) => {
    setMergeFiles((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      const tmp = next[index]
      next[index] = next[index + 1]
      next[index + 1] = tmp
      return next
    })
  }

  const processMerge = async () => {
    setIsProcessing(true)
    setProcessingProgress(null)
    setOutputFile(null)

    try {
      const pdfFiles = mergeFiles.filter((f) => f.file && f.type === "pdf").map((f) => f.file!)
      if (pdfFiles.length < 2) throw new Error("At least 2 PDF files are required for merging")

      setProcessingProgress({ progress: 10, status: "processing", message: "Preparing files..." })
      let pdfBytes: Uint8Array
      if (worker) {
        const buffers = await Promise.all(pdfFiles.map((f) => f.arrayBuffer()))
        setProcessingProgress({ progress: 40, status: "processing", message: "Merging PDFs in background..." })
        pdfBytes = await worker.mergePDFs(buffers)
        setProcessingProgress({ progress: 100, status: "complete", message: "PDFs merged successfully!" })
      } else {
        const onProgress = (p: ProcessingProgress) => setProcessingProgress(p)
        pdfBytes = await PDFProcessor.mergePDFs(pdfFiles, onProgress)
      }

      setOutputFile({
        id: "output-" + Date.now(),
        name: "merged-document.pdf",
        size: pdfBytes.length,
        pages: mergeFiles.reduce((acc, f) => acc + (f.pages || 0), 0),
        type: "pdf",
        status: "complete",
        pdfBytes,
      })
    } catch (error) {
      let msg = "An unknown error occurred"
      if (error instanceof Error) {
        if (error.message.includes("corrupted") || error.message.includes("invalid structure") || error.message.includes("Expected instance of PDFDict")) {
          msg = "One or more PDF files are corrupted or have an invalid structure. Please try with different PDF files."
        } else if (error.message.includes("encrypted") || error.message.includes("password-protected")) {
          msg = "One or more PDF files are password-protected. Please remove the password protection and try again."
        } else {
          msg = error.message
        }
      }
      setProcessingProgress({ progress: 0, status: "error", message: msg })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader>
          <CardTitle>Merge Multiple PDFs</CardTitle>
          <CardDescription>Upload multiple PDF files and reorder them before merging. Use the arrow buttons or drag handle to change the order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <DropZone accept=".pdf" onFilesSelected={handleFiles}>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Drop PDF files here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </DropZone>

          {mergeFiles.length > 0 && (
            <div className="space-y-4">
              <Label>PDF Files ({mergeFiles.length})</Label>
              <div className="grid gap-3">
                {mergeFiles.map((file, index) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    section="merge"
                    index={index}
                    totalCount={mergeFiles.length}
                    onMoveUp={moveFileUp}
                    onMoveDown={moveFileDown}
                    onPreview={(f, title) => onOpenPreview({ file: f, fileName: f.name, title })}
                    onRemove={(id) => setMergeFiles((prev) => prev.filter((f) => f.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}

          <Button onClick={processMerge} disabled={isProcessing || mergeFiles.length < 2} className="w-full">
            <Merge className="h-4 w-4 mr-2" />
            {isProcessing ? "Merging PDFs..." : "Merge PDFs"}
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
            <CardDescription>Your merged PDF is ready for download</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium">{outputFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(outputFile.size)} • {outputFile.pages} pages
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenPreview({ pdfBytes: outputFile.pdfBytes, fileName: outputFile.name, title: "Merged PDF Preview" })}
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
                sourceTab="merge"
                pdfBytes={outputFile.pdfBytes}
                fileName={outputFile.name}
                onNavigate={onNavigate}
                onReset={() => { setOutputFile(null); setMergeFiles([]); setProcessingProgress(null) }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
