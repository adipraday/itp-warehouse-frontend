// §19 frontend-integration-guide.md (2026-09-13) — cetak struk ke printer thermal. SALES-only
// (tidak ada endpoint setara di Purchase). `warehouse`/`business_unit`/`customer` bisa `null`
// (mis. `contact_id` tidak diisi → walk-in customer).
export interface ReceiptWarehouse {
  id: number
  code: string
  name: string
  address: string | null
}

export interface ReceiptBusinessUnit {
  id: number
  name: string
}

export interface ReceiptCustomer {
  id: number
  name: string
}

export interface ReceiptItem {
  sku: string
  name: string
  quantity: number
  unit_price: string
  amount: string
}

export interface ReceiptPayment {
  method: string
  amount: string
  amount_tendered: string
  change_amount: string
  payment_date: string
}

export interface Receipt {
  invoice_number: string
  invoice_date: string
  warehouse: ReceiptWarehouse | null
  business_unit: ReceiptBusinessUnit | null
  customer: ReceiptCustomer | null
  cashier_user_id: number
  items: ReceiptItem[]
  subtotal: string
  discount_amount: string
  tax: string
  total_amount: string
  payments: ReceiptPayment[]
  amount_paid: string
  balance_due: string
  paper_width_mm: 58 | 80
  // Teks polos siap tampil — dipakai buat preview struk di layar (`<pre>`/font monospace) atau
  // print ke printer non-ESC/POS.
  text_lines: string[]
  // Byte ESC/POS lengkap (base64, sudah termasuk perintah cut kertas di akhir) — decode jadi
  // `Uint8Array` dan tulis langsung ke printer via Web Bluetooth. Tidak perlu paham format
  // ESC/POS di frontend, itu semua sudah diurus backend.
  escpos_base64: string
}
