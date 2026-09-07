import { supabase } from './supabase'

// ── SKU ──────────────────────────────────────────────
const toSku = (row) => ({
  id: row.id,
  eanCode: row.ean_code,
  productName: row.product_name,
  adminProductName: row.admin_product_name,
  unitPrice: row.unit_price,
  createdAt: row.created_at,
})

const fromSku = (s) => ({
  id: s.id,
  ean_code: s.eanCode,
  product_name: s.productName,
  admin_product_name: s.adminProductName,
  unit_price: s.unitPrice || 0,
})

export const fetchSkus = async () => {
  const { data, error } = await supabase.from('skus').select('*').order('created_at')
  if (error) throw error
  return data.map(toSku)
}

export const upsertSku = async (sku) => {
  const { data, error } = await supabase.from('skus').upsert(fromSku(sku)).select().single()
  if (error) throw error
  return toSku(data)
}

export const deleteSku = async (id) => {
  const { error } = await supabase.from('skus').delete().eq('id', id)
  if (error) throw error
}

// ── ENTRIES ──────────────────────────────────────────
const toEntry = (row) => ({
  id: row.id,
  skuId: row.sku_id,
  squad: row.squad,
  manager: row.manager,
  salesChannel: row.sales_channel,
  backorderQty: row.backorder_qty,
  securedQty: row.secured_qty || 0,
  orderStatus: row.order_status,
  secured: row.secured,
  month: row.month,
  createdAt: row.created_at,
})

const fromEntry = (e) => ({
  id: e.id,
  sku_id: e.skuId,
  squad: e.squad,
  manager: e.manager,
  sales_channel: e.salesChannel,
  backorder_qty: e.backorderQty,
  secured_qty: e.securedQty || 0,
  order_status: e.orderStatus,
  secured: e.secured,
  month: e.month,
})

export const fetchEntries = async () => {
  const { data, error } = await supabase.from('entries').select('*').order('created_at')
  if (error) throw error
  return data.map(toEntry)
}

export const upsertEntry = async (entry) => {
  const { data, error } = await supabase.from('entries').upsert(fromEntry(entry)).select().single()
  if (error) throw error
  return toEntry(data)
}

export const deleteEntry = async (id) => {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw error
}

export const upsertEntries = async (entryList) => {
  const { data, error } = await supabase.from('entries').upsert(entryList.map(fromEntry)).select()
  if (error) throw error
  return data.map(toEntry)
}

// ── SETTINGS ─────────────────────────────────────────
export const fetchSettings = async () => {
  const { data: rows, error } = await supabase.from('settings').select('data').eq('id', 1).limit(1)
  if (error) throw error
  return rows?.[0]?.data || null
}

export const saveSettings = async (settings) => {
  const { error } = await supabase.from('settings').upsert({ id: 1, data: settings })
  if (error) throw error
}

// ── FEEDBACK NOTES ────────────────────────────────────
export const fetchFeedbackNotes = async () => {
  const { data, error } = await supabase.from('feedback_notes').select('*')
  if (error) throw error
  const notes = {}
  data.forEach(row => { notes[row.month] = row.note })
  return notes
}

export const saveFeedbackNote = async (month, note) => {
  const { error } = await supabase.from('feedback_notes').upsert({ month, note })
  if (error) throw error
}

// ── AUTHORIZED EMAILS ─────────────────────────────────
export const fetchAuthorizedEmails = async () => {
  const { data, error } = await supabase.from('authorized_emails').select('*').order('created_at')
  if (error) throw error
  return data.map(row => ({ id: row.id, email: row.email, name: row.name || '', createdAt: row.created_at }))
}

export const addAuthorizedEmail = async ({ email, name }) => {
  const { data, error } = await supabase
    .from('authorized_emails')
    .insert({ email: email.toLowerCase().trim(), name: name || '' })
    .select().single()
  if (error) throw error
  return { id: data.id, email: data.email, name: data.name, createdAt: data.created_at }
}

export const removeAuthorizedEmail = async (id) => {
  const { error } = await supabase.from('authorized_emails').delete().eq('id', id)
  if (error) throw error
}
