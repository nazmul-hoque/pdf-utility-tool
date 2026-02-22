"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download, X, FileText, Loader2 } from "lucide-react"
import { PDFFallbackViewer } from "./pdf-fallback-viewer"
import dynamic from "next/dynamic"
import { pdfjs } from "react-pdf"

// Set up PDF.js worker synchronously at module load time.
// Next.js will automatically bundle this and serve it with the proper hash/MIME type.
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
}

// Create an inline PDF viewer component to avoid chunk loading issues
const PDFViewer = dynamic(
  () => {
    return Promise.resolve().then(() => {
      if (typeof window === 'undefined') {
        // Server-side fallback
        return {
          default: () => (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">Loading PDF viewer...</span>
              </div>
            </div>
          )
        }
      }

      // Dynamic import of react-pdf on client side
      return import("react-pdf").then(async (pdfModule) => {
        const { Document, Page, pdfjs } = pdfModule
        const { useMemo } = await import("react")

        return {
          default: ({
            pdfUrl,
            onDocumentLoadSuccess,
            onDocumentLoadError,
            onPageLoadError,
            currentPage,
            scale,
            rotation,
            numPages
          }: any) => {
            // Memoize the options object to prevent unnecessary reloads
            const documentOptions = useMemo(() => ({
              cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
              verbosity: 0,
            }), [pdfjs.version])

            return (
              <Document
                key={pdfUrl ? `doc-${pdfUrl}` : 'no-doc'}
                file={pdfUrl}
                onLoadSuccess={(pdf) => {
                  onDocumentLoadSuccess?.(pdf)
                }}
                onLoadError={(error) => {
                  console.error('PDF Document: Load error:', error)
                  onDocumentLoadError?.(error)
                }}
                options={documentOptions}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-sm">Loading PDF...</span>
                    </div>
                  </div>
                }
              >
                {numPages > 0 && (
                  <Page
                    key={`page_${currentPage}_${scale}_${rotation}`}
                    pageNumber={currentPage}
                    scale={scale}
                    rotate={rotation}
                    onLoadError={onPageLoadError}
                    loading={
                      <div className="flex items-center justify-center p-8 border border-dashed border-muted-foreground/25 rounded-lg min-h-[400px] min-w-[300px]">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    }
                    className="shadow-lg border border-border rounded-lg overflow-hidden"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                )}
              </Document>
            )
          }
        }
      })
    })
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading PDF viewer...</span>
        </div>
      </div>
    ),
  }
)

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  file?: File | null
  pdfBytes?: Uint8Array | null
  fileName?: string
  title?: string
}

