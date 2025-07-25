"use client"

import type React from "react"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Upload,
  FileText,
  Merge,
  Minimize2,
  Plus,
  Trash2,
  Download,
  Eye,
  ImageIcon,
  FileImage,
  FileSpreadsheet,
  Scissors,
  RotateCw,
  Lock,
  Type,
  Settings,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { PDFProcessor, type ProcessingProgress } from "@/lib/pdf-utils"
import { PDFPreviewModal } from "@/components/pdf-preview-modal"

interface FileItem {
  id: string
  name: string
  size: number
  pages?: number
  type: "pdf" | "image"
  status: "complete" | "error"
  file?: File
  pdfBytes?: Uint8Array
  isEncrypted?: boolean
}

export default function PDFUtilityTool() {
  const [createFiles, setCreateFiles] = useState<FileItem[]>([])
  const [mergeFiles, setMergeFiles] = useState<FileItem[]>([])
  const [compressFile, setCompressFile] = useState<FileItem | null>(null)
  const [convertFile, setConvertFile] = useState<FileItem | null>(null)
  const [textContent, setTextContent] = useState("")
  const [outputFile, setOutputFile] = useState<FileItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  
  // Advanced PDF operations state
  const [advancedFile, setAdvancedFile] = useState<FileItem | null>(null)
  const [advancedOperation, setAdvancedOperation] = useState<string>("")
  const [splitRanges, setSplitRanges] = useState<string>("1-3,4-6,7-10")
  const [extractPages, setExtractPages] = useState<string>("1,3,5")
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({})
  const [password, setPassword] = useState<string>("")
  const [advancedOutput, setAdvancedOutput] = useState<FileItem[] | FileItem | string | null>(null)
  
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    file?: File | null
    pdfBytes?: Uint8Array | null
    fileName?: string
    title?: string
  }>({
    isOpen: false,
    file: null,
    pdfBytes: null,
    fileName: "",
    title: "",
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Update the handleFileUpload function
  const handleFileUpload = async (files: FileList | null, section: "create" | "merge" | "compress" | "convert") => {
    if (!files) return

    const newFiles: FileItem[] = []
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB limit
    const MAX_TOTAL_FILES = 20 // Maximum number of files

    // Validate total number of files
    if (files.length > MAX_TOTAL_FILES) {
      alert(`Maximum ${MAX_TOTAL_FILES} files allowed at once for security reasons.`)
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum file size is 50MB for security reasons.`)
        continue
      }

      // Validate file type based on section
      const allowedTypes = {
        create: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'],
        merge: ['application/pdf'],
        compress: ['application/pdf'],
        convert: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/html']
      }

      if (!allowedTypes[section].includes(file.type)) {
        alert(`File "${file.name}" has an unsupported file type for the ${section} section.`)
        continue
      }

      // Additional security check: validate file extension matches MIME type
      const getFileExtension = (filename: string) => filename.split('.').pop()?.toLowerCase() || ''
      const extension = getFileExtension(file.name)
      
      const validExtensions: Record<string, string[]> = {
        'application/pdf': ['pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
        'text/plain': ['txt'],
        'text/html': ['html', 'htm'],
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/gif': ['gif'],
        'image/bmp': ['bmp'],
        'image/webp': ['webp']
      }

      if (validExtensions[file.type] && !validExtensions[file.type].includes(extension)) {
        alert(`File "${file.name}" has a suspicious file extension that doesn't match its type.`)
        continue
      }

      let pages = 1
      let isEncrypted = false

      // Get actual page count for PDFs
      if (file.type === "application/pdf") {
        try {
          const pdfInfo = await PDFProcessor.getPDFInfo(file)
          pages = pdfInfo.pages || 1
          isEncrypted = pdfInfo.isEncrypted || false
        } catch (error) {
          console.warn(`Could not get info for PDF "${file.name}":`, error)
          // Default to 1 page if we can't get info
          pages = 1
          isEncrypted = false
        }
      }

      const fileItem: FileItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        pages,
        type: file.type.includes("pdf") ? "pdf" : "image",
        status: "complete",
        file, // Store the actual file
        isEncrypted,
      }

      newFiles.push(fileItem)
    }

    if (section === "create") {
      setCreateFiles((prev) => [...prev, ...newFiles])
    } else if (section === "merge") {
      setMergeFiles((prev) => [...prev, ...newFiles])
    } else if (section === "compress" && newFiles.length > 0) {
      setCompressFile(newFiles[0])
    } else if (section === "convert" && newFiles.length > 0) {
      setConvertFile(newFiles[0])
    }
  }

  const removeFile = (id: string, section: "create" | "merge" | "compress" | "convert") => {
    if (section === "create") {
      setCreateFiles((prev) => prev.filter((f) => f.id !== id))
    } else if (section === "merge") {
      setMergeFiles((prev) => prev.filter((f) => f.id !== id))
    } else if (section === "compress") {
      setCompressFile(null)
    } else if (section === "convert") {
      setConvertFile(null)
    }
  }

  // Add reordering functions for merge files
  const moveFileUp = (index: number) => {
    if (index > 0) {
      setMergeFiles((prev) => {
        const newFiles = [...prev]
        const temp = newFiles[index]
        newFiles[index] = newFiles[index - 1]
        newFiles[index - 1] = temp
        return newFiles
      })
    }
  }

  const moveFileDown = (index: number) => {
    setMergeFiles((prev) => {
      if (index < prev.length - 1) {
        const newFiles = [...prev]
        const temp = newFiles[index]
        newFiles[index] = newFiles[index + 1]
        newFiles[index + 1] = temp
        return newFiles
      }
      return prev
    })
  }

  const reorderFiles = (fromIndex: number, toIndex: number) => {
    setMergeFiles((prev) => {
      const newFiles = [...prev]
      const [movedFile] = newFiles.splice(fromIndex, 1)
      newFiles.splice(toIndex, 0, movedFile)
      return newFiles
    })
  }

  const processFiles = async (action: "create" | "merge" | "compress") => {
    setIsProcessing(true)
    setProcessingProgress(null)
    setOutputFile(null)

    try {
      let pdfBytes: Uint8Array
      let filename: string

      const onProgress = (progress: ProcessingProgress) => {
        setProcessingProgress(progress)
      }

      switch (action) {
        case "create":
          if (createFiles.length > 0) {
            // Create PDF from images
            const imageFiles = createFiles.filter((f) => f.file && f.type === "image").map((f) => f.file!)

            if (imageFiles.length > 0) {
              pdfBytes = await PDFProcessor.createPDFFromImages(imageFiles, onProgress)
              filename = "created-from-images.pdf"
            } else {
              throw new Error("No valid image files found")
            }
          } else if (textContent.trim()) {
            // Create PDF from text
            pdfBytes = await PDFProcessor.createPDFFromText(textContent.trim(), onProgress)
            filename = "created-from-text.pdf"
          } else {
            throw new Error("No content to create PDF from")
          }
          break

        case "merge":
          const pdfFiles = mergeFiles.filter((f) => f.file && f.type === "pdf").map((f) => f.file!)

          if (pdfFiles.length < 2) {
            throw new Error("At least 2 PDF files are required for merging")
          }

          pdfBytes = await PDFProcessor.mergePDFs(pdfFiles, onProgress)
          filename = "merged-document.pdf"
          break

        case "compress":
          if (!compressFile?.file) {
            throw new Error("No PDF file selected for compression")
          }

          pdfBytes = await PDFProcessor.compressPDF(compressFile.file, onProgress)
          filename = `compressed-${compressFile.name}`
          break

        default:
          throw new Error("Invalid action")
      }

      // Create output file info
      const outputFileInfo: FileItem = {
        id: "output-" + Date.now(),
        name: filename,
        size: pdfBytes.length,
        pages: action === "merge" ? mergeFiles.reduce((acc, f) => acc + (f.pages || 0), 0) : 1, // We'd need to parse the PDF to get exact page count
        type: "pdf",
        status: "complete",
        pdfBytes, // Store the PDF bytes for download
      }

      setOutputFile(outputFileInfo)
    } catch (error) {
      let errorMessage = "An unknown error occurred"
      
      if (error instanceof Error) {
        // Handle specific PDF corruption errors with user-friendly messages
        if (error.message.includes("corrupted") || 
            error.message.includes("invalid structure") ||
            error.message.includes("Expected instance of PDFDict")) {
          errorMessage = "One or more PDF files are corrupted or have an invalid structure. Please try with different PDF files."
        } else if (error.message.includes("encrypted") || 
                   error.message.includes("password-protected")) {
          errorMessage = "One or more PDF files are password-protected. Please remove the password protection and try again."
        } else {
          errorMessage = error.message
        }
      }
      
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleConvertDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleFileUpload(files, "convert")
  }

  const handleConvertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    handleFileUpload(files, "convert")
  }

  const handleConvertDocument = async () => {
    if (!convertFile?.file) return

    setIsProcessing(true)
    setProcessingProgress(null)
    setOutputFile(null)

    try {
      const onProgress = (progress: ProcessingProgress) => {
        setProcessingProgress(progress)
      }

      const pdfBytes = await PDFProcessor.convertDocumentToPDF(convertFile.file, onProgress)
      const filename = `converted-${convertFile.name.split('.')[0]}.pdf`

      // Create output file info
      const outputFileInfo: FileItem = {
        id: "output-" + Date.now(),
        name: filename,
        size: pdfBytes.length,
        pages: 1, // Converted documents typically result in single or multiple pages
        type: "pdf",
        status: "complete",
        pdfBytes, // Store the PDF bytes for download
      }

      setOutputFile(outputFileInfo)
    } catch (error) {
      let errorMessage = "An unknown error occurred"
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadOutput = () => {
    if (outputFile?.pdfBytes) {
      PDFProcessor.downloadPDF(outputFile.pdfBytes, outputFile.name)
    }
  }

  // Advanced PDF Operations Handlers
  const handleAdvancedDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleAdvancedFileSelect(files)
  }

  const handleAdvancedFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (file.type !== "application/pdf") {
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: "Please select a PDF file for advanced operations",
      })
      return
    }

    try {
      // Get PDF metadata to show pages and encryption status
      const metadata = await PDFProcessor.getPDFMetadata(file)
      
      const fileItem: FileItem = {
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        pages: metadata.pages,
        type: "pdf",
        status: "complete",
        file,
        isEncrypted: metadata.isEncrypted,
      }

      setAdvancedFile(fileItem)
      setAdvancedOutput(null)
      setPageRotations({}) // Reset page rotations for new file
    } catch (error) {
      console.error('Error loading advanced file:', error)
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load PDF file",
      })
    }
  }

  const parsePageRanges = (rangesStr: string, totalPages: number): Array<{startPage: number, endPage: number, filename?: string}> => {
    const ranges = rangesStr.split(',').map(r => r.trim())
    const result: Array<{startPage: number, endPage: number, filename?: string}> = []

    for (const range of ranges) {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(p => parseInt(p.trim()))
        if (start && end && start <= totalPages && end <= totalPages && start <= end) {
          result.push({startPage: start, endPage: end})
        }
      } else {
        const page = parseInt(range)
        if (page && page <= totalPages) {
          result.push({startPage: page, endPage: page})
        }
      }
    }

    return result
  }

  const parsePageNumbers = (pagesStr: string, totalPages: number): number[] => {
    const parts = pagesStr.split(',').map(p => p.trim())
    const result: number[] = []

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(p => parseInt(p.trim()))
        if (start && end && start <= totalPages && end <= totalPages && start <= end) {
          for (let i = start; i <= end; i++) {
            if (!result.includes(i)) result.push(i)
          }
        }
      } else {
        const page = parseInt(part)
        if (page && page <= totalPages && !result.includes(page)) {
          result.push(page)
        }
      }
    }

    return result.sort((a, b) => a - b)
  }

  const parseRotations = (rotations: Record<number, number>, totalPages: number): Array<{pageNumber: number, operation: 'rotate', rotation: 0 | 90 | 180 | 270}> => {
    const result: Array<{pageNumber: number, operation: 'rotate', rotation: 0 | 90 | 180 | 270}> = []

    for (const [pageStr, rotation] of Object.entries(rotations)) {
      const page = parseInt(pageStr)
      
      // Include all valid rotations (0, 90, 180, 270) - we don't skip 0 since user might want to reset a rotated page
      if (page && page <= totalPages && [0, 90, 180, 270].includes(rotation)) {
        result.push({pageNumber: page, operation: 'rotate', rotation: rotation as 0 | 90 | 180 | 270})
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
      const onProgress = (progress: ProcessingProgress) => {
        setProcessingProgress(progress)
      }

      let result: any = null

      switch (advancedOperation) {
        case 'split':
          if (!advancedFile.pages) throw new Error('Unable to determine PDF page count')
          const splitRangesData = parsePageRanges(splitRanges, advancedFile.pages)
          if (splitRangesData.length === 0) throw new Error('No valid page ranges specified')
          
          const splitResults = await PDFProcessor.splitPDF(advancedFile.file, splitRangesData, onProgress)
          result = splitResults.map(split => ({
            id: Date.now().toString() + Math.random(),
            name: split.name,
            size: split.bytes.length,
            pages: undefined, // Would need to calculate
            type: "pdf" as const,
            status: "complete" as const,
            pdfBytes: split.bytes,
          }))
          break

        case 'extract':
          if (!advancedFile.pages) throw new Error('Unable to determine PDF page count')
          const pageNumbers = parsePageNumbers(extractPages, advancedFile.pages)
          if (pageNumbers.length === 0) throw new Error('No valid page numbers specified')
          
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

        case 'rotate':
          if (!advancedFile.pages) throw new Error('Unable to determine PDF page count')
          const rotationData = parseRotations(pageRotations, advancedFile.pages)
          if (rotationData.length === 0) throw new Error('No pages selected for rotation. Please select at least one page to rotate.')
          
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

        case 'password':
          if (!password.trim()) throw new Error('Password is required')
          
          const protectedBytes = await PDFProcessor.addPasswordToPDF(advancedFile.file, password, undefined, onProgress)
          result = {
            id: Date.now().toString(),
            name: `protected_${advancedFile.name}`,
            size: protectedBytes.length,
            pages: advancedFile.pages,
            type: "pdf" as const,
            status: "complete" as const,
            pdfBytes: protectedBytes,
          }
          break

        case 'extract-text':
          const extractedText = await PDFProcessor.extractTextFromPDF(advancedFile.file, onProgress)
          result = extractedText
          break

        case 'metadata':
          const metadata = await PDFProcessor.getPDFMetadata(advancedFile.file)
          result = metadata
          break

        default:
          throw new Error('Invalid operation selected')
      }

      setAdvancedOutput(result)
      setProcessingProgress({
        progress: 100,
        status: "complete",
        message: "Operation completed successfully!",
      })
    } catch (error) {
      console.error('Advanced operation error:', error)
      let errorMessage = "An unknown error occurred"
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setProcessingProgress({
        progress: 0,
        status: "error",
        message: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const previewFile = (file: File, title = "PDF Preview") => {
    setPreviewModal({
      isOpen: true,
      file,
      pdfBytes: null,
      fileName: file.name,
      title,
    })
  }

  const previewOutput = () => {
    if (outputFile?.pdfBytes) {
      setPreviewModal({
        isOpen: true,
        file: null,
        pdfBytes: outputFile.pdfBytes,
        fileName: outputFile.name,
        title: "Processed PDF Preview",
      })
    }
  }

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      file: null,
      pdfBytes: null,
      fileName: "",
      title: "",
    })
  }

  // Update the FileCard component to show encryption status
  const FileCard = ({
    file,
    section,
    index,
  }: { file: FileItem; section: "create" | "merge" | "compress"; index?: number }) => (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {/* Drag handle and reorder controls for merge section */}
        {section === "merge" && index !== undefined && (
          <div className="flex flex-col items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveFileUp(index)}
                disabled={index === 0}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => moveFileDown(index)}
                disabled={index === mergeFiles.length - 1}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex-shrink-0">
          {file.type === "pdf" ? (
            <FileText className="h-8 w-8 text-red-500" />
          ) : (
            <FileImage className="h-8 w-8 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {section === "merge" && index !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                #{index + 1}
              </Badge>
            </div>
          )}
          <p className="text-sm font-medium truncate">{file.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            {file.pages && <span>• {file.pages} pages</span>}
            {file.isEncrypted && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                🔒 Encrypted
              </Badge>
            )}
          </div>
          {file.isEncrypted && (
            <p className="text-xs text-orange-600 mt-1">This PDF is encrypted but will be processed automatically</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {file.status === "complete" && (
            <Badge variant="secondary" className="text-xs">
              Ready
            </Badge>
          )}
          {file.type === "pdf" && file.file && file.status === "complete" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => previewFile(file.file!, "PDF Preview")}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeFile(file.id, section)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )

  const DropZone = ({
    section,
    accept,
    children,
  }: { section: "create" | "merge" | "compress"; accept: string; children: React.ReactNode }) => (
    <div
      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
      onDrop={(e) => {
        e.preventDefault()
        handleFileUpload(e.dataTransfer.files, section)
      }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => {
        const input = document.createElement("input")
        input.type = "file"
        input.accept = accept
        input.multiple = section !== "compress"
        input.onchange = (e) => handleFileUpload((e.target as HTMLInputElement).files, section)
        input.click()
      }}
    >
      {children}
    </div>
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-2 sm:px-4 py-4 md:py-8 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">PDF Utility Tool</h1>
              <p className="text-sm md:text-base text-muted-foreground">Create, merge, compress PDFs and convert documents (Word, Excel, Text, HTML) to PDF with ease</p>
            </div>
            <div className="flex items-center gap-4 self-start sm:self-auto">
              <ThemeSwitcher />
            </div>
          </div>

          <Tabs defaultValue="create" className="space-y-6">
            <div className="w-full overflow-x-auto">
              <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-full md:grid md:w-full md:grid-cols-5">
                <TabsTrigger value="create" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <Plus className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Create PDF</span>
                  <span className="sm:hidden">Create</span>
                </TabsTrigger>
                <TabsTrigger value="merge" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <Merge className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Merge PDFs</span>
                  <span className="sm:hidden">Merge</span>
                </TabsTrigger>
                <TabsTrigger value="compress" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <Minimize2 className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Compress PDF</span>
                  <span className="sm:hidden">Compress</span>
                </TabsTrigger>
                <TabsTrigger value="convert" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <FileSpreadsheet className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Convert to PDF</span>
                  <span className="sm:hidden">Convert</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                  <FileText className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Advanced PDF</span>
                  <span className="sm:hidden">Advanced</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Create PDF Tab */}
            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create PDF from Images or Text</CardTitle>
                  <CardDescription>Upload images or enter text to generate a PDF document</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label>Upload Images</Label>
                      <DropZone section="create" accept="image/*">
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
                          <FileCard key={file.id} file={file} section="create" index={index} />
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => processFiles("create")}
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
            </TabsContent>

            {/* Merge PDFs Tab */}
            <TabsContent value="merge" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Merge Multiple PDFs</CardTitle>
                  <CardDescription>Upload multiple PDF files and reorder them before merging. Use the arrow buttons or drag handle to change the order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <DropZone section="merge" accept=".pdf">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Drop PDF files here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </DropZone>

                  {mergeFiles.length > 0 && (
                    <div className="space-y-4">
                      <Label>PDF Files ({mergeFiles.length})</Label>
                      <div className="grid gap-3">
                        {mergeFiles.map((file, index) => (
                          <FileCard key={file.id} file={file} section="merge" index={index} />
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => processFiles("merge")}
                    disabled={isProcessing || mergeFiles.length < 2}
                    className="w-full"
                  >
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
            </TabsContent>

            {/* Compress PDF Tab */}
            <TabsContent value="compress" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compress PDF</CardTitle>
                  <CardDescription>Upload a PDF file to reduce its file size</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <DropZone section="compress" accept=".pdf">
                    <Minimize2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Drop PDF file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </DropZone>

                  {compressFile && (
                    <div className="space-y-4">
                      <Label>Selected File</Label>
                      <FileCard file={compressFile} section="compress" />
                    </div>
                  )}

                  <Button
                    onClick={() => processFiles("compress")}
                    disabled={isProcessing || !compressFile}
                    className="w-full"
                  >
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
            </TabsContent>

            {/* Convert Documents to PDF Tab */}
            <TabsContent value="convert" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Convert Documents to PDF</CardTitle>
                  <CardDescription>Convert Word, Excel, Text, and HTML files to PDF format</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                    onDrop={handleConvertDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById("convert-file-input")?.click()}
                  >
                    <input
                      id="convert-file-input"
                      type="file"
                      accept=".docx,.xlsx,.xls,.txt,.html,.htm"
                      onChange={handleConvertFileChange}
                      className="hidden"
                    />
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Drop your document here</h3>
                    <p className="text-muted-foreground mb-4">
                      or click to browse files
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Supported: Word (.docx), Excel (.xlsx, .xls), Text (.txt), HTML (.html, .htm)
                    </p>
                  </div>

                  {convertFile && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                            {convertFile.name.endsWith('.docx') && <FileText className="h-4 w-4 text-blue-600" />}
                            {(convertFile.name.endsWith('.xlsx') || convertFile.name.endsWith('.xls')) && <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                            {convertFile.name.endsWith('.txt') && <FileText className="h-4 w-4 text-gray-600" />}
                            {(convertFile.name.endsWith('.html') || convertFile.name.endsWith('.htm')) && <FileText className="h-4 w-4 text-orange-600" />}
                          </div>
                          <div>
                            <p className="font-medium">{convertFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(convertFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={convertFile.status === "complete" ? "default" : "destructive"}>
                            {convertFile.status === "complete" ? "Ready" : "Error"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConvertFile(null)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Button
                        onClick={handleConvertDocument}
                        disabled={!convertFile || isProcessing}
                        className="w-full"
                      >
                        {isProcessing ? "Converting..." : "Convert to PDF"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced PDF Operations Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Advanced PDF Operations</CardTitle>
                  <CardDescription>Split, extract, rotate pages, add password protection, or extract text</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload */}
                  <div className="space-y-4">
                    <Label>Upload PDF for Advanced Operations</Label>
                    <div
                      onDrop={(e) => handleAdvancedDrop(e)}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById("advanced-upload")?.click()}
                    >
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        {advancedFile ? "Replace PDF file" : "Upload PDF file"}
                      </p>
                      <p className="text-muted-foreground">
                        Drag and drop your PDF file here, or click to browse
                      </p>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdvancedFile(null)}
                        >
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
                        <Button
                          variant={advancedOperation === "split" ? "default" : "outline"}
                          onClick={() => setAdvancedOperation("split")}
                          className="flex items-center gap-2 h-auto p-4"
                        >
                          <Scissors className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Split PDF</div>
                            <div className="text-xs text-muted-foreground">By page ranges</div>
                          </div>
                        </Button>
                        
                        <Button
                          variant={advancedOperation === "extract" ? "default" : "outline"}
                          onClick={() => setAdvancedOperation("extract")}
                          className="flex items-center gap-2 h-auto p-4"
                        >
                          <FileText className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Extract Pages</div>
                            <div className="text-xs text-muted-foreground">Specific pages</div>
                          </div>
                        </Button>
                        
                        <Button
                          variant={advancedOperation === "rotate" ? "default" : "outline"}
                          onClick={() => setAdvancedOperation("rotate")}
                          className="flex items-center gap-2 h-auto p-4"
                        >
                          <RotateCw className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Rotate Pages</div>
                            <div className="text-xs text-muted-foreground">90°, 180°, 270°</div>
                          </div>
                        </Button>
                        
                        <Button
                          variant={advancedOperation === "password" ? "default" : "outline"}
                          onClick={() => setAdvancedOperation("password")}
                          className="flex items-center gap-2 h-auto p-4"
                        >
                          <Lock className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Add Password</div>
                            <div className="text-xs text-muted-foreground">Protect PDF</div>
                          </div>
                        </Button>
                        
                        <Button
                          variant={advancedOperation === "extract-text" ? "default" : "outline"}
                          onClick={() => setAdvancedOperation("extract-text")}
                          className="flex items-center gap-2 h-auto p-4"
                        >
                          <Type className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">Extract Text</div>
                            <div className="text-xs text-muted-foreground">Get text content</div>
                          </div>
                        </Button>
                        
                        <Button
                          variant={advancedOperation === "metadata" ? "default" : "outline"}
                          onClick={() => setAdvancedOperation("metadata")}
                          className="flex items-center gap-2 h-auto p-4"
                        >
                          <Settings className="h-5 w-5" />
                          <div className="text-left">
                            <div className="font-medium">View Metadata</div>
                            <div className="text-xs text-muted-foreground">PDF information</div>
                          </div>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Operation-specific Inputs */}
                  {advancedFile && advancedOperation && (
                    <div className="space-y-4">
                      {advancedOperation === "split" && (
                        <div className="space-y-2">
                          <Label htmlFor="split-ranges">
                            Page Ranges (e.g., "1-3,4-6,7-10")
                          </Label>
                          <Input
                            id="split-ranges"
                            value={splitRanges}
                            onChange={(e) => setSplitRanges(e.target.value)}
                            placeholder="1-3,4-6,7-10"
                          />
                          <p className="text-xs text-muted-foreground">
                            Separate multiple ranges with commas. Each range will create a separate PDF file.
                          </p>
                        </div>
                      )}

                      {advancedOperation === "extract" && (
                        <div className="space-y-2">
                          <Label htmlFor="extract-pages">
                            Page Numbers (e.g., "1,3,5,7-9")
                          </Label>
                          <Input
                            id="extract-pages"
                            value={extractPages}
                            onChange={(e) => setExtractPages(e.target.value)}
                            placeholder="1,3,5,7-9"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter specific page numbers or ranges separated by commas.
                          </p>
                        </div>
                      )}

                      {advancedOperation === "rotate" && (
                        <div className="space-y-4">
                          <Label>Select Pages to Rotate</Label>
                          <p className="text-sm text-muted-foreground">
                            Click on the rotation buttons for each page you want to rotate. The arrow shows the current rotation.
                          </p>
                          
                          {advancedFile.pages && advancedFile.pages > 0 && (
                            <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Array.from({ length: Math.min(advancedFile.pages, 50) }, (_, i) => {
                                  const pageNum = i + 1
                                  const currentRotation = pageRotations[pageNum] || 0
                                  
                                  return (
                                    <div key={pageNum} className="border rounded-lg p-3 bg-muted/30">
                                      <div className="text-center mb-3">
                                        <div className="text-sm font-medium mb-1">Page {pageNum}</div>
                                        <div className="w-12 h-16 mx-auto bg-white border border-gray-300 rounded shadow-sm flex items-center justify-center relative">
                                          <FileText 
                                            className="h-6 w-6 text-gray-400"
                                            style={{
                                              transform: `rotate(${currentRotation}deg)`,
                                              transition: 'transform 0.2s ease'
                                            }}
                                          />
                                          {currentRotation > 0 && (
                                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                              {currentRotation}°
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-4 gap-1">
                                        <Button
                                          variant={currentRotation === 0 ? "default" : "outline"}
                                          size="sm"
                                          className="h-8 p-1"
                                          onClick={() => {
                                            setPageRotations(prev => {
                                              const newRotations = { ...prev }
                                              delete newRotations[pageNum] // Remove from rotations (defaults to 0)
                                              return newRotations
                                            })
                                          }}
                                          title="No rotation (0°)"
                                        >
                                          <div className="text-xs">0°</div>
                                        </Button>
                                        
                                        <Button
                                          variant={currentRotation === 90 ? "default" : "outline"}
                                          size="sm"
                                          className="h-8 p-1"
                                          onClick={() => {
                                            setPageRotations(prev => ({
                                              ...prev,
                                              [pageNum]: 90
                                            }))
                                          }}
                                          title="Rotate 90° clockwise"
                                        >
                                          <RotateCw className="h-3 w-3" />
                                        </Button>
                                        
                                        <Button
                                          variant={currentRotation === 180 ? "default" : "outline"}
                                          size="sm"
                                          className="h-8 p-1"
                                          onClick={() => {
                                            setPageRotations(prev => ({
                                              ...prev,
                                              [pageNum]: 180
                                            }))
                                          }}
                                          title="Rotate 180°"
                                        >
                                          <div className="text-xs">180°</div>
                                        </Button>
                                        
                                        <Button
                                          variant={currentRotation === 270 ? "default" : "outline"}
                                          size="sm"
                                          className="h-8 p-1"
                                          onClick={() => {
                                            setPageRotations(prev => ({
                                              ...prev,
                                              [pageNum]: 270
                                            }))
                                          }}
                                          title="Rotate 270° clockwise (90° counter-clockwise)"
                                        >
                                          <div className="text-xs">270°</div>
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              
                              {advancedFile.pages > 50 && (
                                <div className="text-center mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-sm text-yellow-800">
                                    Only showing first 50 pages. For PDFs with more pages, 
                                    consider using the split feature first.
                                  </p>
                                </div>
                              )}
                              
                              {Object.keys(pageRotations).length > 0 && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-blue-800">
                                        {Object.keys(pageRotations).length} pages selected for rotation
                                      </p>
                                      <p className="text-xs text-blue-600">
                                        {Object.entries(pageRotations)
                                          .map(([page, rotation]) => `Page ${page}: ${rotation}°`)
                                          .join(', ')}
                                      </p>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setPageRotations({})}
                                    >
                                      Clear All
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {advancedOperation === "password" && (
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password to protect PDF"
                          />
                          <p className="text-xs text-muted-foreground">
                            Note: Browser-based password protection has limitations compared to server-side encryption.
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={processAdvancedOperation}
                        disabled={isProcessing || !advancedFile || !advancedOperation}
                        className="w-full"
                      >
                        {isProcessing ? (
                          <>Processing...</>
                        ) : (
                          <>
                            Process {advancedOperation === "extract-text" ? "Text Extraction" : 
                                   advancedOperation === "metadata" ? "Metadata" :
                                   "PDF"}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Output Section */}
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
                    <Button variant="outline" size="sm" onClick={previewOutput}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button size="sm" onClick={downloadOutput}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advanced Operations Results */}
          {advancedOutput && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>
                  {advancedOperation === 'extract-text' ? 'Extracted Text' :
                   advancedOperation === 'metadata' ? 'PDF Metadata' :
                   advancedOperation === 'split' ? 'Split Results' :
                   'Operation Result'}
                </CardTitle>
                <CardDescription>
                  {advancedOperation === 'extract-text' ? 'Text content from your PDF' :
                   advancedOperation === 'metadata' ? 'Document information and properties' :
                   advancedOperation === 'split' ? 'Multiple PDF files created' :
                   'Your processed PDF is ready'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Text Extraction Results */}
                {advancedOperation === 'extract-text' && typeof advancedOutput === 'string' && (
                  <div className="space-y-4">
                    <Textarea
                      value={advancedOutput}
                      readOnly
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Extracted text will appear here..."
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(advancedOutput)
                          // You could add a toast notification here
                        }}
                      >
                        <Type className="h-4 w-4 mr-2" />
                        Copy Text
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([advancedOutput], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `extracted_text_${advancedFile?.name.replace('.pdf', '.txt')}`
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

                {/* Metadata Results */}
                {advancedOperation === 'metadata' && typeof advancedOutput === 'object' && advancedOutput !== null && !Array.isArray(advancedOutput) && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(advancedOutput).map(([key, value]) => (
                        <div key={key} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium capitalize mb-1">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {value !== undefined && value !== null ? 
                              (key === 'size' ? formatFileSize(value as number) : 
                               key === 'isEncrypted' ? (value ? 'Yes' : 'No') :
                               String(value)) : 
                              'Not available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Split Results (Multiple Files) */}
                {advancedOperation === 'split' && Array.isArray(advancedOutput) && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {advancedOutput.length} PDF files created from split operation
                    </p>
                    <div className="space-y-2">
                      {advancedOutput.map((file, index) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-blue-500" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const timestamp = Date.now()
                                setPreviewModal({
                                  isOpen: true,
                                  file: null,
                                  pdfBytes: file.pdfBytes,
                                  fileName: `${file.name}?t=${timestamp}`,
                                  title: `Preview: ${file.name}`,
                                })
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (file.pdfBytes) {
                                  PDFProcessor.downloadPDF(file.pdfBytes, file.name)
                                }
                              }}
                            >
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
                        // Download all files as a zip would be ideal, but for simplicity, download one by one
                        advancedOutput.forEach((file, index) => {
                          setTimeout(() => {
                            if (file.pdfBytes) {
                              PDFProcessor.downloadPDF(file.pdfBytes, file.name)
                            }
                          }, index * 1000) // Stagger downloads by 1 second
                        })
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All ({advancedOutput.length} files)
                    </Button>
                  </div>
                )}

                {/* Single PDF Result (Extract, Rotate, Password) */}
                {['extract', 'rotate', 'password'].includes(advancedOperation) && 
                 typeof advancedOutput === 'object' && 
                 advancedOutput !== null && 
                 !Array.isArray(advancedOutput) && 
                 'pdfBytes' in advancedOutput && (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium">{advancedOutput.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(advancedOutput.size)}
                          {advancedOutput.pages && ` • ${advancedOutput.pages} pages`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Create a unique identifier to force refresh
                          const timestamp = Date.now()
                          setPreviewModal({
                            isOpen: true,
                            file: null,
                            pdfBytes: advancedOutput.pdfBytes,
                            fileName: `${advancedOutput.name}?t=${timestamp}`,
                            title: `Preview: ${advancedOutput.name}`,
                          })
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (advancedOutput.pdfBytes) {
                            PDFProcessor.downloadPDF(advancedOutput.pdfBytes, advancedOutput.name)
                          }
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
        </div>
        <PDFPreviewModal
          key={previewModal.pdfBytes ? `pdf-${previewModal.fileName}-${previewModal.pdfBytes.length}` : `file-${previewModal.file?.name}-${previewModal.file?.size}`}
          isOpen={previewModal.isOpen}
          onClose={closePreviewModal}
          file={previewModal.file}
          pdfBytes={previewModal.pdfBytes}
          fileName={previewModal.fileName}
          title={previewModal.title}
        />
      </div>
    </ThemeProvider>
  )
}
