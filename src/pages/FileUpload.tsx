import { ChevronLeft, FileText, Image as ImageIcon, LoaderCircle, Receipt } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryIcon } from '../components/CategoryIcon'
import { useCategories } from '../context/CategoriesContext'
import { useMerchantRules } from '../context/MerchantRulesContext'
import { useTransactions } from '../context/TransactionsContext'
import { recognizeLines } from '../utils/ocr'
import { PdfPasswordError, extractPdfText } from '../utils/pdf'
import { RECEIPT_PLATFORMS } from '../utils/receiptParsers/registry'
import type { ReceiptPlatform } from '../utils/receiptParsers/registry'
import { SCREENSHOT_LIST_PLATFORMS } from '../utils/screenshotParsers/registry'
import type { ScreenshotListPlatform } from '../utils/screenshotParsers/registry'
import { STATEMENT_PLATFORMS } from '../utils/statementParsers/registry'
import type { StatementPlatform } from '../utils/statementParsers/registry'
import { formatWon, todayISO } from '../utils/format'
import { newId } from '../utils/id'

interface Draft {
  id: string
  include: boolean
  displayName: string | null
  date: string
  amountText: string
  title: string
  categoryId: string
  subcategoryId?: string
  failed: boolean
}

type Platform =
  | { kind: 'receipt'; data: ReceiptPlatform }
  | { kind: 'statement'; data: StatementPlatform }
  | { kind: 'screenshot-list'; data: ScreenshotListPlatform }

type Step = 'select' | 'processing' | 'review'

