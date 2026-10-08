import type { VendorStatus } from '../types'
import { useSupabaseAuth } from './useSupabaseAuth'

export interface VendorRecord {
  id: string
  vendor_code: string
  name: string
  service_category: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  logo_storage_path: string | null
  status: VendorStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface VendorInput {
  vendor_code: string
  name: string
  service_category: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  status: VendorStatus
  notes?: string
}

export interface VendorLogoFile {
  name: string
  type: string
  size: number
  file: File
}

export function useVendors() {
  const { supabase } = useSupabaseAuth()

  async function list(search = '') {
    let query = supabase
      .from('vendors')
      .select('id, vendor_code, name, service_category, contact_name, contact_email, contact_phone, logo_storage_path, status, notes, created_at, updated_at')
      .order('created_at', { ascending: false })

    const normalizedSearch = search.trim()
    if (normalizedSearch) {
      query = query.or(`name.ilike.%${normalizedSearch}%,vendor_code.ilike.%${normalizedSearch}%,service_category.ilike.%${normalizedSearch}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as VendorRecord[]
  }

  async function get(id: string) {
    const { data, error } = await supabase
      .from('vendors')
      .select('id, vendor_code, name, service_category, contact_name, contact_email, contact_phone, logo_storage_path, status, notes, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as VendorRecord
  }

  async function create(input: VendorInput, logo?: VendorLogoFile | null) {
    const { data, error } = await supabase
      .from('vendors')
      .insert(normalizeVendorInput(input))
      .select('id, vendor_code, name, service_category, contact_name, contact_email, contact_phone, logo_storage_path, status, notes, created_at, updated_at')
      .single()

    if (error) throw error
    const vendor = data as VendorRecord

    if (logo) {
      try {
        await uploadLogo(vendor.id, logo)
        return await get(vendor.id)
      } catch (uploadError) {
        await supabase.from('vendors').delete().eq('id', vendor.id)
        throw uploadError
      }
    }

    return vendor
  }

  async function update(id: string, input: VendorInput, logo?: VendorLogoFile | null, removeLogo = false) {
    const current = await get(id)
    const { data, error } = await supabase
      .from('vendors')
      .update({
        ...normalizeVendorInput(input),
        ...(logo || removeLogo ? { logo_storage_path: null } : {}),
      })
      .eq('id', id)
      .select('id, vendor_code, name, service_category, contact_name, contact_email, contact_phone, logo_storage_path, status, notes, created_at, updated_at')
      .single()

    if (error) throw error
    const vendor = data as VendorRecord

    if (removeLogo && current.logo_storage_path) {
      const { error: removeError } = await supabase.storage.from('vendor-logos').remove([current.logo_storage_path])
      if (removeError) throw removeError
    }

    if (logo) {
      try {
        await uploadLogo(id, logo)
        if (current.logo_storage_path) {
          const { error: removeError } = await supabase.storage.from('vendor-logos').remove([current.logo_storage_path])
          if (removeError) throw removeError
        }
        return await get(id)
      } catch (uploadError) {
        throw uploadError
      }
    }

    return vendor
  }

  async function remove(id: string) {
    const vendor = await get(id)
    const { count, error: contractsError } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', id)

    if (contractsError) throw contractsError
    if ((count ?? 0) > 0) {
      throw new Error('VENDOR_HAS_CONTRACTS')
    }

    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if (error) throw error

    if (vendor.logo_storage_path) {
      const { error: storageError } = await supabase.storage.from('vendor-logos').remove([vendor.logo_storage_path])
      if (storageError) {
        console.error('Vendor deleted, but its logo cleanup failed:', storageError)
      }
    }
  }

  async function uploadLogo(vendorId: string, logo: VendorLogoFile) {
    validateLogo(logo)
    const extension = extensionByMime[logo.type]
    const objectPath = `${vendorId}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('vendor-logos')
      .upload(objectPath, logo.file, { contentType: logo.type, upsert: false })

    if (uploadError) throw uploadError

    const { error: updateError } = await supabase
      .from('vendors')
      .update({ logo_storage_path: objectPath })
      .eq('id', vendorId)

    if (updateError) {
      await supabase.storage.from('vendor-logos').remove([objectPath])
      throw updateError
    }
  }

  async function getLogoUrl(path: string) {
    const { data, error } = await supabase.storage.from('vendor-logos').createSignedUrl(path, 60)
    if (error) throw error
    return data.signedUrl
  }

  function subscribe(onChange: () => void) {
    const channel = supabase
      .channel('vendors-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, onChange)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }

  return { list, get, create, update, remove, uploadLogo, getLogoUrl, subscribe }
}

const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function validateLogo(logo: VendorLogoFile) {
  if (!extensionByMime[logo.type]) {
    throw new Error('Logo must be a JPEG, PNG, or WebP image.')
  }
  if (logo.size <= 0 || logo.size > 5 * 1024 * 1024) {
    throw new Error('Logo must be no larger than 5 MB.')
  }
}

function normalizeVendorInput(input: VendorInput) {
  return {
    vendor_code: input.vendor_code.trim(),
    name: input.name.trim(),
    service_category: input.service_category.trim(),
    contact_name: input.contact_name?.trim() || null,
    contact_email: input.contact_email?.trim() || null,
    contact_phone: input.contact_phone?.trim() || null,
    status: input.status,
    notes: input.notes?.trim() || null,
  }
}
