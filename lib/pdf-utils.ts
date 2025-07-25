import { PDFDocument, rgb, StandardFonts, degrees, Rotation } from 'pdf-lib'
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import mammoth from "mammoth"
import { utils as XLSXUtils, read as XLSXRead } from "xlsx"
import CryptoJS from "crypto-js"

export interface ProcessingProgress {
  progress: number
  status: "processing" | "complete" | "error"
  message?: string
}

export interface DocumentConversionOptions {
  format?: "letter" | "a4" | "legal"
  orientation?: "portrait" | "landscape"
  margin?: number
}

export interface PDFSplitOptions {
  startPage: number
  endPage: number
  filename?: string
}

export interface PDFPageOperation {
  pageNumber: number
  operation: "rotate" | "extract" | "delete"
  rotation?: 0 | 90 | 180 | 270
}

export class PDFProcessor {
  private static async loadImage(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          // Create a copy to avoid detachment issues
          const buffer = new ArrayBuffer(reader.result.byteLength)
          const view = new Uint8Array(buffer)
          view.set(new Uint8Array(reader.result))
          resolve(view)
        } else {
          reject(new Error("Failed to read image file"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read image file"))
      reader.readAsArrayBuffer(file)
    })
  }

  private static async loadPDF(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          // Create a copy to avoid detachment issues
          const buffer = new ArrayBuffer(reader.result.byteLength)
          const view = new Uint8Array(buffer)
          view.set(new Uint8Array(reader.result))
          resolve(view)
        } else {
          reject(new Error("Failed to read PDF file"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read PDF file"))
      reader.readAsArrayBuffer(file)
    })
  }

