"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { PDFProcessor, type ProcessingProgress } from "@/lib/pdf-utils"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/lib/types"
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Lock,
  RotateCw,
  Scissors,
  Settings,
  Trash2,
  Type,
  Upload,
} from "lucide-react"

interface AdvancedToolsTabProps {
  onOpenPreview: (params: { file?: File | null; pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
}

type AdvancedOutput = FileItem[] | FileItem | string | null

export function AdvancedToolsTab({ onOpenPreview }: AdvancedToolsTabProps) {
  const [advancedFile, setAdvancedFile] = useState<FileItem | null>(null)
  const [advancedOperation, setAdvancedOperation] = useState<string>("")
  const [splitRanges, setSplitRanges] = useState("1-3,4-6,7-10")
  const [extractPages, setExtractPages] = useState("1,3,5")
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({})
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([])
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [advancedOutput, setAdvancedOutput] = useState<AdvancedOutput>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  const handleAdvancedDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleAdvancedFileSelect(e.dataTransfer.files)
  }

  const handleAdvancedFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.type !== "application/pdf") {
      setProcessingProgress({ progress: 0, status: "error", message: "Please select a PDF file for advanced operations" })
      return
    }
    try {
      const metadata = await PDFProcessor.getPDFMetadata(file)
      setAdvancedFile({
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        pages: metadata.pages,
        type: "pdf",
        status: "complete",
        file,
        isEncrypted: metadata.isEncrypted,
      })
      setAdvancedOutput(null)
      setPageRotations({})
      setPageThumbnails([])
    } catch (error) {
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load PDF file",
      })
    }
  }

  const parsePageRanges = (rangesStr: string, totalPages: number) => {
    const ranges = rangesStr.split(",").map((r) => r.trim())
    const result: Array<{ startPage: number; endPage: number; filename?: string }> = []
    for (const range of ranges) {
      if (range.includes("-")) {
        const [start, end] = range.split("-").map((p) => parseInt(p.trim()))
        if (start && end && start <= totalPages && end <= totalPages && start <= end) {
          result.push({ startPage: start, endPage: end })
        }
      } else {
        const page = parseInt(range)
        if (page && page <= totalPages) result.push({ startPage: page, endPage: page })
      }
    }
    return result
  }

  const parsePageNumbers = (pagesStr: string, totalPages: number): number[] => {
    const parts = pagesStr.split(",").map((p) => p.trim())
    const result: number[] = []
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map((p) => parseInt(p.trim()))
        if (start && end && start <= totalPages && end <= totalPages && start <= end) {
          for (let i = start; i <= end; i++) if (!result.includes(i)) result.push(i)
        }
      } else {
        const page = parseInt(part)
        if (page && page <= totalPages && !result.includes(page)) result.push(page)
      }
    }
    return result.sort((a, b) => a - b)
  }

  const parseRotations = (rotations: Record<number, number>, totalPages: number) => {
    const result: Array<{ pageNumber: number; operation: "rotate"; rotation: 0 | 90 | 180 | 270 }> = []
    for (const [pageStr, rotation] of Object.entries(rotations)) {
      const page = parseInt(pageStr)
      if (page && page <= totalPages && [0, 90, 180, 270].includes(rotation)) {
        result.push({ pageNumber: page, operation: "rotate", rotation: rotation as 0 | 90 | 180 | 270 })
      }
    }
    return result
  }

  const processAdvancedOperation = async () => {
    if (!advancedFile?.file || !advancedOperation) return
    setIsProcessing(true)
    setProcessingProgress(null)
    setAdvancedOutput(null)

    try {
      const onProgress = (p: ProcessingProgress) => setProcessingProgress(p)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any = null

      switch (advancedOperation) {
        case "split": {
          if (!advancedFile.pages) throw new Error("Unable to determine PDF page count")
          const splitRangesData = parsePageRanges(splitRanges, advancedFile.pages)
          if (splitRangesData.length === 0) throw new Error("No valid page ranges specified")
          const splitResults = await PDFProcessor.splitPDF(advancedFile.file, splitRangesData, onProgress)
          result = splitResults.map((split) => ({
            id: Date.now().toString() + Math.random(),
            name: split.name,
            size: split.bytes.length,
            pages: undefined,
            type: "pdf" as const,
            status: "complete" as const,
            pdfBytes: split.bytes,
          }))
          break
        }
        case "extract": {
          if (!advancedFile.pages) throw new Error("Unable to determine PDF page count")
          const pageNumbers = parsePageNumbers(extractPages, advancedFile.pages)
          if (pageNumbers.length === 0) throw new Error("No valid page numbers specified")
          const extractedBytes = await PDFProcessor.extractPages(advancedFile.file, pageNumbers, onProgress)
          result = {
            id: Date.now().toString(),
            name: `extracted_pages_${advancedFile.name}`,
            size: extractedBytes.length,
            pages: pageNumbers.length,
            type: "pdf" as const,
            status: "complete" as const,
            pdfBytes: extractedBytes,
          }
          break
        }
        case "rotate": {
          if (!advancedFile.pages) throw new Error("Unable to determine PDF page count")
          const rotationData = parseRotations(pageRotations, advancedFile.pages)
          if (rotationData.length === 0) throw new Error("No pages selected for rotation. Please select at least one page to rotate.")
          const rotatedBytes = await PDFProcessor.rotatePages(advancedFile.file, rotationData, onProgress)
          result = {
            id: Date.now().toString(),
            name: `rotated_${advancedFile.name}`,
            size: rotatedBytes.length,
            pages: advancedFile.pages,
            type: "pdf" as const,
            status: "complete" as const,
            pdfBytes: rotatedBytes,
          }
          break
        }
        case "password":
          if (!password.trim()) throw new Error("Password is required")
          await PDFProcessor.addPasswordToPDF(advancedFile.file, password, undefined, onProgress)
          break
        case "extract-text":
          result = await PDFProcessor.extractTextFromPDF(advancedFile.file, onProgress)
          break
        case "metadata":
          result = await PDFProcessor.getPDFMetadata(advancedFile.file)
          break
        default:
          throw new Error("Invalid operation selected")
      }

      setAdvancedOutput(result)
      setProcessingProgress({ progress: 100, status: "complete", message: "Operation completed successfully!" })
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

  // Generate thumbnails when rotate operation is selected
  useEffect(() => {
    if (advancedOperation !== "rotate" || !advancedFile?.file || pageThumbnails.length > 0) return
    let cancelled = false
    setThumbnailsLoading(true)
    PDFProcessor.getPageThumbnails(advancedFile.file).then((thumbs) => {
      if (!cancelled) {
        setPageThumbnails(thumbs)
        setThumbnailsLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setThumbnailsLoading(false)
    })
    return () => { cancelled = true }
  }, [advancedOperation, advancedFile?.file, pageThumbnails.length])

  return (
    <>
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader>
          <CardTitle>Advanced PDF Tools</CardTitle>
          <CardDescription>Split, extract pages, and rotate your PDF documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <Label>Upload PDF for Advanced Operations</Label>
            <div
              onDrop={handleAdvancedDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => e.preventDefault()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("advanced-upload")?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">{advancedFile ? "Replace PDF file" : "Upload PDF file"}</p>
              <p className="text-muted-foreground">Drag and drop your PDF file here, or click to browse</p>
              <input
                id="advanced-upload"
                type="file"
                accept=".pdf"
                multiple={false}
                onChange={(e) => handleAdvancedFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {advancedFile && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium">{advancedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(advancedFile.size)}
                      {advancedFile.pages && ` • ${advancedFile.pages} pages`}
                      {advancedFile.isEncrypted && (
                        <Badge variant="secondary" className="ml-2">
                          <Lock className="h-3 w-3 mr-1" />
                          Encrypted
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setAdvancedFile(null)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Operation Selection */}
          {advancedFile && (
            <div className="space-y-4">
              <Label>Select Operation</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: "split", label: "Split PDF", sub: "By page ranges", Icon: Scissors, badge: null },
                  { value: "extract", label: "Extract Pages", sub: "Specific pages", Icon: FileText, badge: null },
                  { value: "rotate", label: "Rotate Pages", sub: "90°, 180°, 270°", Icon: RotateCw, badge: null },
                  { value: "password", label: "Add Password", sub: "Not available", Icon: Lock, badge: "unavailable" },
                  { value: "extract-text", label: "Extract Text", sub: "Text PDFs only", Icon: Type, badge: "beta" },
                  { value: "metadata", label: "View Metadata", sub: "PDF information", Icon: Settings, badge: null },
                ].map(({ value, label, sub, Icon, badge }) => {
                  const isUnavailable = badge === "unavailable"
                  return (
                    <Button
                      key={value}
                      variant={advancedOperation === value ? "default" : "outline"}
                      onClick={() => !isUnavailable && setAdvancedOperation(value)}
                      disabled={isUnavailable}
                      className={`flex items-center gap-2 h-auto p-4 relative ${isUnavailable ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Icon className="h-5 w-5" />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{label}</span>
                          {badge === "beta" && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 leading-tight">Beta</Badge>
                          )}
                          {badge === "unavailable" && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 leading-tight">N/A</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{sub}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Operation-specific Inputs */}
          {advancedFile && advancedOperation && (
            <div className="space-y-4">
              {advancedOperation === "split" && (
                <div className="space-y-2">
                  <Label htmlFor="split-ranges">Page Ranges (e.g., "1-3,4-6,7-10")</Label>
                  <Input id="split-ranges" value={splitRanges} onChange={(e) => setSplitRanges(e.target.value)} placeholder="1-3,4-6,7-10" />
                  <p className="text-xs text-muted-foreground">Separate multiple ranges with commas. Each range will create a separate PDF file.</p>
                </div>
              )}

              {advancedOperation === "extract" && (
                <div className="space-y-2">
                  <Label htmlFor="extract-pages">Page Numbers (e.g., "1,3,5,7-9")</Label>
                  <Input id="extract-pages" value={extractPages} onChange={(e) => setExtractPages(e.target.value)} placeholder="1,3,5,7-9" />
                  <p className="text-xs text-muted-foreground">Enter specific page numbers or ranges separated by commas.</p>
                </div>
              )}

              {advancedOperation === "rotate" && (
                <div className="space-y-4">
                  <Label>Select Pages to Rotate</Label>
                  <p className="text-sm text-muted-foreground">Click on the rotation buttons for each page you want to rotate. The arrow shows the current rotation.</p>

                  {advancedFile.pages && advancedFile.pages > 0 && (
                    <div className="max-h-[600px] overflow-y-auto border rounded-lg p-4 bg-background/50 shadow-inner">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Array.from({ length: Math.min(advancedFile.pages, 50) }, (_, i) => {
                          const pageNum = i + 1
                          const currentRotation = pageRotations[pageNum] || 0
                          const thumbnail = pageThumbnails[pageNum - 1]
                          return (
                            <div key={pageNum} className="group relative border border-white/10 rounded-lg overflow-hidden bg-white shadow-lg hover:ring-2 hover:ring-primary/50 transition-all">
                              {/* Thumbnail */}
                              <div className="aspect-[3/4] relative overflow-hidden">
                                {thumbnail ? (
                                  <img
                                    src={thumbnail}
                                    alt={`Page ${pageNum}`}
                                    className="w-full h-full object-cover transition-transform duration-200"
                                    style={{ transform: `rotate(${currentRotation}deg)` }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                    {thumbnailsLoading ? (
                                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    ) : (
                                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                                    )}
                                  </div>
                                )}
                                {/* Page number */}
                                <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  {pageNum}
                                </div>
                                {/* Rotation badge */}
                                {currentRotation > 0 && (
                                  <div className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {currentRotation}°
                                  </div>
                                )}
                              </div>
                              {/* Rotation buttons */}
                              <div className="p-2 grid grid-cols-4 gap-1">
                                {[0, 90, 180, 270].map((deg) => (
                                  <Button
                                    key={deg}
                                    variant={currentRotation === deg ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 p-0 text-[10px]"
                                    onClick={() => {
                                      setPageRotations((prev) => {
                                        if (deg === 0) {
                                          const next = { ...prev }
                                          delete next[pageNum]
                                          return next
                                        }
                                        return { ...prev, [pageNum]: deg }
                                      })
                                    }}
                                    title={deg === 0 ? "No rotation" : `Rotate ${deg}°`}
                                  >
                                    {deg === 90 ? <RotateCw className="h-3 w-3" /> : <span>{deg}°</span>}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {advancedFile.pages > 50 && (
                        <div className="text-center mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">Only showing first 50 pages. For PDFs with more pages, consider using the split feature first.</p>
                        </div>
                      )}

                      {Object.keys(pageRotations).length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-800">{Object.keys(pageRotations).length} pages selected for rotation</p>
                              <p className="text-xs text-blue-600">
                                {Object.entries(pageRotations).map(([page, rotation]) => `Page ${page}: ${rotation}°`).join(", ")}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setPageRotations({})}>Clear All</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {advancedOperation === "password" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-600 p-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
                      <p className="font-semibold">Encryption not supported in the browser</p>
                      <p>Browser-based PDF libraries cannot apply real AES or RC4 encryption. Any file produced would open without a password in any PDF reader. Real password protection requires server-side processing.</p>
                    </div>
                  </div>
                  <Label htmlFor="password" className="text-muted-foreground">Password (disabled)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Not available — see warning above"
                    disabled
                  />
                </div>
              )}

              <Button
                onClick={processAdvancedOperation}
                disabled={isProcessing || !advancedFile || !advancedOperation || advancedOperation === "password"}
                className="w-full"
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>Process {advancedOperation === "extract-text" ? "Text Extraction" : advancedOperation === "metadata" ? "Metadata" : "PDF"}</>
                )}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Output Results */}
      {advancedOutput && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>
              {advancedOperation === "extract-text" ? "Extracted Text" :
                advancedOperation === "metadata" ? "PDF Metadata" :
                  advancedOperation === "split" ? "Split Results" :
                    "Operation Result"}
            </CardTitle>
            <CardDescription>
              {advancedOperation === "extract-text" ? "Text content from your PDF" :
                advancedOperation === "metadata" ? "Document information and properties" :
                  advancedOperation === "split" ? "Multiple PDF files created" :
                    "Your processed PDF is ready"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Text Extraction */}
            {advancedOperation === "extract-text" && typeof advancedOutput === "string" && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-600 p-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    <span className="font-semibold">Text-based PDFs only.</span> Scanned or image-based PDFs will show no content. Results may be incomplete or incorrectly ordered for complex layouts.
                  </p>
                </div>
                <Textarea value={advancedOutput} readOnly className="min-h-[200px] font-mono text-sm" placeholder="Extracted text will appear here..." />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(advancedOutput as string)}>
                    <Type className="h-4 w-4 mr-2" />
                    Copy Text
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([advancedOutput as string], { type: "text/plain" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `extracted_text_${advancedFile?.name.replace(".pdf", ".txt")}`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download as TXT
                  </Button>
                </div>
              </div>
            )}

            {/* Metadata */}
            {advancedOperation === "metadata" && typeof advancedOutput === "object" && advancedOutput !== null && !Array.isArray(advancedOutput) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(advancedOutput).map(([key, value]) => (
                  <div key={key} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium capitalize mb-1">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                    <p className="text-sm text-muted-foreground">
                      {value !== undefined && value !== null
                        ? key === "size" ? formatFileSize(value as number) : key === "isEncrypted" ? (value ? "Yes" : "No") : String(value)
                        : "Not available"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Split Results */}
            {advancedOperation === "split" && Array.isArray(advancedOutput) && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{advancedOutput.length} PDF files created from split operation</p>
                <div className="space-y-2">
                  {(advancedOutput as FileItem[]).map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-blue-500" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenPreview({ pdfBytes: file.pdfBytes, fileName: `${file.name}?t=${Date.now()}`, title: `Preview: ${file.name}` })}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button size="sm" onClick={() => file.pdfBytes && PDFProcessor.downloadPDF(file.pdfBytes, file.name)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    (advancedOutput as FileItem[]).forEach((file, index) => {
                      setTimeout(() => { if (file.pdfBytes) PDFProcessor.downloadPDF(file.pdfBytes, file.name) }, index * 1000)
                    })
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All ({(advancedOutput as FileItem[]).length} files)
                </Button>
              </div>
            )}

            {/* Single PDF Result (extract, rotate) */}
            {["extract", "rotate"].includes(advancedOperation) &&
              typeof advancedOutput === "object" &&
              advancedOutput !== null &&
              !Array.isArray(advancedOutput) &&
              "pdfBytes" in advancedOutput && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium">{(advancedOutput as FileItem).name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize((advancedOutput as FileItem).size)}
                        {(advancedOutput as FileItem).pages && ` • ${(advancedOutput as FileItem).pages} pages`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const f = advancedOutput as FileItem
                        onOpenPreview({ pdfBytes: f.pdfBytes, fileName: `${f.name}?t=${Date.now()}`, title: `Preview: ${f.name}` })
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const f = advancedOutput as FileItem
                        if (f.pdfBytes) PDFProcessor.downloadPDF(f.pdfBytes, f.name)
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
