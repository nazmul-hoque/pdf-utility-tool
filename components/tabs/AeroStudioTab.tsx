"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PDFProcessor, type ProcessingProgress } from "@/lib/pdf-utils"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/lib/types"
import { ArrowUp, Download, Eye, FileText, LayoutGrid, Plus, RotateCw, Trash2 } from "lucide-react"

interface AeroStudioTabProps {
  onOpenPreview: (params: { file?: File | null; pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
}

interface StudioPage {
  id: string
  thumbnail: string
  file: File
  pageIndex: number
  rotation: number
  name: string
}

export function AeroStudioTab({ onOpenPreview }: AeroStudioTabProps) {
  const [studioPages, setStudioPages] = useState<StudioPage[]>([])
  const [outputFile, setOutputFile] = useState<FileItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  const handleStudioFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsProcessing(true)
    setProcessingProgress({ progress: 10, status: "processing", message: "Initial analysis..." })

    try {
      const newPages: StudioPage[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type !== "application/pdf") {
          alert(`File ${file.name} is not a PDF. PDF Builder currently supports PDF page manipulation only.`)
          continue
        }
        const thumbnails = await PDFProcessor.getPageThumbnails(file, (p) => {
          setProcessingProgress({ ...p, message: `[${file.name}] ${p.message}` })
        })
        thumbnails.forEach((thumb, idx) => {
          newPages.push({
            id: `${file.name}-${idx}-${Date.now()}-${Math.random()}`,
            thumbnail: thumb,
            file,
            pageIndex: idx,
            rotation: 0,
            name: file.name,
          })
        })
      }
      setStudioPages((prev) => [...prev, ...newPages])
      setProcessingProgress({ progress: 100, status: "complete", message: "Pages added to workspace!" })
    } catch (error) {
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load pages into PDF Builder",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const generateStudioPDF = async () => {
    if (studioPages.length === 0) return
    setIsProcessing(true)
    setProcessingProgress({ progress: 10, status: "processing", message: "Starting composition..." })

    try {
      const pageConfigs = studioPages.map((p) => ({ file: p.file, pageIndex: p.pageIndex, rotation: p.rotation }))
      const pdfBytes = await PDFProcessor.composePDF(pageConfigs, (p) => setProcessingProgress(p))
      setOutputFile({
        id: "output-" + Date.now(),
        name: "flow-studio-composition.pdf",
        size: pdfBytes.length,
        pages: studioPages.length,
        type: "pdf",
        status: "complete",
        pdfBytes,
      })
    } catch (error) {
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: error instanceof Error ? error.message : "Failed to generate studio composition",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const moveStudioPage = (fromIndex: number, toIndex: number) => {
    setStudioPages((prev) => {
      const result = [...prev]
      const [removed] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, removed)
      return result
    })
  }

  const rotateStudioPage = (id: string) => {
    setStudioPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    )
  }

  const removeStudioPage = (id: string) => {
    setStudioPages((prev) => prev.filter((p) => p.id !== id))
  }

  const triggerFileInput = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/pdf"
    input.multiple = true
    input.onchange = (e) => handleStudioFileUpload((e.target as HTMLInputElement).files)
    input.click()
  }

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flow-text-gradient">PDF Builder</CardTitle>
          <CardDescription>Visually organise, reorder, and compose your perfect PDF document.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error shown regardless of whether pages have loaded yet */}
          {!isProcessing && processingProgress?.status === "error" && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{processingProgress.message}</p>
            </div>
          )}
          {studioPages.length === 0 ? (
            <div
              className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-2xl p-20 text-center hover:border-primary/50 hover:bg-primary/10 transition-all duration-500 cursor-pointer group relative overflow-hidden shadow-inner"
              onDrop={(e) => { e.preventDefault(); handleStudioFileUpload(e.dataTransfer.files) }}
              onDragOver={(e) => e.preventDefault()}
              onClick={triggerFileInput}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-500 ease-out">
                <LayoutGrid className="h-16 w-16 mx-auto mb-4 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-xl font-bold mb-2">Start Your Composition</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Upload one or more PDFs to start organizing pages visually.</p>
                <Button className="mt-6">Add PDF Files</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{studioPages.length} pages in workspace</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={triggerFileInput}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setStudioPages([])}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[600px] overflow-y-auto p-2 border rounded-xl bg-background/50 shadow-inner">
                {studioPages.map((page, index) => (
                  <div
                    key={page.id}
                    className="group relative aspect-[3/4] bg-white rounded-lg border border-white/10 shadow-lg overflow-hidden transition-all hover:ring-2 hover:ring-primary/50"
                  >
                    <img
                      src={page.thumbnail}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      style={{ transform: `rotate(${page.rotation}deg)` }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <div className="flex gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => rotateStudioPage(page.id)} title="Rotate 90°">
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => removeStudioPage(page.id)} title="Remove Page">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => moveStudioPage(index, Math.max(0, index - 1))} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4 rotate-[-90deg]" />
                        </Button>
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => moveStudioPage(index, Math.min(studioPages.length - 1, index + 1))} disabled={index === studioPages.length - 1}>
                          <ArrowUp className="h-4 w-4 rotate-[90deg]" />
                        </Button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1 px-2 flex justify-between items-center">
                      <span className="truncate max-w-[60px]">{page.name}</span>
                      <span className="font-bold">P{page.pageIndex + 1}</span>
                    </div>
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>

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

              <Button className="w-full py-6 text-lg font-bold shadow-xl" onClick={generateStudioPDF} disabled={isProcessing}>
                {isProcessing ? "Processing Document..." : "Generate Final PDF"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {outputFile && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Output File</CardTitle>
            <CardDescription>Your studio composition is ready for download</CardDescription>
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
                  onClick={() => onOpenPreview({ pdfBytes: outputFile.pdfBytes, fileName: outputFile.name, title: "Studio Composition Preview" })}
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
          </CardContent>
        </Card>
      )}
    </>
  )
}
