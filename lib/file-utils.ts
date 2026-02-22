import { PDFProcessor } from "./pdf-utils"
import type { FileItem } from "./types"

type Section = "create" | "merge" | "compress" | "convert"

const ALLOWED_TYPES: Record<Section, string[]> = {
  create: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "image/webp"],
  merge: ["application/pdf"],
  compress: ["application/pdf"],
  convert: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/html",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
  ],
}

const VALID_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/plain": ["txt"],
  "text/html": ["html", "htm"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/gif": ["gif"],
  "image/bmp": ["bmp"],
  "image/webp": ["webp"],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const MAX_TOTAL_FILES = 20

export async function buildFileItems(files: FileList, section: Section): Promise<FileItem[]> {
  if (files.length > MAX_TOTAL_FILES) {
    alert(`Maximum ${MAX_TOTAL_FILES} files allowed at once for security reasons.`)
    return []
  }

  const allowedTypes = ALLOWED_TYPES[section]
  const result: FileItem[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (file.size > MAX_FILE_SIZE) {
      alert(`File "${file.name}" is too large. Maximum file size is 50MB for security reasons.`)
      continue
    }

    if (!allowedTypes.includes(file.type)) {
      alert(`File "${file.name}" has an unsupported file type for the ${section} section.`)
      continue
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    if (VALID_EXTENSIONS[file.type] && !VALID_EXTENSIONS[file.type].includes(extension)) {
      alert(`File "${file.name}" has a suspicious file extension that doesn't match its type.`)
      continue
    }

    let pages = 1
    let isEncrypted = false

    if (file.type === "application/pdf") {
      try {
        const info = await PDFProcessor.getPDFInfo(file)
        pages = info.pages || 1
        isEncrypted = info.isEncrypted || false
      } catch {
        pages = 1
        isEncrypted = false
      }
    }

    result.push({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      pages,
      type: file.type.includes("pdf") ? "pdf" : "image",
      status: "complete",
      file,
      isEncrypted,
    })
  }

  return result
}
