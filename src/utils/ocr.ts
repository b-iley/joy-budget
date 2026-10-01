import * as Tesseract from 'tesseract.js'

export interface OcrLine {
  text: string
  x0: number
  y0: number
}

let workerPromise: Promise<Tesseract.Worker> | null = null

function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) workerPromise = Tesseract.createWorker('kor+eng')
  return workerPromise
}

export async function recognizeLines(image: File | Blob): Promise<OcrLine[]> {
  const worker = await getWorker()
  const { data } = await worker.recognize(image, {}, { blocks: true })
  const lines: OcrLine[] = []

  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        const text = line.text.trim()
        if (text) lines.push({ text, x0: line.bbox.x0, y0: line.bbox.y0 })
      }
    }
  }

  return lines
}
