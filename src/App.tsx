import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import Layout from './routes/Layout'
import HealthCheckPage from './routes/HealthCheckPage'
import LoginPage from './routes/LoginPage'
import AccessNoticePage from './routes/AccessNoticePage'
import RequireAuth from './auth/RequireAuth'
import RequirePermission from './auth/RequirePermission'
import RequireWarehouseAccess from './auth/RequireWarehouseAccess'
import { usePermissions } from './auth/permissions'
import ProfilePage from './features/profile/ProfilePage'
import UserListPage from './features/users/UserListPage'
import WarehouseAssignmentsPage from './features/warehouseAssignments/WarehouseAssignmentsPage'
import WarehouseListPage from './features/warehouses/WarehouseListPage'
import WarehouseDetailPage from './features/warehouses/WarehouseDetailPage'
import ItemListPage from './features/items/ItemListPage'
import ItemDetailPage from './features/items/ItemDetailPage'
import ItemImportPage from './features/items/ItemImportPage'
import ContactListPage from './features/contacts/ContactListPage'
import StockListPage from './features/stocks/StockListPage'
import StockMutationListPage from './features/stockMutations/StockMutationListPage'
import CostLayerListPage from './features/costLayers/CostLayerListPage'
import InventoryTransactionListPage from './features/inventoryTransactions/InventoryTransactionListPage'
import InventoryTransactionFormPage from './features/inventoryTransactions/InventoryTransactionFormPage'
import InventoryTransactionDetailPage from './features/inventoryTransactions/InventoryTransactionDetailPage'
import InventoryTransactionPrintPage from './features/inventoryTransactions/InventoryTransactionPrintPage'
import StockTransferListPage from './features/stockTransfers/StockTransferListPage'
import StockTransferFormPage from './features/stockTransfers/StockTransferFormPage'
import StockTransferDetailPage from './features/stockTransfers/StockTransferDetailPage'
import StockOpnameListPage from './features/stockOpnames/StockOpnameListPage'
import StockOpnameFormPage from './features/stockOpnames/StockOpnameFormPage'
import StockOpnameDetailPage from './features/stockOpnames/StockOpnameDetailPage'
import InvoiceListPage from './features/invoices/InvoiceListPage'
import InvoiceFormPage from './features/invoices/InvoiceFormPage'
import InvoiceDetailPage from './features/invoices/InvoiceDetailPage'
import InvoicePrintPage from './features/invoices/InvoicePrintPage'
import AllInvoicesListPage from './features/invoices/AllInvoicesListPage'
import ReturnListPage from './features/returns/ReturnListPage'
import ReturnFormPage from './features/returns/ReturnFormPage'
import ReturnDetailPage from './features/returns/ReturnDetailPage'
import DashboardPage from './features/dashboard/DashboardPage'
import ActivityLogListPage from './features/activityLogs/ActivityLogListPage'
import CashSessionPage from './features/cashSessions/CashSessionPage'