export function FileUpload() {
  const navigate = useNavigate()
  const { addTransaction } = useTransactions()
  const { categoriesFor, getCategory } = useCategories()
  const { getSuggestion } = useMerchantRules()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [activePlatform, setActivePlatform] = useState<Platform | null>(null)
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<Step>('select')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [summary, setSummary] = useState<{ total: number; excluded: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedCount = drafts.filter((d) => d.include).length
  const selectedTotal = useMemo(
    () => drafts.filter((d) => d.include).reduce((sum, d) => sum + (Number(d.amountText) || 0), 0),
    [drafts]
  )

  function choosePlatform(p: Platform) {
    setError(null)
    setActivePlatform(p)
    if (p.kind === 'receipt' || p.kind === 'screenshot-list') {
      imageInputRef.current?.click()
    } else {
      setPassword('')
    }
  }

  function backFromReview() {
    setDrafts([])
    setSummary(null)
    setStep('select')
  }

  async function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0 || !activePlatform) return

    if (activePlatform.kind === 'screenshot-list') {
      await handleScreenshotFiles(files, activePlatform.data)
      return
    }
    if (activePlatform.kind !== 'receipt') return
    const platform = activePlatform.data

    // A single receipt keeps the original flow: prefill the full add form so
    // the user can review every field (category included) before it's saved.
    if (files.length === 1) {
      setError(null)
      setStep('processing')
      setProgress({ done: 0, total: 1 })
      try {
        const lines = await recognizeLines(files[0])
        const parsed = platform.parse(lines)
        const suggestion = getSuggestion(parsed.title, 'expense')
        navigate('/add', {
          state: {
            type: 'expense',
            categoryId: suggestion?.categoryId ?? platform.defaultCategoryId,
            subcategoryId: suggestion?.subcategoryId ?? platform.defaultSubcategoryId,
            amount: parsed.amount ?? undefined,
            date: parsed.date ?? undefined,
            title: parsed.title,
          },
        })
      } catch {
        setError('영수증을 읽지 못했어요. 다시 시도해주세요.')
        setStep('select')
      }
      return
    }

    // Multiple receipts: OCR each one, then land on an editable checklist so
    // several transactions can be created in one batch instead of one form at a time.
    setError(null)
    setStep('processing')
    setProgress({ done: 0, total: files.length })

    const results: Draft[] = []
    for (const file of files) {
      try {
        const lines = await recognizeLines(file)
        const parsed = platform.parse(lines)
        const suggestion = getSuggestion(parsed.title, 'expense')
        results.push({
          id: newId(),
          include: parsed.amount != null && parsed.amount > 0,
          displayName: parsed.merchant,
          date: parsed.date ?? todayISO(),
          amountText: parsed.amount != null ? String(parsed.amount) : '',
          title: parsed.title,
          categoryId: suggestion?.categoryId ?? platform.defaultCategoryId,
          subcategoryId: suggestion?.subcategoryId ?? platform.defaultSubcategoryId,
          failed: parsed.amount == null,
        })
      } catch {
        results.push({
          id: newId(),
          include: false,
          displayName: null,
          date: todayISO(),
          amountText: '',
          title: '',
          categoryId: platform.defaultCategoryId,
          subcategoryId: platform.defaultSubcategoryId,
          failed: true,
        })
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setSummary(null)
    setDrafts(results)
    setStep('review')
  }

  // One screenshot can list several payments (and several screenshots can be
  // uploaded together to cover more rows than fit in one capture), so every
  // row from every image is flattened into a single review checklist.
  async function handleScreenshotFiles(files: File[], platform: ScreenshotListPlatform) {
    setError(null)
    setStep('processing')
    setProgress({ done: 0, total: files.length })

    const results: Draft[] = []
    for (const file of files) {
      try {
        const lines = await recognizeLines(file)
        const parsedRows = platform.parse(lines, new Date().getFullYear())
        for (const r of parsedRows) {
          const suggestion = getSuggestion(r.merchant, 'expense')
          results.push({
            id: newId(),
            include: r.amount != null && r.amount > 0,
            displayName: r.merchant || null,
            date: r.date,
            amountText: r.amount != null ? String(r.amount) : '',
            title: r.merchant,
            categoryId: suggestion?.categoryId ?? platform.defaultCategoryId,
            subcategoryId: suggestion?.subcategoryId,
            failed: r.amount == null,
          })
        }
      } catch {
        // one unreadable screenshot shouldn't block the rest — it just
        // contributes zero rows instead of a placeholder, since one image can
        // hold many unrelated rows.
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setSummary(null)
    setDrafts(results)
    setStep('review')
  }

  async function handlePdfFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || activePlatform?.kind !== 'statement') return
    const platform = activePlatform.data

    setError(null)
    setStep('processing')

    try {
      const items = await extractPdfText(file, password || undefined)
      const parsedRows = platform.parse(items)
      const kept = parsedRows.filter((r) => !platform.shouldExclude(r) && r.date != null && r.withdrawal > 0)

      const results: Draft[] = kept.map((r) => {
        const suggestion = getSuggestion(r.counterparty ?? '', 'expense')
        return {
          id: newId(),
          include: true,
          displayName: r.counterparty,
          date: r.date as string,
          amountText: String(r.withdrawal),
          title: r.counterparty ?? '',
          categoryId: suggestion?.categoryId ?? platform.defaultCategoryId,
          subcategoryId: suggestion?.subcategoryId,
          failed: false,
        }
      })

      setSummary({ total: parsedRows.length, excluded: parsedRows.length - kept.length })
      setDrafts(results)
      setStep('review')
    } catch (err) {
      if (err instanceof PdfPasswordError) {
        setError(err.reason === 'wrong-password' ? '비밀번호가 올바르지 않아요.' : 'PDF 비밀번호를 입력해주세요.')
      } else {
        setError('PDF를 읽지 못했어요. 파일 형식을 확인해주세요.')
      }
      setStep('select')
    }
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  async function handleConfirm() {
    const toSave = drafts.filter((d) => d.include && Number(d.amountText) > 0)
    if (toSave.length === 0) return

    setSaving(true)
    for (const d of toSave) {
      await addTransaction({
        type: 'expense',
        amount: Number(d.amountText),
        categoryId: d.categoryId,
        subcategoryId: d.subcategoryId,
        date: d.date,
        title: d.title.trim(),
        memo: '',
      })
    }
    setSaving(false)
    navigate('/')
  }

  return (
    <div className="page">
      <header className="form-header">
        <button
          type="button"
          onClick={() => (step === 'review' ? backFromReview() : navigate(-1))}
          aria-label="뒤로"
        >
          <ChevronLeft size={22} />
        </button>
        <h1>파일 업로드</h1>
      </header>

      {step === 'select' && (
        <>
          <p className="section-hint">
            영수증 이미지, 은행 거래내역 PDF, 결제내역 스크린샷을 올리면 지출 내역을 자동으로 읽어와요. 결제내역
            캡처는 "결제" 탭으로 필터링한 화면으로 올려주세요.
          </p>

          <div className="platform-list">
            {RECEIPT_PLATFORMS.map((platform) => (
              <button
                key={`receipt-${platform.id}`}
                type="button"
                className="platform-row"
                onClick={() => choosePlatform({ kind: 'receipt', data: platform })}
              >
                <span className="transaction-icon platform-icon">
                  <Receipt size={20} />
                </span>
                <span className="platform-text">
                  <span className="platform-label">{platform.label}</span>
                  <span className="platform-sub">영수증 이미지</span>
                </span>
              </button>
            ))}
            {STATEMENT_PLATFORMS.map((platform) => (
              <button
                key={`statement-${platform.id}`}
                type="button"
                className="platform-row"
                onClick={() => choosePlatform({ kind: 'statement', data: platform })}
              >
                <span className="transaction-icon platform-icon">
                  <FileText size={20} />
                </span>
                <span className="platform-text">
                  <span className="platform-label">{platform.label}</span>
                  <span className="platform-sub">PDF 명세서</span>
                </span>
              </button>
            ))}
            {SCREENSHOT_LIST_PLATFORMS.map((platform) => (
              <button
                key={`screenshot-${platform.id}`}
                type="button"
                className="platform-row"
                onClick={() => choosePlatform({ kind: 'screenshot-list', data: platform })}
              >
                <span className="transaction-icon platform-icon">
                  <ImageIcon size={20} />
                </span>
                <span className="platform-text">
                  <span className="platform-label">{platform.label}</span>
                  <span className="platform-sub">결제내역 캡처</span>
                </span>
              </button>
            ))}
          </div>

          {activePlatform?.kind === 'statement' && (
            <div className="settings-section">
              <span className="field-label">{activePlatform.data.label}</span>
              {activePlatform.data.requiresPassword && (
                <input
                  type="password"
                  placeholder="PDF 비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              <button
                type="button"
                className="save-button"
                disabled={activePlatform.data.requiresPassword && !password}
                onClick={() => pdfInputRef.current?.click()}
              >
                PDF 선택
              </button>
            </div>
          )}

          {error && <p className="receipt-error">{error}</p>}
        </>
      )}

      {step === 'review' && (
        <>
          {summary && (
            <p className="section-hint">
              전체 {summary.total}건 중 {summary.excluded}건 제외하고 {drafts.length}건을 가져왔어요.
            </p>
          )}

          <div className="draft-summary">
            <span>{selectedCount}건 선택</span>
            <span>합계 {formatWon(selectedTotal)}</span>
          </div>

          <div className="draft-list">
            {drafts.map((d) => {
              const draftCategory = getCategory(d.categoryId)
              return (
                <div key={d.id} className={`draft-row${d.include ? '' : ' excluded'}`}>
                  <input
                    type="checkbox"
                    checked={d.include}
                    onChange={(e) => updateDraft(d.id, { include: e.target.checked })}
                    aria-label="이 내역 포함"
                  />
                  <span
                    className="transaction-icon"
                    style={{ background: `${draftCategory.color}22`, color: draftCategory.color }}
                  >
                    <CategoryIcon name={draftCategory.icon} size={18} />
                  </span>
                  <div className="draft-main">
                    <div className="draft-top">
                      <span className="draft-merchant">{d.displayName ?? '거래처 인식 실패'}</span>
                      <span className="draft-date">{d.date}</span>
                    </div>
                    <select
                      className="draft-category-select"
                      value={d.categoryId}
                      onChange={(e) =>
                        updateDraft(d.id, {
                          categoryId: e.target.value,
                          subcategoryId: e.target.value === d.categoryId ? d.subcategoryId : undefined,
                        })
                      }
                    >
                      {categoriesFor('expense').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    {draftCategory.subcategories && draftCategory.subcategories.some((s) => !s.hidden) && (
                      <select
                        className="draft-category-select"
                        value={d.subcategoryId ?? ''}
                        onChange={(e) => updateDraft(d.id, { subcategoryId: e.target.value || undefined })}
                      >
                        <option value="">세부 구분 없음</option>
                        {draftCategory.subcategories
                          .filter((s) => !s.hidden)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                      </select>
                    )}
                    <input
                      type="text"
                      className="draft-memo-input"
                      value={d.title}
                      onChange={(e) => updateDraft(d.id, { title: e.target.value })}
                      placeholder="내용 (예: 스타벅스 아메리카노)"
                    />
                    {d.failed && <span className="draft-warning">금액 인식 실패 — 직접 입력해주세요</span>}
                  </div>
                  <div className="draft-amount">
                    <input
                      inputMode="numeric"
                      className="draft-amount-input"
                      value={d.amountText ? Number(d.amountText).toLocaleString('ko-KR') : ''}
                      placeholder="0"
                      onChange={(e) => updateDraft(d.id, { amountText: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                    <span>원</span>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="save-button"
            disabled={selectedCount === 0 || saving}
            onClick={handleConfirm}
          >
            {saving ? '저장 중...' : `선택한 ${selectedCount}건 한번에 추가`}
          </button>
        </>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="visually-hidden"
        onChange={handleImageFiles}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="visually-hidden"
        onChange={handlePdfFile}
      />

      {step === 'processing' && (
        <div className="loading-overlay">
          <div className="loading-card">
            <LoaderCircle size={28} className="spin" />
            <span>
              {activePlatform?.kind === 'receipt' &&
                `영수증 분석 중${progress.total > 1 ? ` (${progress.done}/${progress.total})` : '...'}`}
              {activePlatform?.kind === 'screenshot-list' &&
                `스크린샷 분석 중${progress.total > 1 ? ` (${progress.done}/${progress.total})` : '...'}`}
              {activePlatform?.kind === 'statement' && 'PDF 분석 중...'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