export function PDFPreviewModal({ isOpen, onClose, file, pdfBytes, fileName, title }: PDFPreviewModalProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const documentRef = useRef<any>(null)
  const pdfUrlRef = useRef<string | null>(null)
  const [useFallback, setUseFallback] = useState<boolean>(false)

  // Create PDF URL from bytes or file
  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal is closed
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
        pdfUrlRef.current = null
        setPdfUrl(null)
      }
      return
    }

    // Clean up previous URL
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current)
      pdfUrlRef.current = null
    }

    if (pdfBytes) {
      try {
        // Create a blob from the PDF bytes
        const blob = new Blob([pdfBytes], { type: "application/pdf" })
        const url = URL.createObjectURL(blob)
        pdfUrlRef.current = url
        setPdfUrl(url)
      } catch (error) {
        console.error("Error creating PDF blob:", error)
        setError("Failed to create PDF preview")
        setIsLoading(false)
      }
    } else if (file) {
      try {
        const url = URL.createObjectURL(file)
        pdfUrlRef.current = url
        setPdfUrl(url)
      } catch (error) {
        console.error("Error creating file URL:", error)
        setError("Failed to create PDF preview")
        setIsLoading(false)
      }
    } else {
      setPdfUrl(null)
    }
  }, [isOpen, pdfBytes, file])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1)
      setScale(1.0)
      setRotation(0)
      setIsLoading(true)
      setError(null)
      setNumPages(0)
      setUseFallback(false) // Add this line
      documentRef.current = null
    }
  }, [isOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
        pdfUrlRef.current = null
      }
    }
  }, [])

  const onDocumentLoadSuccess = useCallback((pdf: any) => {
    documentRef.current = pdf
    setNumPages(pdf.numPages)
    setCurrentPage(1)
    setIsLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("Error loading PDF:", error)
    documentRef.current = null

    // Enable fallback viewer for ArrayBuffer errors
    if (
      error.message.includes("ArrayBuffer") ||
      error.message.includes("detached") ||
      error.message.includes("postMessage")
    ) {
      setUseFallback(true)
      setIsLoading(false)
      return
    }

    if (error.message.includes("encrypted") || error.message.includes("password")) {
      setError(
        "This PDF is encrypted or password-protected. Preview may not be available, but processing should still work.",
      )
    } else if (error.message.includes("Invalid PDF")) {
      setError("Invalid PDF format. The file may be corrupted.")
    } else if (error.message.includes("Loading")) {
      setError("Failed to load PDF. Please try again.")
    } else {
      setError("Failed to load PDF. The file may be corrupted or in an unsupported format.")
    }

    setIsLoading(false)
  }, [])

  const onPageLoadError = useCallback((error: Error) => {
    console.error("Error loading page:", error)
    setError("Failed to load PDF page.")
  }, [])

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(numPages, prev + 1))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(3.0, prev + 0.25))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.25))
  }

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const resetView = () => {
    setScale(1.0)
    setRotation(0)
    setCurrentPage(1)
  }

  const downloadFile = () => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName || "document.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else if (file) {
      const url = URL.createObjectURL(file)
      const link = document.createElement("a")
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* Full-screen on mobile, centred modal on sm+ */}
      <DialogContent aria-describedby={undefined} className="flex flex-col w-full max-w-full sm:max-w-6xl p-0 h-dvh sm:h-auto sm:max-h-[90vh] overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base truncate">{title || "PDF Preview"}</DialogTitle>
                {fileName && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">{fileName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {(file || pdfBytes) && (
                <>
                  {/* Desktop: label + icon */}
                  <Button variant="outline" size="sm" onClick={downloadFile} className="hidden sm:inline-flex">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {/* Mobile: icon only */}
                  <Button variant="outline" size="icon" className="h-9 w-9 sm:hidden" onClick={downloadFile}>
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          {/* ── Toolbar — wraps on narrow screens ── */}
          <div className="flex items-center justify-between gap-2 flex-wrap px-3 sm:px-6 py-2 border-b bg-muted/30 shrink-0">
            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToPrevPage} disabled={currentPage <= 1 || !numPages}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5 mx-1">
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                  {numPages > 0 ? `${currentPage} / ${numPages}` : "…"}
                </span>
                {numPages > 0 && (
                  <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                    {numPages} pages
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={goToNextPage} disabled={currentPage >= numPages || !numPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom + rotation */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={zoomOut} disabled={scale <= 0.5 || !numPages}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium min-w-[44px] text-center">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={zoomIn} disabled={scale >= 3.0 || !numPages}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={rotate} disabled={!numPages}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={resetView} disabled={!numPages}>
                Reset
              </Button>
            </div>
          </div>

          {/* PDF Viewer */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex justify-center items-center min-h-full p-6">
              {!pdfUrl ? (
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No PDF file to preview</p>
                </div>
              ) : useFallback ? (
                <PDFFallbackViewer file={file} pdfBytes={pdfBytes} fileName={fileName} onDownload={downloadFile} />
              ) : error ? (
                <div className="text-center text-destructive max-w-md">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Error loading PDF</p>
                  <p className="text-sm mt-2">{error}</p>
                  {(file || pdfBytes) && (
                    <Button variant="outline" size="sm" onClick={downloadFile} className="mt-4 bg-transparent">
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading PDF...</span>
                      </div>
                    </div>
                  )}
                  <PDFViewer
                    pdfUrl={pdfUrl}
                    onDocumentLoadSuccess={onDocumentLoadSuccess}
                    onDocumentLoadError={onDocumentLoadError}
                    onPageLoadError={onPageLoadError}
                    currentPage={currentPage}
                    scale={scale}
                    rotation={rotation}
                    numPages={numPages}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