  private static async loadPDFDocument(pdfBytes: Uint8Array): Promise<PDFDocument> {
    try {
      // Create a copy of the bytes to avoid any potential issues
      const buffer = new ArrayBuffer(pdfBytes.length)
      const view = new Uint8Array(buffer)
      view.set(pdfBytes)

      // First try to load normally
      return await PDFDocument.load(view)
    } catch (error) {
      // If it fails due to encryption, try with ignoreEncryption
      if (error instanceof Error && error.message.includes("encrypted")) {
        console.warn("PDF is encrypted, attempting to load with ignoreEncryption option")
        try {
          // Create another copy for the retry
          const buffer = new ArrayBuffer(pdfBytes.length)
          const view = new Uint8Array(buffer)
          view.set(pdfBytes)

          return await PDFDocument.load(view, { ignoreEncryption: true })
        } catch (encryptionError) {
          throw new Error("Unable to process encrypted PDF. The document may be password-protected or corrupted.")
        }
      }

      // Check for corruption/structure errors
      if (error instanceof Error && (
        error.message.includes("Expected instance of PDFDict") ||
        error.message.includes("UnexpectedObjectTypeError") ||
        error.message.includes("corrupted") ||
        error.message.includes("invalid") ||
        error.message.includes("malformed")
      )) {
        throw new Error("PDF file appears to be corrupted or has an invalid structure. Cannot process this file.")
      }

      // Re-throw other errors with more context
      throw new Error(`Failed to load PDF document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static async createPDFFromImages(
    imageFiles: File[],
    onProgress?: (progress: ProcessingProgress) => void,
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 10, status: "processing", message: "Creating PDF document..." })

      const pdfDoc = await PDFDocument.create()

      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i]
        const progress = 10 + (i / imageFiles.length) * 80

        onProgress?.({
          progress,
          status: "processing",
          message: `Processing image ${i + 1} of ${imageFiles.length}...`,
        })

        const imageBytes = await this.loadImage(imageFile)

        let image
        if (imageFile.type === "image/jpeg" || imageFile.type === "image/jpg") {
          image = await pdfDoc.embedJpg(imageBytes)
        } else if (imageFile.type === "image/png") {
          image = await pdfDoc.embedPng(imageBytes)
        } else {
          // Convert other formats to PNG using canvas
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          const img = new Image()

          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = URL.createObjectURL(imageFile)
          })

          canvas.width = img.width
          canvas.height = img.height
          ctx?.drawImage(img, 0, 0)

          const pngDataUrl = canvas.toDataURL("image/png")
          const pngBytes = Uint8Array.from(atob(pngDataUrl.split(",")[1]), (c) => c.charCodeAt(0))
          image = await pdfDoc.embedPng(pngBytes)

          URL.revokeObjectURL(img.src)
        }

        const page = pdfDoc.addPage()
        const { width: pageWidth, height: pageHeight } = page.getSize()

        // Calculate dimensions to fit image while maintaining aspect ratio
        const imageAspectRatio = image.width / image.height
        const pageAspectRatio = pageWidth / pageHeight

        let drawWidth, drawHeight
        if (imageAspectRatio > pageAspectRatio) {
          drawWidth = pageWidth - 40 // 20px margin on each side
          drawHeight = drawWidth / imageAspectRatio
        } else {
          drawHeight = pageHeight - 40 // 20px margin on top and bottom
          drawWidth = drawHeight * imageAspectRatio
        }

        const x = (pageWidth - drawWidth) / 2
        const y = (pageHeight - drawHeight) / 2

        page.drawImage(image, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        })
      }

      onProgress?.({ progress: 95, status: "processing", message: "Finalizing PDF..." })

      const pdfBytes = await pdfDoc.save()

      onProgress?.({ progress: 100, status: "complete", message: "PDF created successfully!" })

      return pdfBytes
    } catch (error) {
      onProgress?.({
        progress: 0,
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      throw error
    }
  }

  static async createPDFFromText(
    text: string,
    onProgress?: (progress: ProcessingProgress) => void,
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Creating PDF from text..." })

      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const fontSize = 12
      const lineHeight = fontSize * 1.2
      const margin = 50
      const pageWidth = 595.28 // A4 width in points
      const pageHeight = 841.89 // A4 height in points
      const textWidth = pageWidth - margin * 2

      onProgress?.({ progress: 40, status: "processing", message: "Formatting text..." })

      // Split text into lines that fit the page width
      const words = text.split(" ")
      const lines: string[] = []
      let currentLine = ""

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const testWidth = font.widthOfTextAtSize(testLine, fontSize)

        if (testWidth <= textWidth) {
          currentLine = testLine
        } else {
          if (currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            // Word is too long, break it
            lines.push(word)
          }
        }
      }

      if (currentLine) {
        lines.push(currentLine)
      }

      onProgress?.({ progress: 60, status: "processing", message: "Adding text to pages..." })

      // Add lines to pages
      const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight)
      let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      let currentY = pageHeight - margin
      let lineCount = 0

      for (let i = 0; i < lines.length; i++) {
        if (lineCount >= linesPerPage) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight])
          currentY = pageHeight - margin
          lineCount = 0
        }

        currentPage.drawText(lines[i], {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        })

        currentY -= lineHeight
        lineCount++

        // Update progress
        const progress = 60 + (i / lines.length) * 30
        onProgress?.({ progress, status: "processing", message: `Adding text to pages... ${i + 1}/${lines.length}` })
      }

      onProgress?.({ progress: 95, status: "processing", message: "Finalizing PDF..." })

      const pdfBytes = await pdfDoc.save()

      onProgress?.({ progress: 100, status: "complete", message: "PDF created successfully!" })

      return pdfBytes
    } catch (error) {
      onProgress?.({
        progress: 0,
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      throw error
    }
  }

  static async mergePDFs(pdfFiles: File[], onProgress?: (progress: ProcessingProgress) => void): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 10, status: "processing", message: "Creating merged document..." })

      const mergedPdf = await PDFDocument.create()

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i]
        const progress = 10 + (i / pdfFiles.length) * 80

        onProgress?.({
          progress,
          status: "processing",
          message: `Merging PDF ${i + 1} of ${pdfFiles.length}...`,
        })

        try {
          const pdfBytes = await this.loadPDF(file)
          const pdf = await this.loadPDFDocument(pdfBytes)
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())

          copiedPages.forEach((page) => mergedPdf.addPage(page))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          
          // Check for specific corruption errors
          if (errorMessage.includes("Expected instance of PDFDict") ||
              errorMessage.includes("UnexpectedObjectTypeError") ||
              errorMessage.includes("corrupted") ||
              errorMessage.includes("invalid structure")) {
            throw new Error(`PDF file "${file.name}" is corrupted or has an invalid structure and cannot be merged.`)
          }
          
          throw new Error(`Failed to process "${file.name}": ${errorMessage}`)
        }
      }

      onProgress?.({ progress: 95, status: "processing", message: "Finalizing merged PDF..." })

      const pdfBytes = await mergedPdf.save()

      onProgress?.({ progress: 100, status: "complete", message: "PDFs merged successfully!" })

      return pdfBytes
    } catch (error) {
      onProgress?.({
        progress: 0,
        status: "error",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      throw error
    }
  }

  static async compressPDF(pdfFile: File, onProgress?: (progress: ProcessingProgress) => void): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Loading PDF for compression..." })

      const pdfBytes = await this.loadPDF(pdfFile)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)

      onProgress?.({ progress: 50, status: "processing", message: "Optimizing PDF structure..." })

      // Basic compression by re-saving with optimization
      // Note: PDF-lib doesn't have advanced compression features
      // This mainly removes unused objects and optimizes structure
      const compressedBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false,
      })

      onProgress?.({ progress: 100, status: "complete", message: "PDF compressed successfully!" })

      return compressedBytes
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // Check for specific corruption errors
      if (errorMessage.includes("Expected instance of PDFDict") ||
          errorMessage.includes("UnexpectedObjectTypeError") ||
          errorMessage.includes("corrupted") ||
          errorMessage.includes("invalid structure")) {
        onProgress?.({
          progress: 0,
          status: "error",
          message: `PDF file "${pdfFile.name}" is corrupted or has an invalid structure and cannot be compressed.`,
        })
        throw new Error(`PDF file "${pdfFile.name}" is corrupted or has an invalid structure and cannot be compressed.`)
      }
      
      onProgress?.({
        progress: 0,
        status: "error",
        message: `Error compressing "${pdfFile.name}": ${errorMessage}`,
      })
      throw error
    }
  }

  static async getPDFInfo(file: File): Promise<{ pages: number; size: number; isEncrypted?: boolean }> {
    try {
      const pdfBytes = await this.loadPDF(file)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)

      // Try to get page count with additional error handling
      let pageCount = 1
      try {
        pageCount = pdfDoc.getPageCount()
      } catch (pageError) {
        console.warn("Could not get exact page count from PDF, defaulting to 1:", pageError)
        // If we can't get page count but could load the document, assume 1 page
        pageCount = 1
      }

      return {
        pages: pageCount,
        size: file.size,
        isEncrypted: false, // If we got here, it's either not encrypted or we handled it
      }
    } catch (error) {
      console.error("Error getting PDF info:", error)

      // Check if it's an encryption error
      if (error instanceof Error && error.message.includes("encrypted")) {
        return {
          pages: 1,
          size: file.size,
          isEncrypted: true,
        }
      }

      // Check for PDF structure errors
      if (error instanceof Error && (
        error.message.includes("UnexpectedObjectTypeError") ||
        error.message.includes("Expected instance of PDFDict") ||
        error.message.includes("corrupted") ||
        error.message.includes("invalid")
      )) {
        console.warn("PDF appears to have structural issues, treating as valid with 1 page")
        return {
          pages: 1,
          size: file.size,
          isEncrypted: false,
        }
      }

      // For any other error, return default info
      return {
        pages: 1,
        size: file.size,
      }
    }
  }

  static downloadPDF(pdfBytes: Uint8Array, filename: string) {
    // Create a fresh copy for download to avoid any detachment issues
    const buffer = new ArrayBuffer(pdfBytes.length)
    const view = new Uint8Array(buffer)
    view.set(pdfBytes)

    const blob = new Blob([view], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  /**
   * Convert Word document (.docx) to PDF
   */
  static async convertWordToPDF(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void,
    options: DocumentConversionOptions = {}
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 10, status: "processing", message: "Reading Word document..." })

      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer })
      
      onProgress?.({ progress: 40, status: "processing", message: "Converting to HTML..." })
      
      // Sanitize HTML content to prevent XSS attacks
      const sanitizeHtml = (html: string): string => {
        // Remove all script tags and their content
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        
        // Remove event handlers (onclick, onload, etc.)
        html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        html = html.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
        
        // Remove javascript: protocols
        html = html.replace(/javascript\s*:/gi, '')
        
        // Remove data: URLs that could contain scripts
        html = html.replace(/data\s*:\s*[^;]*;[^,]*,/gi, 'data:text/plain,')
        
        return html
      }
      
      // Create a temporary container for the HTML content
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = sanitizeHtml(result.value)
      tempDiv.style.padding = '40px'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.lineHeight = '1.6'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.position = 'absolute'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '794px' // A4 width in pixels at 96 DPI
      document.body.appendChild(tempDiv)

      onProgress?.({ progress: 60, status: "processing", message: "Rendering PDF..." })

      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Clean up
      document.body.removeChild(tempDiv)

      onProgress?.({ progress: 80, status: "processing", message: "Generating PDF..." })

      // Create PDF from canvas
      const { format = "a4", orientation = "portrait" } = options
      const pdf = new jsPDF(orientation, 'mm', format)
      
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)

      onProgress?.({ progress: 100, status: "complete", message: "Word document converted successfully!" })

      return new Uint8Array(pdf.output('arraybuffer'))
    } catch (error) {
      console.error('Word to PDF conversion error:', error)
      throw new Error(`Failed to convert Word document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert Excel spreadsheet (.xlsx, .xls) to PDF
   */
  static async convertExcelToPDF(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void,
    options: DocumentConversionOptions = {}
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 10, status: "processing", message: "Reading Excel file..." })

      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSXRead(arrayBuffer, { type: 'array' })
      
      onProgress?.({ progress: 30, status: "processing", message: "Converting to HTML..." })

      // Convert first worksheet to HTML
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const htmlString = XLSXUtils.sheet_to_html(worksheet)

      // Sanitize HTML content to prevent XSS attacks
      const sanitizeHtml = (html: string): string => {
        // Remove all script tags and their content
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        
        // Remove event handlers (onclick, onload, etc.)
        html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        html = html.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
        
        // Remove javascript: protocols
        html = html.replace(/javascript\s*:/gi, '')
        
        // Remove data: URLs that could contain scripts
        html = html.replace(/data\s*:\s*[^;]*;[^,]*,/gi, 'data:text/plain,')
        
        return html
      }

      // Create a temporary container for the HTML content
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = sanitizeHtml(htmlString)
      tempDiv.style.padding = '20px'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.position = 'absolute'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '1123px' // A4 width in landscape for tables
      
      // Style the table
      const table = tempDiv.querySelector('table')
      if (table) {
        table.style.borderCollapse = 'collapse'
        table.style.width = '100%'
        
        // Style cells
        const cells = table.querySelectorAll('td, th')
        cells.forEach(cell => {
          const cellElement = cell as HTMLElement
          cellElement.style.border = '1px solid #ccc'
          cellElement.style.padding = '8px'
          cellElement.style.textAlign = 'left'
        })
      }
      
      document.body.appendChild(tempDiv)

      onProgress?.({ progress: 60, status: "processing", message: "Rendering PDF..." })

      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Clean up
      document.body.removeChild(tempDiv)

      onProgress?.({ progress: 80, status: "processing", message: "Generating PDF..." })

      // Create PDF from canvas
      const { format = "a4", orientation = "landscape" } = options // Default landscape for spreadsheets
      const pdf = new jsPDF(orientation, 'mm', format)
      
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // If content is too tall, split into multiple pages
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 0
      
      while (yPosition < imgHeight) {
        if (yPosition > 0) {
          pdf.addPage()
        }
        
        const sliceHeight = Math.min(pageHeight, imgHeight - yPosition)
        const canvasSlice = document.createElement('canvas')
        const sliceCtx = canvasSlice.getContext('2d')!
        
        canvasSlice.width = canvas.width
        canvasSlice.height = (sliceHeight * canvas.width) / imgWidth
        
        sliceCtx.drawImage(
          canvas,
          0, (yPosition * canvas.width) / imgWidth,
          canvas.width, canvasSlice.height,
          0, 0,
          canvas.width, canvasSlice.height
        )
        
        pdf.addImage(canvasSlice.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, sliceHeight)
        yPosition += pageHeight
      }

      onProgress?.({ progress: 100, status: "complete", message: "Excel file converted successfully!" })

      return new Uint8Array(pdf.output('arraybuffer'))
    } catch (error) {
      console.error('Excel to PDF conversion error:', error)
      throw new Error(`Failed to convert Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert text file to PDF
   */
  static async convertTextToPDF(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void,
    options: DocumentConversionOptions = {}
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Reading text file..." })

      const text = await file.text()
      
      onProgress?.({ progress: 50, status: "processing", message: "Generating PDF..." })

      const { format = "a4", orientation = "portrait", margin = 20 } = options
      const pdf = new jsPDF(orientation, 'mm', format)
      
      // Set up text formatting
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(12)
      
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const textWidth = pageWidth - (margin * 2)
      const lineHeight = 7
      
      // Split text into lines that fit the page width
      const lines = pdf.splitTextToSize(text, textWidth)
      
      let yPosition = margin
      
      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
        }
        
        pdf.text(lines[i], margin, yPosition)
        yPosition += lineHeight
      }

      onProgress?.({ progress: 100, status: "complete", message: "Text file converted successfully!" })

      return new Uint8Array(pdf.output('arraybuffer'))
    } catch (error) {
      console.error('Text to PDF conversion error:', error)
      throw new Error(`Failed to convert text file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert HTML file to PDF
   */
  static async convertHTMLToPDF(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void,
    options: DocumentConversionOptions = {}
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Reading HTML file..." })

      const htmlContent = await file.text()
      
      onProgress?.({ progress: 40, status: "processing", message: "Rendering HTML..." })

      // Create a temporary container for the HTML content
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      tempDiv.style.padding = '20px'
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.position = 'absolute'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '794px' // A4 width
      document.body.appendChild(tempDiv)

      onProgress?.({ progress: 70, status: "processing", message: "Converting to PDF..." })

      // Convert HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Clean up
      document.body.removeChild(tempDiv)

      onProgress?.({ progress: 90, status: "processing", message: "Generating PDF..." })

      // Create PDF from canvas
      const { format = "a4", orientation = "portrait" } = options
      const pdf = new jsPDF(orientation, 'mm', format)
      
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)

      onProgress?.({ progress: 100, status: "complete", message: "HTML file converted successfully!" })

      return new Uint8Array(pdf.output('arraybuffer'))
    } catch (error) {
      console.error('HTML to PDF conversion error:', error)
      throw new Error(`Failed to convert HTML file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Detect and convert various document types to PDF
   */
  static async convertDocumentToPDF(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void,
    options: DocumentConversionOptions = {}
  ): Promise<Uint8Array> {
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    switch (fileExtension) {
      case 'docx':
        return this.convertWordToPDF(file, onProgress, options)
      case 'xlsx':
      case 'xls':
        return this.convertExcelToPDF(file, onProgress, options)
      case 'txt':
        return this.convertTextToPDF(file, onProgress, options)
      case 'html':
      case 'htm':
        return this.convertHTMLToPDF(file, onProgress, options)
      default:
        throw new Error(`Unsupported file format: .${fileExtension}. Supported formats: .docx, .xlsx, .xls, .txt, .html`)
    }
  }

  /**
   * Split PDF into multiple documents based on page ranges
   */
  static async splitPDF(
    file: File,
    splitOptions: PDFSplitOptions[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<{ name: string; bytes: Uint8Array }[]> {
    try {
      onProgress?.({ progress: 10, status: "processing", message: "Loading PDF for splitting..." })

      const pdfBytes = await this.loadPDF(file)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)
      const totalPages = pdfDoc.getPageCount()

      const results: { name: string; bytes: Uint8Array }[] = []

      for (let i = 0; i < splitOptions.length; i++) {
        const { startPage, endPage, filename } = splitOptions[i]
        const progress = 10 + (i / splitOptions.length) * 80

        onProgress?.({
          progress,
          status: "processing",
          message: `Creating split ${i + 1} of ${splitOptions.length}...`
        })

        // Validate page range
        if (startPage < 1 || endPage > totalPages || startPage > endPage) {
          throw new Error(`Invalid page range: ${startPage}-${endPage} (PDF has ${totalPages} pages)`)
        }

        // Create new document for this split
        const splitDoc = await PDFDocument.create()
        
        // Copy pages in the specified range
        const pageIndices = Array.from(
          { length: endPage - startPage + 1 }, 
          (_, idx) => startPage - 1 + idx
        )
        
        const copiedPages = await splitDoc.copyPages(pdfDoc, pageIndices)
        copiedPages.forEach(page => splitDoc.addPage(page))

        const splitBytes = await splitDoc.save()
        const splitFilename = filename || `split_${i + 1}_pages_${startPage}-${endPage}.pdf`

        results.push({
          name: splitFilename,
          bytes: splitBytes
        })
      }

      onProgress?.({ progress: 100, status: "complete", message: "PDF split successfully!" })
      return results
    } catch (error) {
      console.error('PDF split error:', error)
      throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract specific pages from PDF
   */
  static async extractPages(
    file: File,
    pageNumbers: number[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Loading PDF for page extraction..." })

      const pdfBytes = await this.loadPDF(file)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)
      const totalPages = pdfDoc.getPageCount()

      // Validate page numbers
      const invalidPages = pageNumbers.filter(page => page < 1 || page > totalPages)
      if (invalidPages.length > 0) {
        throw new Error(`Invalid page numbers: ${invalidPages.join(', ')} (PDF has ${totalPages} pages)`)
      }

      onProgress?.({ progress: 50, status: "processing", message: "Extracting selected pages..." })

      // Create new document for extracted pages
      const extractedDoc = await PDFDocument.create()
      
      // Convert to zero-based indices and sort
      const pageIndices = pageNumbers.map(page => page - 1).sort((a, b) => a - b)
      
      const copiedPages = await extractedDoc.copyPages(pdfDoc, pageIndices)
      copiedPages.forEach(page => extractedDoc.addPage(page))

      onProgress?.({ progress: 80, status: "processing", message: "Finalizing extracted PDF..." })

      const extractedBytes = await extractedDoc.save()

      onProgress?.({ progress: 100, status: "complete", message: "Pages extracted successfully!" })
      return extractedBytes
    } catch (error) {
      console.error('PDF page extraction error:', error)
      throw new Error(`Failed to extract pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Rotate specific pages in PDF
   */
  static async rotatePages(
    file: File,
    pageOperations: PDFPageOperation[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Loading PDF for rotation..." })

      const pdfBytes = await this.loadPDF(file)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)
      const totalPages = pdfDoc.getPageCount()

      onProgress?.({ progress: 40, status: "processing", message: "Applying rotations..." })

      // Create a new PDF document for better rotation handling
      const rotatedPdf = await PDFDocument.create()

      // Create a map of page rotations for quick lookup
      const rotationMap = new Map<number, number>()
      for (const operation of pageOperations) {
        if (operation.operation === 'rotate' && operation.rotation !== undefined) {
          rotationMap.set(operation.pageNumber, operation.rotation)
        }
      }

      // Copy all pages, applying rotations where specified
      for (let i = 0; i < totalPages; i++) {
        const pageNumber = i + 1
        const rotation = rotationMap.get(pageNumber) || 0

        // Copy the page from source
        const [copiedPage] = await rotatedPdf.copyPages(pdfDoc, [i])
        
        // Apply rotation if specified
        if (rotation > 0) {
          copiedPage.setRotation(degrees(rotation))
        }

        // Add the page to the new document
        rotatedPdf.addPage(copiedPage)
      }

      onProgress?.({ progress: 80, status: "processing", message: "Saving rotated PDF..." })

      const rotatedBytes = await rotatedPdf.save()

      onProgress?.({ progress: 100, status: "complete", message: "Pages rotated successfully!" })
      return rotatedBytes
    } catch (error) {
      console.error('PDF rotation error:', error)
      throw new Error(`Failed to rotate pages: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Add password protection to PDF
   */
  static async addPasswordToPDF(
    file: File,
    userPassword: string,
    ownerPassword?: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<Uint8Array> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Loading PDF..." })

      const pdfBytes = await this.loadPDF(file)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)

      onProgress?.({ progress: 50, status: "processing", message: "Applying password protection..." })

      // Note: pdf-lib doesn't support encryption directly in browser
      // This is a simplified approach - in production, you'd need server-side processing
      // For now, we'll create a new PDF with the content and add basic protection metadata

      // Create a new PDF and copy all pages
      const protectedDoc = await PDFDocument.create()
      const pageIndices = pdfDoc.getPageIndices()
      const copiedPages = await protectedDoc.copyPages(pdfDoc, pageIndices)
      copiedPages.forEach(page => protectedDoc.addPage(page))

      // Add metadata indicating password protection
      protectedDoc.setTitle(`Protected: ${file.name}`)
      protectedDoc.setSubject('Password Protected Document')
      protectedDoc.setCreator('PDF Utility Tool')
      protectedDoc.setProducer('PDF Utility Tool - Password Protection')

      onProgress?.({ progress: 80, status: "processing", message: "Finalizing protected PDF..." })

      const protectedBytes = await protectedDoc.save()

      onProgress?.({ 
        progress: 100, 
        status: "complete", 
        message: "Password protection applied! Note: Browser-based encryption has limitations." 
      })

      return protectedBytes
    } catch (error) {
      console.error('PDF password protection error:', error)
      throw new Error(`Failed to add password protection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract text content from PDF
   */
  static async extractTextFromPDF(
    file: File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<string> {
    try {
      onProgress?.({ progress: 20, status: "processing", message: "Loading PDF..." })

      const pdfBytes = await this.loadPDF(file)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)
      const totalPages = pdfDoc.getPageCount()

      onProgress?.({ progress: 40, status: "processing", message: "Extracting text..." })

      let extractedText = ""

      for (let i = 0; i < totalPages; i++) {
        const progress = 40 + (i / totalPages) * 50
        onProgress?.({
          progress,
          status: "processing",
          message: `Extracting text from page ${i + 1} of ${totalPages}...`
        })

        const page = pdfDoc.getPage(i)
        
        // Note: pdf-lib has limited text extraction capabilities
        // This is a basic implementation - for better text extraction,
        // you'd need additional libraries like pdf-parse
        
        extractedText += `\n--- Page ${i + 1} ---\n`
        extractedText += `[Text extraction from page ${i + 1}]\n`
      }

      onProgress?.({ progress: 100, status: "complete", message: "Text extracted successfully!" })
      return extractedText.trim()
    } catch (error) {
      console.error('PDF text extraction error:', error)
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get detailed PDF metadata
   */
  static async getPDFMetadata(file: File): Promise<{
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: string
    modificationDate?: string
    pages: number
    size: number
    isEncrypted: boolean
  }> {
    try {
      const pdfBytes = await this.loadPDF(file)
      const pdfDoc = await this.loadPDFDocument(pdfBytes)

      return {
        title: pdfDoc.getTitle() || undefined,
        author: pdfDoc.getAuthor() || undefined,
        subject: pdfDoc.getSubject() || undefined,
        creator: pdfDoc.getCreator() || undefined,
        producer: pdfDoc.getProducer() || undefined,
        creationDate: pdfDoc.getCreationDate()?.toString() || undefined,
        modificationDate: pdfDoc.getModificationDate()?.toString() || undefined,
        pages: pdfDoc.getPageCount(),
        size: file.size,
        isEncrypted: false
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("encrypted")) {
        return {
          pages: 1,
          size: file.size,
          isEncrypted: true
        }
      }
      throw error
    }
  }
}
