import type { ContractCurrency, ContractStatus } from '../types'
import { Upload } from 'tus-js-client'
import { useSupabaseAuth } from './useSupabaseAuth'

export interface ContractRecord {
  id: string
  contract_number: string
  vendor_id: string
  title: string
  start_date: string
  end_date: string
  contract_value: number | null
  currency: ContractCurrency | null
  status: ContractStatus
  owner_name: string
  notes: string | null
  created_at: string
  updated_at: string
  vendor?: { id: string; name: string; vendor_code: string }
}

export interface ContractInput {
  contract_number: string
  vendor_id: string
  title: string
  start_date: string
  end_date: string
  contract_value?: number | null
  currency?: ContractCurrency | null
  status: ContractStatus
  owner_name: string
  notes?: string
}

export interface ContractDocument {
  id: string
  contract_id: string
  storage_path: string
  original_name: string
  mime_type: string
  file_size_bytes: number
  created_at: string
}

export function useContracts() {
  const { supabase } = useSupabaseAuth()
  const columns = 'id, contract_number, vendor_id, title, start_date, end_date, contract_value, currency, status, owner_name, notes, created_at, updated_at, vendor:vendors(id, name, vendor_code)'

  async function list(search = '') {
    let query = supabase
      .from('contracts')
      .select(columns)
      .order('end_date', { ascending: true })

    const normalizedSearch = search.trim()
    if (normalizedSearch) {
      query = query.or(`contract_number.ilike.%${normalizedSearch}%,title.ilike.%${normalizedSearch}%,owner_name.ilike.%${normalizedSearch}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as unknown as ContractRecord[]
  }

  async function get(id: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select(columns)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as unknown as ContractRecord
  }

  async function create(input: ContractInput) {
    const { data, error } = await supabase
      .from('contracts')
      .insert(normalizeContractInput(input))
      .select(columns)
      .single()

    if (error) throw error
    return data as unknown as ContractRecord
  }

  async function update(id: string, input: ContractInput) {
    const { data, error } = await supabase
      .from('contracts')
      .update(normalizeContractInput(input))
      .eq('id', id)
      .select(columns)
      .single()

    if (error) throw error
    return data as unknown as ContractRecord
  }

  async function remove(id: string) {
    const { data: files, error: listError } = await supabase
      .from('contract_files')
      .select('id, storage_path')
      .eq('contract_id', id)

    if (listError) throw listError

    if (files?.length) {
      const { error: storageError } = await supabase.storage
        .from('contract-documents')
        .remove(files.map(file => file.storage_path))

      if (storageError) throw storageError

      const { error: metadataError } = await supabase
        .from('contract_files')
        .delete()
        .eq('contract_id', id)

      if (metadataError) throw metadataError
    }

    const { error } = await supabase.from('contracts').delete().eq('id', id)
    if (error) throw error
  }

  async function uploadDocument(contractId: string, file: File) {
    validateContractDocument(file)
    const objectPath = `${contractId}/${crypto.randomUUID()}.pdf`
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!sessionData.session) throw new Error('Your session has expired. Please sign in again.')

    const runtimeConfig = useRuntimeConfig()
    const projectUrl = runtimeConfig.public.supabase.url
    const publishableKey = runtimeConfig.public.supabase.key

    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: `${projectUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 1000, 3000, 5000],
        chunkSize: 6 * 1024 * 1024,
        headers: {
          authorization: `Bearer ${sessionData.session.access_token}`,
          apikey: publishableKey,
          'x-upsert': 'false',
        },
        metadata: {
          bucketName: 'contract-documents',
          objectName: objectPath,
          contentType: 'application/pdf',
          cacheControl: '3600',
        },
        onError(error) {
          reject(error)
        },
        onSuccess() {
          resolve()
        },
      })

      upload.start()
    })

    const { data, error: metadataError } = await supabase
      .from('contract_files')
      .insert({
        contract_id: contractId,
        storage_path: objectPath,
        original_name: file.name,
        mime_type: 'application/pdf',
        file_size_bytes: file.size,
      })
      .select('id, contract_id, storage_path, original_name, mime_type, file_size_bytes, created_at')
      .single()

    if (metadataError) {
      await supabase.storage.from('contract-documents').remove([objectPath])
      throw metadataError
    }

    return data as ContractDocument
  }

  async function removeDocument(document: ContractDocument) {
    const { error: storageError } = await supabase.storage
      .from('contract-documents')
      .remove([document.storage_path])

    if (storageError) throw storageError

    const { error: metadataError } = await supabase
      .from('contract_files')
      .delete()
      .eq('id', document.id)

    if (metadataError) throw metadataError
  }

  function subscribe(onChange: () => void) {
    const channel = supabase
      .channel('contracts-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, onChange)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }

  return { list, get, create, update, remove, uploadDocument, removeDocument, subscribe }
}

function validateContractDocument(file: File) {
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Contract documents must be PDF files.')
  }
  if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
    throw new Error('Contract documents must be no larger than 50 MB.')
  }
}

function normalizeContractInput(input: ContractInput) {
  const contractValue = input.contract_value ?? null

  return {
    contract_number: input.contract_number.trim(),
    vendor_id: input.vendor_id,
    title: input.title.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    contract_value: contractValue,
    currency: contractValue === null ? null : (input.currency ?? 'IDR'),
    status: input.status,
    owner_name: input.owner_name.trim(),
    notes: input.notes?.trim() || null,
  }
}
