/**
 * Session-scoped file shelf.
 *
 * Any tab can register uploaded files here so they persist across tab switches.
 * Other tabs (and the FileShelf UI) can consume them without re-uploading.
 *
 * Cross-component communication uses a CustomEvent so no prop-drilling is needed.
 * The event is dispatched BEFORE navigation so mounted tab components can react
 * immediately, even when they are the currently active tab.
 */

export type ShelfFileType = "pdf" | "image" | "document" | "other"

export type ShelfFile = {
  id: string
  name: string
  size: number
  fileType: ShelfFileType
  /** Original browser File reference — memory only, not serialised. */
  file: File
  addedAt: number
}

/** CustomEvent name used to send a shelf file to a specific tab. */
export const SHELF_USE_EVENT = "flowpdf:shelf-use-file"

export type ShelfUseEventDetail = {
  targetTab: string
  shelfFile: ShelfFile
}

// ─── Internal state ──────────────────────────────────────────────────────────

const MAX_FILES = 12
let _files: ShelfFile[] = []
let _listeners: Array<() => void> = []

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectFileType(file: File): ShelfFileType {
  const name = file.name.toLowerCase()
  const type = file.type
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf"
  if (type.startsWith("image/")) return "image"
  if (
    type.includes("word") ||
    type.includes("excel") ||
    type.includes("spreadsheet") ||
    [".docx", ".doc", ".xlsx", ".xls", ".txt", ".html", ".htm"].some((ext) =>
      name.endsWith(ext)
    )
  )
    return "document"
  return "other"
}

function notify() {
  _listeners.forEach((fn) => fn())
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const fileShelf = {
  /** Add a file to the shelf. Deduplicates by name + size. Returns the shelf entry. */
  add(file: File): ShelfFile {
    const existing = _files.find(
      (f) => f.name === file.name && f.size === file.size
    )
    if (existing) return existing

    const entry: ShelfFile = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: file.name,
      size: file.size,
      fileType: detectFileType(file),
      file,
      addedAt: Date.now(),
    }
    _files = [entry, ..._files].slice(0, MAX_FILES)
    notify()
    return entry
  },

  /** Remove a file from the shelf by id. */
  remove(id: string) {
    _files = _files.filter((f) => f.id !== id)
    notify()
  },

  getAll(): ShelfFile[] {
    return [..._files]
  },

  getByType(types: ShelfFileType[]): ShelfFile[] {
    return _files.filter((f) => types.includes(f.fileType))
  },

  /** Subscribe to shelf changes. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void {
    _listeners.push(fn)
    return () => {
      _listeners = _listeners.filter((l) => l !== fn)
    }
  },

  /**
   * Dispatch a CustomEvent so the target tab pre-populates itself
   * and page.tsx navigates to it.
   */
  sendToTab(targetTab: string, shelfFile: ShelfFile) {
    if (typeof window === "undefined") return
    const detail: ShelfUseEventDetail = { targetTab, shelfFile }
    window.dispatchEvent(new CustomEvent(SHELF_USE_EVENT, { detail }))
  },

  clear() {
    _files = []
    notify()
  },
}

// ─── React hook ───────────────────────────────────────────────────────────────

import { useEffect, useState } from "react"

export function useFileShelf(): ShelfFile[] {
  const [files, setFiles] = useState<ShelfFile[]>(fileShelf.getAll())

  useEffect(() => {
    const unsub = fileShelf.subscribe(() => setFiles(fileShelf.getAll()))
    return unsub
  }, [])

  return files
}