export default function App() {
  const { canManageUsers, canViewActivityLogs, canWrite } = usePermissions()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/health" element={<HealthCheckPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          {/* Halaman notice buat staff yang belum di-assign ke warehouse mana pun (§17) — sengaja
              DI LUAR RequireWarehouseAccess di bawah, kalau tidak bakal loop redirect. */}
          <Route path="/access-notice" element={<AccessNoticePage />} />

          <Route element={<RequireWarehouseAccess />}>
            {/* Halaman cetak (invoice & surat jalan) sengaja di luar <Layout/> — tidak perlu
                sidebar/header/footer nyampur pas di-print jadi PDF. */}
            <Route path="/sales/:id/print" element={<InvoicePrintPage kind="sales" title="Sales" />} />
            <Route path="/purchases/:id/print" element={<InvoicePrintPage kind="purchase" title="Purchase" />} />
            <Route path="/inbounds/:id/print" element={<InventoryTransactionPrintPage kind="inbound" />} />
            <Route path="/outbounds/:id/print" element={<InventoryTransactionPrintPage kind="outbound" />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {/* Self-scoped (§20, 2026-09-13) — tidak ada gating permission, sama seperti
                  Profile: backend sendiri tidak mendokumentasikan pembatasan role buat buka sesi
                  kasir, dan endpoint `/cash-sessions/current` otomatis cuma balikin sesi milik
                  user yang login. */}
              <Route path="/cash-session" element={<CashSessionPage />} />

              <Route element={<RequirePermission allowed={canManageUsers()} />}>
                <Route path="/users" element={<UserListPage />} />
                <Route path="/warehouse-assignments" element={<WarehouseAssignmentsPage />} />
              </Route>

              <Route path="/warehouses" element={<WarehouseListPage />} />
              <Route path="/warehouses/:id" element={<WarehouseDetailPage />} />
              <Route path="/items" element={<ItemListPage />} />
              {/* Import/export (§25-26) — sama gating dengan tombol "+ Tambah Item" di
                  ItemListPage (canWrite('items')); pembatasan super-admin buat Import spesifik
                  ditangani di dalam ItemImportPage sendiri (Export tetap boleh). */}
              <Route element={<RequirePermission allowed={canWrite('items')} />}>
                <Route path="/items/import" element={<ItemImportPage />} />
              </Route>
              <Route path="/items/:id" element={<ItemDetailPage />} />
              <Route path="/contacts" element={<ContactListPage />} />
              <Route path="/stocks" element={<StockListPage />} />
              <Route path="/stock-mutations" element={<StockMutationListPage />} />
              <Route path="/cost-layers" element={<CostLayerListPage />} />

              {/* Activity Logs di-scope per BU di backend (2026-09-09) — super-admin / admin-bu / owner. */}
              <Route element={<RequirePermission allowed={canViewActivityLogs()} />}>
                <Route path="/activity-logs" element={<ActivityLogListPage />} />
              </Route>

              <Route path="/inbounds" element={<InventoryTransactionListPage kind="inbound" title="Inbound" />} />
              <Route
                path="/inbounds/new"
                element={<InventoryTransactionFormPage kind="inbound" title="Inbound" />}
              />
              <Route
                path="/inbounds/:id"
                element={<InventoryTransactionDetailPage kind="inbound" title="Inbound" />}
              />
              <Route
                path="/inbounds/:id/edit"
                element={<InventoryTransactionFormPage kind="inbound" title="Inbound" />}
              />

              <Route
                path="/outbounds"
                element={<InventoryTransactionListPage kind="outbound" title="Outbound" />}
              />
              <Route
                path="/outbounds/new"
                element={<InventoryTransactionFormPage kind="outbound" title="Outbound" />}
              />
              <Route
                path="/outbounds/:id"
                element={<InventoryTransactionDetailPage kind="outbound" title="Outbound" />}
              />
              <Route
                path="/outbounds/:id/edit"
                element={<InventoryTransactionFormPage kind="outbound" title="Outbound" />}
              />

              <Route path="/stock-transfers" element={<StockTransferListPage />} />
              <Route path="/stock-transfers/new" element={<StockTransferFormPage />} />
              <Route path="/stock-transfers/:id" element={<StockTransferDetailPage />} />
              <Route path="/stock-transfers/:id/edit" element={<StockTransferFormPage />} />

              <Route path="/stock-opnames" element={<StockOpnameListPage />} />
              <Route path="/stock-opnames/new" element={<StockOpnameFormPage />} />
              <Route path="/stock-opnames/:id" element={<StockOpnameDetailPage />} />
              <Route path="/stock-opnames/:id/edit" element={<StockOpnameFormPage />} />

              <Route path="/sales" element={<InvoiceListPage kind="sales" title="Sales" />} />
              <Route path="/sales/new" element={<InvoiceFormPage kind="sales" title="Sales" />} />
              <Route path="/sales/:id" element={<InvoiceDetailPage kind="sales" title="Sales" />} />
              <Route path="/sales/:id/edit" element={<InvoiceFormPage kind="sales" title="Sales" />} />

              <Route path="/purchases" element={<InvoiceListPage kind="purchase" title="Purchase" />} />
              <Route path="/purchases/new" element={<InvoiceFormPage kind="purchase" title="Purchase" />} />
              <Route path="/purchases/:id" element={<InvoiceDetailPage kind="purchase" title="Purchase" />} />
              <Route path="/purchases/:id/edit" element={<InvoiceFormPage kind="purchase" title="Purchase" />} />

              <Route path="/invoices" element={<AllInvoicesListPage />} />

              <Route path="/returns" element={<ReturnListPage />} />
              <Route path="/returns/new" element={<ReturnFormPage />} />
              <Route path="/returns/:id" element={<ReturnDetailPage />} />
              <Route path="/returns/:id/edit" element={<ReturnFormPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
