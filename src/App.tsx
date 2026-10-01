import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CategoriesProvider } from './context/CategoriesContext'
import { FixedExpensesProvider } from './context/FixedExpensesContext'
import { MerchantRulesProvider } from './context/MerchantRulesContext'
import { TransactionsProvider } from './context/TransactionsContext'
import { CategoryDetail } from './pages/CategoryDetail'
import { FixedExpenses } from './pages/FixedExpenses'
import { Home } from './pages/Home'
import { MessageAdd } from './pages/MessageAdd'
import { Settings } from './pages/Settings'
import { Stats } from './pages/Stats'
import { TransactionForm } from './pages/TransactionForm'

// pdfjs-dist (used for statement PDFs) is large, so this page is code-split
// and only fetched when the user actually opens it — otherwise every visit to
// the app would eagerly download a PDF parsing library nobody asked for.
const FileUpload = lazy(() => import('./pages/FileUpload').then((m) => ({ default: m.FileUpload })))

export default function App() {
  return (
    <CategoriesProvider>
      <MerchantRulesProvider>
        <TransactionsProvider>
          <FixedExpensesProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/add" element={<TransactionForm />} />
              <Route path="/edit/:id" element={<TransactionForm />} />
              <Route path="/category/:categoryId" element={<CategoryDetail />} />
              <Route path="/message" element={<MessageAdd />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/fixed-expenses" element={<FixedExpenses />} />
              <Route
                path="/upload"
                element={
                  <Suspense fallback={<div className="page" />}>
                    <FileUpload />
                  </Suspense>
                }
              />
            </Routes>
          </FixedExpensesProvider>
        </TransactionsProvider>
      </MerchantRulesProvider>
    </CategoriesProvider>
  )
}
