import { describe, it, expect, beforeAll } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { PDFProcessor } from '../pdf-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makePDF(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage()
  return doc.save()
}

function toFile(bytes: Uint8Array, name = 'test.pdf'): File {
  return new File([bytes], name, { type: 'application/pdf' })
}

async function pageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}

// ---------------------------------------------------------------------------
// mergePDFs
// ---------------------------------------------------------------------------

describe('PDFProcessor.mergePDFs', () => {
  it('merges two 1-page PDFs into a 2-page document', async () => {
    const a = toFile(await makePDF(1), 'a.pdf')
    const b = toFile(await makePDF(1), 'b.pdf')
    const merged = await PDFProcessor.mergePDFs([a, b])
    expect(await pageCount(merged)).toBe(2)
  })

  it('preserves order: [3-page, 1-page] → 4 pages', async () => {
    const a = toFile(await makePDF(3), 'a.pdf')
    const b = toFile(await makePDF(1), 'b.pdf')
    const merged = await PDFProcessor.mergePDFs([a, b])
    expect(await pageCount(merged)).toBe(4)
  })

  it('throws when fewer than 1 valid file is provided', async () => {
    const invalid = new File([new Uint8Array([0, 1, 2, 3])], 'bad.pdf', { type: 'application/pdf' })
    await expect(PDFProcessor.mergePDFs([invalid])).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// splitPDF
// ---------------------------------------------------------------------------

describe('PDFProcessor.splitPDF', () => {
  let threePage: File

  beforeAll(async () => {
    threePage = toFile(await makePDF(3), 'three.pdf')
  })

  it('splits pages 1–2 from a 3-page PDF → 2-page output', async () => {
    const results = await PDFProcessor.splitPDF(threePage, [{ startPage: 1, endPage: 2 }])
    expect(results).toHaveLength(1)
    expect(await pageCount(results[0].bytes)).toBe(2)
  })

  it('splits a single page → 1-page output', async () => {
    const results = await PDFProcessor.splitPDF(threePage, [{ startPage: 2, endPage: 2 }])
    expect(results).toHaveLength(1)
    expect(await pageCount(results[0].bytes)).toBe(1)
  })

  it('produces multiple splits in one call', async () => {
    const results = await PDFProcessor.splitPDF(threePage, [
      { startPage: 1, endPage: 1 },
      { startPage: 2, endPage: 3 },
    ])
    expect(results).toHaveLength(2)
    expect(await pageCount(results[0].bytes)).toBe(1)
    expect(await pageCount(results[1].bytes)).toBe(2)
  })

  it('throws on an out-of-range page number', async () => {
    await expect(
      PDFProcessor.splitPDF(threePage, [{ startPage: 2, endPage: 10 }])
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// extractPages
// ---------------------------------------------------------------------------

describe('PDFProcessor.extractPages', () => {
  let fivePage: File

  beforeAll(async () => {
    fivePage = toFile(await makePDF(5), 'five.pdf')
  })

  it('extracts pages 1, 3, 5 from a 5-page PDF → 3-page output', async () => {
    const result = await PDFProcessor.extractPages(fivePage, [1, 3, 5])
    expect(await pageCount(result)).toBe(3)
  })

  it('extracts a single page → 1-page output', async () => {
    const result = await PDFProcessor.extractPages(fivePage, [2])
    expect(await pageCount(result)).toBe(1)
  })

  it('throws when a requested page is out of range', async () => {
    await expect(
      PDFProcessor.extractPages(fivePage, [5, 6])
    ).rejects.toThrow()
  })
})
