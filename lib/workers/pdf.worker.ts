import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import * as Comlink from 'comlink'
import type { WatermarkOptions } from '../pdf-utils'

async function loadPDFDocument(bytes: Uint8Array): Promise<PDFDocument> {
  const buffer = new ArrayBuffer(bytes.length)
  new Uint8Array(buffer).set(bytes)
  try {
    return await PDFDocument.load(buffer)
  } catch (error) {
    if (error instanceof Error && error.message.includes('encrypted')) {
      return await PDFDocument.load(buffer, { ignoreEncryption: true })
    }
    throw error
  }
}

const api = {
  async mergePDFs(buffers: ArrayBuffer[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create()

    for (const buffer of buffers) {
      const bytes = new Uint8Array(buffer)
      const pdf = await loadPDFDocument(bytes)
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach((page) => mergedPdf.addPage(page))
    }

    return mergedPdf.save()
  },

  async compressPDF(buffer: ArrayBuffer): Promise<Uint8Array> {
    const bytes = new Uint8Array(buffer)
    const pdfDoc = await loadPDFDocument(bytes)
    return pdfDoc.save({ useObjectStreams: false, addDefaultPage: false })
  },

  async addWatermark(buffer: ArrayBuffer, options: WatermarkOptions): Promise<Uint8Array> {
    const {
      text,
      fontSize = 48,
      opacity = 0.3,
      rotation = 45,
      color = { r: 0.5, g: 0.5, b: 0.5 },
    } = options

    const bytes = new Uint8Array(buffer)
    const pdfDoc = await loadPDFDocument(bytes)
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const totalPages = pdfDoc.getPageCount()

    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i)
      const { width, height } = page.getSize()
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height / 2 - fontSize / 2,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        rotate: degrees(rotation),
      })
    }

    return pdfDoc.save()
  },
}

export type PDFWorkerAPI = typeof api

Comlink.expose(api)
