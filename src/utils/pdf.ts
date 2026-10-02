// Root-caused via a real "1페이지 처리 실패 (TypeError: undefined is not a
// function (near '...e of t...'))" report: pdf.js 6's own getTextContent()
// does `for await (const chunk of this.streamTextContent())`, and Safari
// versions before 17.4 don't support async-iteration over a ReadableStream
// at all — the legacy build doesn't help here since it calls the exact same
// API. Reading the stream manually via getReader()/read() below uses the
// much older, universally-supported ReadableStream API instead, so the
// modern build works fine again.
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href

export interface PdfTextItem {
  text: string
  x: number
  y: number
  page: number
}

export class PdfPasswordError extends Error {
  reason: 'need-password' | 'wrong-password'

  constructor(reason: 'need-password' | 'wrong-password') {
    super(reason === 'need-password' ? '비밀번호가 필요해요.' : '비밀번호가 올바르지 않아요.')
    this.reason = reason
  }
}

export async function extractPdfText(file: File, password?: string): Promise<PdfTextItem[]> {
  const buffer = await file.arrayBuffer()

  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data: buffer, password }).promise
  } catch (err) {
    if (err instanceof pdfjsLib.PasswordException) {
      throw new PdfPasswordError(
        err.code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD ? 'wrong-password' : 'need-password'
      )
    }
    throw err
  }

  const items: PdfTextItem[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum)
      // Not page.getTextContent() — see the import comment above.
      const reader = page.streamTextContent().getReader()
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        for (const item of value.items ?? []) {
          if ('str' in item && item.str.trim()) {
            items.push({ text: item.str.trim(), x: item.transform[4], y: item.transform[5], page: pageNum })
          }
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      throw new Error(`${pageNum}페이지 처리 실패 (${detail})`)
    }
  }

  return items
}
