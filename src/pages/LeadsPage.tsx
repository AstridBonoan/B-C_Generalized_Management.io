import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import type { Lead, LeadStatusKey } from '../types/domain'
import { Alert, Badge, Button, ConfirmDialog, Field, Input, Modal, PageHeader, Pagination, Select, Table, Textarea } from '../components/ui'

const PIPELINE: LeadStatusKey[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

function blankLead(): Lead {
  const now = new Date().toISOString()
  return {
    id: newId(),
    displayName: '',
    email: '',
    phone: '',
    companyName: '',
    sourceId: '',
    status: 'new',
    assignedEmployeeId: null,
    followUpDate: null,
    notes: '',
    convertedClientId: null,
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  }
}

export function LeadsPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<Lead | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [archive, setArchive] = useState<Lead | null>(null)
  const result = useMemo(
    () => store.listLeads({ search, status: status || undefined, page, pageSize: 8 }),
    [store, search, status, page],
  )

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.displayName, 'Name'), isNonEmpty(form.sourceId, 'Source')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveLead(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save lead.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Configurable pipeline statuses. Convert a won lead into a client without duplicating contact data entry."
        actions={can(store.state, profile, 'leads', 'create') ? <Button type="button" onClick={() => { setError(null); setForm({ ...blankLead(), sourceId: store.state.leadSources[0]?.id ?? '' }) }}>New lead</Button> : null}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {PIPELINE.map((item) => (
          <button key={item} type="button" className={`rounded-full px-3 py-1 text-sm ${status === item ? 'bg-teal text-white' : 'bg-paper-2'}`} onClick={() => { setStatus(status === item ? '' : item); setPage(1) }}>
            {store.state.statuses.find((row) => row.entity === 'lead' && row.key === item)?.label ?? item}
          </button>
        ))}
      </div>
      <Input className="mb-4" placeholder="Search leads" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
      <Table headers={['Name', 'Status', 'Source', 'Follow-up', '']}>
        {result.items.map((lead) => (
          <tr key={lead.id} className="border-t border-line">
            <td className="px-3 py-2">
              <button className="font-medium text-teal" type="button" onClick={() => setForm(lead)}>{lead.displayName}</button>
              {lead.convertedClientId ? <Badge tone="success">Converted</Badge> : null}
            </td>
            <td className="px-3 py-2"><Badge tone="teal">{lead.status}</Badge></td>
            <td className="px-3 py-2">{store.state.leadSources.find((row) => row.id === lead.sourceId)?.name}</td>
            <td className="px-3 py-2">{lead.followUpDate ?? '—'}</td>
            <td className="space-x-2 px-3 py-2 text-right">
              {can(store.state, profile, 'leads', 'edit') && !lead.convertedClientId && lead.status !== 'lost' ? (
                <Button variant="secondary" type="button" onClick={() => { store.convertLead(lead.id); refresh() }}>Convert</Button>
              ) : null}
              {can(store.state, profile, 'leads', 'archive') ? (
                <Button variant="ghost" type="button" onClick={() => setArchive(lead)}>Archive</Button>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
      <div className="mt-3"><Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} /></div>
      {form ? (
        <Modal title="Lead" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field>
            <Field label="Company"><Input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="Source">
              <Select value={form.sourceId} onChange={(event) => setForm({ ...form, sourceId: event.target.value })}>
                {store.state.leadSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as LeadStatusKey })}>
                {PIPELINE.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Assigned">
              <Select value={form.assignedEmployeeId ?? ''} onChange={(event) => setForm({ ...form, assignedEmployeeId: event.target.value || null })}>
                <option value="">Unassigned</option>
                {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Follow-up date"><Input type="date" value={form.followUpDate ?? ''} onChange={(event) => setForm({ ...form, followUpDate: event.target.value || null })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
      {archive ? (
        <ConfirmDialog title="Archive lead" body="Archived leads leave the default pipeline." confirmLabel="Archive" onClose={() => setArchive(null)} onConfirm={() => { store.archiveLead(archive.id); refresh(); setArchive(null) }} />
      ) : null}
    </div>
  )
}
