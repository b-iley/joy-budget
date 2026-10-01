const SHEETS_WEBHOOK_KEY = 'joy-family:sheets-webhook-url'

export function getSheetsWebhookUrl(): string | null {
  try {
    return localStorage.getItem(SHEETS_WEBHOOK_KEY)
  } catch {
    return null
  }
}

export function setSheetsWebhookUrl(url: string): void {
  try {
    localStorage.setItem(SHEETS_WEBHOOK_KEY, url)
  } catch {
    // private browsing / storage disabled — setting just won't persist
  }
}
