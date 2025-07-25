"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, ExternalLink } from "lucide-react"

interface PDFFallbackViewerProps {
  file?: File | null
  pdfBytes?: Uint8Array | null
  fileName?: string
  onDownload?: () => void
}

export function PDFFallbackViewer({ file, pdfBytes, fileName, onDownload }: PDFFallbackViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (file) {
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [pdfBytes, file])

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <FileText className="h-16 w-16 text-muted-foreground" />
      <div className="text-center">
        <h3 className="text-lg font-medium">PDF Preview Unavailable</h3>
        <p className="text-sm text-muted-foreground mt-1">{fileName && `File: ${fileName}`}</p>
        <p className="text-sm text-muted-foreground mt-2">
          The PDF preview couldn't be loaded, but you can still download or open the file.
        </p>
      </div>
      <div className="flex gap-2">
        {onDownload && (
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
        {pdfUrl && (
          <Button variant="outline" onClick={() => window.open(pdfUrl, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        )}
      </div>
    </div>
  )
}
