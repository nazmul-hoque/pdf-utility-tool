/**
 * Module-level singleton for passing a PDF output file between tabs.
 * A tab that produces output calls `pendingFile.set()` before navigating.
 * The destination tab calls `pendingFile.consume()` on mount to pre-populate itself.
 */

export type PendingFile = {
  pdfBytes: Uint8Array
  fileName: string
  sourceTab: string
}

let _pending: PendingFile | null = null

export const pendingFile = {
  set(file: PendingFile) {
    _pending = file
  },

  /** Returns the pending file and clears it so it can only be consumed once. */
  consume(): PendingFile | null {
    const f = _pending
    _pending = null
    return f
  },

  peek(): PendingFile | null {
    return _pending
  },

  clear() {
    _pending = null
  },
}
