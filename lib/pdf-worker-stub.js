// Empty stub module.
// pdfjs-dist references pdf.worker.mjs internally; webpack aliases it here
// so it creates a tiny hashed chunk instead of trying to compile the 3 MB worker.
// pdfjs never loads this chunk because GlobalWorkerOptions.workerSrc is set explicitly.
