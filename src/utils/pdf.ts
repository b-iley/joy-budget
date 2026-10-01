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
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        items.push({ text: item.str.trim(), x: item.transform[4], y: item.transform[5], page: pageNum })
      }
    }
  }

  return items
}
