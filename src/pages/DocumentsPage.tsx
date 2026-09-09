import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatBytes, formatDateTime } from '../lib/format'
import { can } from '../lib/permissions'
import { newId } from '../lib/validation'
import type { DocumentCategory } from '../types/domain'
import { Alert, Badge, Button, ConfirmDialog, Field, Input, PageHeader, Pagination, Select, Table } from '../components/ui'

export function DocumentsPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [archive, setArchive] = useState<string | null>(null)
  const docs = useMemo(() => {
    const filtered = store.state.documents.filter((doc) => !doc.archivedAt && doc.name.toLowerCase().includes(search.toLowerCase()))
    const start = (page - 1) * 8
    return { items: filtered.slice(start, start + 8), total: filtered.length, page, pageSize: 8 }
  }, [store, search, page])

  async function onUpload(file: File, category: DocumentCategory, clientId: string, projectId: string) {
    if (file.size > 750_000) {
      setError('Demo uploads are limited to 750 KB because files are stored locally. Connect Supabase Storage for production files.')
      return
    }
    setError(null)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Unable to read file.'))
      reader.readAsDataURL(file)
    })
    store.saveDocument({
      id: newId(),
      name: file.name,
      category,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      dataUrl,
      clientId: clientId || null,
      projectId: projectId || null,
    })
    refresh()
  }

  return (
    <div>
      <PageHeader title="Documents" description="File metadata with optional client and project relationships. Categories can later become industry-specific types." />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {can(store.state, profile, 'documents', 'create') ? (
        <form
          className="mb-4 grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            const file = data.get('file') as File | null
            if (!file || !file.size) {
              setError('Choose a file to upload.')
              return
            }
            void onUpload(file, String(data.get('category')) as DocumentCategory, String(data.get('clientId') ?? ''), String(data.get('projectId') ?? ''))
            event.currentTarget.reset()
          }}
        >
          <Field label="File"><Input name="file" type="file" /></Field>
          <Field label="Category">
            <Select name="category" defaultValue="general">
              <option value="general">General</option>
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="correspondence">Correspondence</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Client">
            <Select name="clientId" defaultValue="">
              <option value="">None</option>
              {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
            </Select>
          </Field>
          <Field label="Project">
            <Select name="projectId" defaultValue="">
              <option value="">None</option>
              {store.state.projects.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </Select>
          </Field>
          <Button type="submit" className="self-end">Upload</Button>
        </form>
      ) : null}
      <Input className="mb-4" placeholder="Search documents" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
      <Table headers={['Name', 'Category', 'Related', 'Uploaded', '']}>
        {docs.items.map((doc) => (
          <tr key={doc.id} className="border-t border-line">
            <td className="px-3 py-2">
              <a className="text-teal underline" href={doc.dataUrl} download={doc.name}>{doc.name}</a>
              <p className="text-xs text-ink-soft">{formatBytes(doc.sizeBytes)}</p>
            </td>
            <td className="px-3 py-2"><Badge>{doc.category}</Badge></td>
            <td className="px-3 py-2 text-sm">{store.state.clients.find((row) => row.id === doc.clientId)?.displayName ?? '—'} / {store.state.projects.find((row) => row.id === doc.projectId)?.name ?? '—'}</td>
            <td className="px-3 py-2 text-sm">{formatDateTime(doc.createdAt)}</td>
            <td className="px-3 py-2 text-right">{can(store.state, profile, 'documents', 'archive') ? <Button variant="ghost" type="button" onClick={() => setArchive(doc.id)}>Archive</Button> : null}</td>
          </tr>
        ))}
      </Table>
      <div className="mt-3"><Pagination page={docs.page} pageSize={docs.pageSize} total={docs.total} onPage={setPage} /></div>
      {archive ? <ConfirmDialog title="Archive document" body="The file remains in history but is removed from the working library." confirmLabel="Archive" onClose={() => setArchive(null)} onConfirm={() => { store.archiveDocument(archive); refresh(); setArchive(null) }} /> : null}
    </div>
  )
}
