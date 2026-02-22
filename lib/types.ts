export interface FileItem {
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

export interface BatchQueueItem {
  id: string
  file: File
  name: string
  size: number
  status: 'pending' | 'processing' | 'complete' | 'error'
  progress: number
  outputBytes?: Uint8Array
  errorMessage?: string
}
