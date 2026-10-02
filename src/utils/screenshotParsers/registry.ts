import type { OcrLine } from '../ocr'
import { parseDongbaekjeonScreenshot } from './dongbaekjeon'
import { parseKakaoBankScreenshot } from './kakaoBank'
import { parseNaverPayScreenshot } from './naverPay'
import type { ParsedScreenshotRow } from './types'

export interface ScreenshotListPlatform {
  id: string
  label: string
  defaultCategoryId: string
  // year is whatever year it happens to be when the screenshot is uploaded —
  // these screenshots never show a year, and the month comes from each row's
  // own date instead.
  parse: (lines: OcrLine[], year: number) => ParsedScreenshotRow[]
}

export const SCREENSHOT_LIST_PLATFORMS: ScreenshotListPlatform[] = [
  {
    id: 'dongbaekjeon',
    label: '동백전 결제내역',
    defaultCategoryId: 'etc_expense',
    parse: parseDongbaekjeonScreenshot,
  },
  {
    id: 'naverpay',
    label: '네이버페이 결제내역',
    defaultCategoryId: 'shopping',
    parse: parseNaverPayScreenshot,
  },
  {
    id: 'kakaobank',
    label: '카카오뱅크 지출내역',
    defaultCategoryId: 'etc_expense',
    parse: parseKakaoBankScreenshot,
  },
]
