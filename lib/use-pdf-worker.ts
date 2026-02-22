'use client'

import { useEffect, useRef } from 'react'
import * as Comlink from 'comlink'
import type { PDFWorkerAPI } from './workers/pdf.worker'

export type RemotePDFWorker = Comlink.Remote<PDFWorkerAPI>

export function usePDFWorker(): RemotePDFWorker | null {
  const apiRef = useRef<RemotePDFWorker | null>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('./workers/pdf.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    apiRef.current = Comlink.wrap<PDFWorkerAPI>(worker)

    return () => {
      worker.terminate()
      workerRef.current = null
      apiRef.current = null
    }
  }, [])

  return apiRef.current
}
