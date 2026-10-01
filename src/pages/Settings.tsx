import { ExternalLink, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { CategoryIcon, isValidIconName } from '../components/CategoryIcon'
import { useCategories } from '../context/CategoriesContext'
import { useTransactions } from '../context/TransactionsContext'
import type { Category, TransactionType } from '../types'
import { getSheetsWebhookUrl, setSheetsWebhookUrl } from '../utils/settings'

export function Settings() {
  const {
    expenseCategories,
    incomeCategories,
    customCategories,
    customSubcategories,
    addCategory,
    deleteCategory,
    hideCategory,
    unhideCategory,
    getCategory,
    addSubcategory,
    deleteSubcategory,
    hideSubcategory,
    unhideSubcategory,
  } = useCategories()
  const { transactions } = useTransactions()

  const [sheetsUrlDraft, setSheetsUrlDraft] = useState(() => getSheetsWebhookUrl() ?? '')
  const [sheetsSaved, setSheetsSaved] = useState(false)

  const [newType, setNewType] = useState<TransactionType>('expense')
  const [newLabel, setNewLabel] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newColor, setNewColor] = useState('#6C5CE7')
  const [adding, setAdding] = useState(false)
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null)

  const [subCategoryId, setSubCategoryId] = useState('')
  const [newSubLabel, setNewSubLabel] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [subcategoryMessage, setSubcategoryMessage] = useState<string | null>(null)

  // These are one-off confirmations, not permanent labels — fade them out on
  // their own instead of leaving them stuck on screen forever.
  useEffect(() => {
    if (!categoryMessage) return
    const timer = setTimeout(() => setCategoryMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [categoryMessage])

  useEffect(() => {
    if (!subcategoryMessage) return
    const timer = setTimeout(() => setSubcategoryMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [subcategoryMessage])

  function handleSaveSheetsUrl() {
    setSheetsWebhookUrl(sheetsUrlDraft.trim())
    setSheetsSaved(true)
  }

  const iconLooksValid = newIcon.trim() === '' || isValidIconName(newIcon)

  async function handleAddCategory() {
    const label = newLabel.trim()
    const icon = newIcon.trim()
    if (!label || !icon) return
    setAdding(true)
    await addCategory({ type: newType, label, icon, color: newColor })
    setNewLabel('')
    setNewIcon('')
    setAdding(false)
  }

  async function handleRemoveCategory(category: Category) {
    const usageCount = transactions.filter((t) => t.categoryId === category.id).length
    if (usageCount === 0) {
      await deleteCategory(category.id)
      setCategoryMessage(`"${category.label}" 카테고리를 삭제했어요.`)
    } else {
      await hideCategory(category.id)
      setCategoryMessage(`"${category.label}"은(는) ${usageCount}건의 내역에서 사용 중이라 숨김 처리했어요.`)
    }
  }

  async function handleUnhide(category: Category) {
    await unhideCategory(category.id)
    setCategoryMessage(`"${category.label}"을(를) 다시 표시해요.`)
  }

  async function handleAddSubcategory() {
    const label = newSubLabel.trim()
    if (!subCategoryId || !label) return
    setAddingSub(true)
    await addSubcategory(subCategoryId, label)
    setNewSubLabel('')
    setAddingSub(false)
  }

  async function handleRemoveSubcategory(subcategoryId: string, label: string) {
    const usageCount = transactions.filter((t) => t.subcategoryId === subcategoryId).length
    if (usageCount === 0) {
      await deleteSubcategory(subcategoryId)
      setSubcategoryMessage(`"${label}" 세부 구분을 삭제했어요.`)
    } else {
      await hideSubcategory(subcategoryId)
      setSubcategoryMessage(`"${label}"은(는) ${usageCount}건의 내역에서 사용 중이라 숨김 처리했어요.`)
    }
  }

  async function handleUnhideSubcategory(subcategoryId: string, label: string) {
    await unhideSubcategory(subcategoryId)
    setSubcategoryMessage(`"${label}"을(를) 다시 표시해요.`)
  }

  const visibleList = newType === 'expense' ? expenseCategories : incomeCategories
  const hiddenCustom = customCategories.filter((c) => c.type === newType && c.hidden)
  const subCategoryTarget = subCategoryId ? getCategory(subCategoryId) : null
  const isCustomSubcategory = (id: string) => customSubcategories.some((s) => s.id === id)
  const visibleSubcategories = subCategoryTarget?.subcategories?.filter((s) => !s.hidden) ?? []
  const hiddenSubcategories = subCategoryTarget?.subcategories?.filter((s) => s.hidden) ?? []

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="app-title">설정</h1>
      </header>

      <div className="settings-section">
        <span className="field-label">카테고리 추가</span>
        <p className="section-hint">
          아이콘 이름은 lucide.dev/icons 에서 찾은 이름을 그대로 입력하면 돼요 (예: PartyPopper).
        </p>

        <div className="type-toggle">
          <button
            type="button"
            className={newType === 'expense' ? 'active' : ''}
            onClick={() => setNewType('expense')}
          >
            지출
          </button>
          <button type="button" className={newType === 'income' ? 'active' : ''} onClick={() => setNewType('income')}>
            수입
          </button>
        </div>

        <div className="category-add-row">
          {newIcon.trim() && (
            <span className="transaction-icon" style={{ background: `${newColor}22`, color: newColor }}>
              <CategoryIcon name={newIcon} size={18} />
            </span>
          )}
          <input
            type="text"
            placeholder="카테고리 이름"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <input
            type="color"
            className="category-color-input"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
          />
        </div>

        <div className="category-add-row">
          <input
            type="text"
            placeholder="아이콘 이름 (예: PartyPopper)"
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
          />
          <a
            href="https://lucide.dev/icons"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-site-link"
            aria-label="lucide.dev에서 아이콘 찾아보기"
          >
            <ExternalLink size={16} />
          </a>
        </div>
        {!iconLooksValid && <p className="receipt-error">이 이름의 아이콘을 찾을 수 없어요. 철자를 확인해주세요.</p>}

        <button
          type="button"
          className="save-button"
          disabled={!newLabel.trim() || !newIcon.trim() || adding}
          onClick={handleAddCategory}
        >
          카테고리 추가
        </button>

        {categoryMessage && <p className="backup-message">{categoryMessage}</p>}

        <span className="field-label">{newType === 'expense' ? '지출' : '수입'} 카테고리</span>
        <div className="category-list-preview">
          {visibleList.map((c) => (
            <span key={c.id} className="category-pill">
              <span className="transaction-icon" style={{ background: `${c.color}22`, color: c.color }}>
                <CategoryIcon name={c.icon} size={14} />
              </span>
              {c.label}
              {c.type && (
                <button
                  type="button"
                  className="category-pill-action"
                  onClick={() => handleRemoveCategory(c)}
                  aria-label={`${c.label} 삭제`}
                >
                  <X size={16} />
                </button>
              )}
            </span>
          ))}
        </div>

        {hiddenCustom.length > 0 && (
          <>
            <span className="field-label">숨겨진 카테고리</span>
            <div className="category-list-preview">
              {hiddenCustom.map((c) => (
                <span key={c.id} className="category-pill hidden">
                  <span className="transaction-icon" style={{ background: `${c.color}22`, color: c.color }}>
                    <CategoryIcon name={c.icon} size={14} />
                  </span>
                  {c.label}
                  <button
                    type="button"
                    className="category-pill-action"
                    onClick={() => handleUnhide(c)}
                    aria-label={`${c.label} 다시 표시`}
                  >
                    <RotateCcw size={16} />
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <span className="field-label">세부 구분 추가</span>
        <p className="section-hint">
          카테고리를 고르고 세부 구분 이름을 입력하면, 그 카테고리를 고를 때 내용 아래에 세부 구분 칩으로 나타나요.
        </p>

        <select value={subCategoryId} onChange={(e) => setSubCategoryId(e.target.value)}>
          <option value="">카테고리 선택</option>
          <optgroup label="지출">
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="수입">
            {incomeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        </select>

        <input
          type="text"
          placeholder="세부 구분 이름 (예: 야식)"
          value={newSubLabel}
          onChange={(e) => setNewSubLabel(e.target.value)}
        />

        <button
          type="button"
          className="save-button"
          disabled={!subCategoryId || !newSubLabel.trim() || addingSub}
          onClick={handleAddSubcategory}
        >
          세부 구분 추가
        </button>

        {subcategoryMessage && <p className="backup-message">{subcategoryMessage}</p>}

        {subCategoryTarget && (
          <div className="category-list-preview">
            {visibleSubcategories.length > 0 ? (
              visibleSubcategories.map((s) => (
                <span key={s.id} className="category-pill">
                  {s.label}
                  {isCustomSubcategory(s.id) && (
                    <button
                      type="button"
                      className="category-pill-action"
                      onClick={() => handleRemoveSubcategory(s.id, s.label)}
                      aria-label={`${s.label} 삭제`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <p className="section-hint">아직 세부 구분이 없어요.</p>
            )}
          </div>
        )}

        {hiddenSubcategories.length > 0 && (
          <>
            <span className="field-label">숨겨진 세부 구분</span>
            <div className="category-list-preview">
              {hiddenSubcategories.map((s) => (
                <span key={s.id} className="category-pill hidden">
                  {s.label}
                  <button
                    type="button"
                    className="category-pill-action"
                    onClick={() => handleUnhideSubcategory(s.id, s.label)}
                    aria-label={`${s.label} 다시 표시`}
                  >
                    <RotateCcw size={16} />
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <span className="field-label">구글 시트 연동 URL</span>
        <p className="section-hint">
          통계 화면의 "구글 시트로" 버튼을 눌렀을 때 데이터를 보낼 Apps Script 웹앱 주소예요.
        </p>
        <div className="inline-field-row">
          <input
            type="text"
            placeholder="Apps Script 웹앱 URL을 붙여넣으세요"
            value={sheetsUrlDraft}
            onChange={(e) => {
              setSheetsUrlDraft(e.target.value)
              setSheetsSaved(false)
            }}
          />
          <button type="button" className="inline-field-save" onClick={handleSaveSheetsUrl}>
            {sheetsSaved ? '저장됨' : '저장'}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
