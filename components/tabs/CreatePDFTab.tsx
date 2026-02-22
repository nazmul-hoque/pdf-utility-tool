"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { FileCard } from "@/components/FileCard"
import { DropZone } from "@/components/DropZone"
import { buildFileItems } from "@/lib/file-utils"
import { PDFProcessor, type ProcessingProgress } from "@/lib/pdf-utils"
import { formatFileSize } from "@/lib/utils"
import type { FileItem } from "@/lib/types"
import { Download, Eye, FileText, ImageIcon } from "lucide-react"

interface CreatePDFTabProps {
  onOpenPreview: (params: { file?: File | null; pdfBytes?: Uint8Array | null; fileName?: string; title?: string }) => void
}

export function CreatePDFTab({ onOpenPreview }: CreatePDFTabProps) {
  const [createFiles, setCreateFiles] = useState<FileItem[]>([])
  const [textContent, setTextContent] = useState("")
  const [outputFile, setOutputFile] = useState<FileItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const items = await buildFileItems(files, "create")
    setCreateFiles((prev) => [...prev, ...items])
  }

  const processCreate = async () => {
    setIsProcessing(true)
    setProcessingProgress(null)
    setOutputFile(null)

    try {
      const onProgress = (p: ProcessingProgress) => setProcessingProgress(p)
      let pdfBytes: Uint8Array
      let filename: string

      if (createFiles.length > 0) {
        const imageFiles = createFiles.filter((f) => f.file && f.type === "image").map((f) => f.file!)
        if (imageFiles.length === 0) throw new Error("No valid image files found. Supported: PNG, JPG, JPEG, GIF, BMP, WebP")
        try {
          pdfBytes = await PDFProcessor.createPDFFromImages(imageFiles, onProgress)
          filename = "created-from-images.pdf"
        } catch (error) {
          throw new Error(`Failed to create PDF from images: ${error instanceof Error ? error.message : "Possible format issue"}`)
        }
      } else if (textContent.trim()) {
        pdfBytes = await PDFProcessor.createPDFFromText(textContent.trim(), onProgress)
        filename = "created-from-text.pdf"
      } else {
        throw new Error("No content to create PDF from")
      }

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
          <CardTitle>Create PDF from Images or Text</CardTitle>
          <CardDescription>Upload images or enter text to generate a PDF document</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Upload Images</Label>
              <DropZone accept="image/*" onFilesSelected={handleFiles}>
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Drop images here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </DropZone>
            </div>
            <div className="space-y-4">
              <Label htmlFor="text-content">Or Enter Text</Label>
              <Textarea
                id="text-content"
                placeholder="Enter your text content here..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </div>

          {createFiles.length > 0 && (
            <div className="space-y-4">
              <Label>Uploaded Files</Label>
              <div className="grid gap-3">
                {createFiles.map((file, index) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    section="create"
                    index={index}
                    totalCount={createFiles.length}
                    onPreview={(f, title) => onOpenPreview({ file: f, fileName: f.name, title })}
                    onRemove={(id) => setCreateFiles((prev) => prev.filter((f) => f.id !== id))}
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={processCreate}
            disabled={isProcessing || (createFiles.length === 0 && !textContent.trim())}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isProcessing ? "Creating PDF..." : "Create PDF"}
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
            <CardDescription>Your processed PDF is ready for download</CardDescription>
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
                  onClick={() => onOpenPreview({ pdfBytes: outputFile.pdfBytes, fileName: outputFile.name, title: "Processed PDF Preview" })}
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
