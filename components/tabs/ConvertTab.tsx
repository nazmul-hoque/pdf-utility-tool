"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { buildFileItems } from "@/lib/file-utils"
import { PDFProcessor, type ProcessingProgress } from "@/lib/pdf-utils"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/lib/types"
import { Download, Eye, FileImage, FileSpreadsheet, FileText, Trash2 } from "lucide-react"
import { PostOperationPanel } from "@/components/PostOperationPanel"

interface ConvertTabProps {
  onOpenPreview: (params: { file?: File | null; pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
  onNavigate?: (tab: string) => void
}

export function ConvertTab({ onOpenPreview, onNavigate }: ConvertTabProps) {
  const [convertFile, setConvertFile] = useState<FileItem | null>(null)
  const [outputFile, setOutputFile] = useState<FileItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const items = await buildFileItems(files, "convert")
    if (items.length > 0) setConvertFile(items[0])
  }

  const handleConvertDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleConvertDocument = async () => {
    if (!convertFile?.file) return
    setIsProcessing(true)
    setProcessingProgress(null)
    setOutputFile(null)

    try {
      const onProgress = (p: ProcessingProgress) => setProcessingProgress(p)
      const pdfBytes = await PDFProcessor.convertDocumentToPDF(convertFile.file, onProgress)
      const filename = `converted-${convertFile.name.split(".")[0]}.pdf`

      setOutputFile({
        id: "output-" + Date.now(),
        name: filename,
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
          <CardTitle>Convert to PDF</CardTitle>
          <CardDescription>Convert Word, Excel, Images, Text or HTML to professional PDF documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onDrop={handleConvertDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("convert-file-input")?.click()}
          >
            <input
              id="convert-file-input"
              type="file"
              accept=".docx,.xlsx,.xls,.txt,.html,.htm,.png,.jpg,.jpeg,.gif,.bmp,.webp"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Drop your document here</h3>
            <p className="text-muted-foreground mb-4">or click to browse files</p>
            <p className="text-sm text-muted-foreground">Supported: Word, Excel, Images (PNG, JPG, etc.), Text, and HTML</p>
          </div>

          {convertFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                    {convertFile.name.endsWith(".docx") && <FileText className="h-4 w-4 text-blue-600" />}
                    {(convertFile.name.endsWith(".xlsx") || convertFile.name.endsWith(".xls")) && <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                    {convertFile.name.endsWith(".txt") && <FileText className="h-4 w-4 text-gray-600" />}
                    {(convertFile.name.endsWith(".html") || convertFile.name.endsWith(".htm")) && <FileText className="h-4 w-4 text-orange-600" />}
                    {convertFile.type === "image" && <FileImage className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div>
                    <p className="font-medium">{convertFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(convertFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={convertFile.status === "complete" ? "default" : "destructive"}>
                    {convertFile.status === "complete" ? "Ready" : "Error"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setConvertFile(null)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleConvertDocument} disabled={!convertFile || isProcessing} className="w-full">
                {isProcessing ? "Converting..." : "Convert to PDF"}
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

      {outputFile && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Output File</CardTitle>
            <CardDescription>Your converted PDF is ready for download</CardDescription>
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
                  onClick={() => onOpenPreview({ pdfBytes: outputFile.pdfBytes, fileName: outputFile.name, title: "Converted PDF Preview" })}
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
                sourceTab="convert"
                pdfBytes={outputFile.pdfBytes}
                fileName={outputFile.name}
                onNavigate={onNavigate}
                onReset={() => { setOutputFile(null); setConvertFile(null); setProcessingProgress(null) }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
