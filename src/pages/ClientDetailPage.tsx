import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, formatDateTime } from '../lib/format'
import { can } from '../lib/permissions'
import { newId } from '../lib/validation'
import { Badge, Button, Card, Field, Input, PageHeader, Tabs } from '../components/ui'

export function ClientDetailPage() {
  const { id } = useParams()
  const { store, refresh, profile } = useApp()
  const [tab, setTab] = useState('overview')
  const [contactName, setContactName] = useState('')
  const client = store.getClient(id ?? '')
  if (!client) return <p>Client not found.</p>
  const owner = store.state.profiles.find((row) => row.id === client.assignedEmployeeId)
  const contacts = store.state.clientContacts.filter((row) => row.clientId === client.id)
  const tasks = store.state.tasks.filter((row) => row.clientId === client.id && !row.archivedAt)
  const appointments = store.state.appointments.filter((row) => row.clientId === client.id)
  const projects = store.state.projects.filter((row) => row.clientId === client.id)
  const documents = store.state.documents.filter((row) => row.clientId === client.id && !row.archivedAt)
  const activity = store.state.activities.filter((row) => row.relatedId === client.id)

  return (
    <div>
      <PageHeader
        title={client.displayName}
        description="Client profile"
        actions={<Badge tone={client.status === 'active' ? 'success' : 'neutral'}>{client.status}</Badge>}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Profile' },
          { id: 'contact', label: 'Contact information' },
          { id: 'notes', label: 'Notes' },
          { id: 'work', label: 'Related work' },
          { id: 'documents', label: 'Documents' },
          { id: 'history', label: 'Client history' },
        ]}
      />
      <div className="mt-4">
        {tab === 'overview' ? (
          <Card>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs uppercase text-ink-soft">Legal name</dt><dd>{client.legalName || '—'}</dd></div>
              <div><dt className="text-xs uppercase text-ink-soft">Assigned employee</dt><dd>{owner?.fullName ?? '—'}</dd></div>
              <div><dt className="text-xs uppercase text-ink-soft">Categories</dt><dd>{client.tags.join(', ') || '—'}</dd></div>
              <div><dt className="text-xs uppercase text-ink-soft">Updated</dt><dd>{formatDateTime(client.updatedAt)}</dd></div>
            </dl>
          </Card>
        ) : null}
        {tab === 'contact' ? (
          <Card>
            <p>{client.email || 'No email'} · {client.phone || 'No phone'}</p>
            <p className="mt-2 text-ink-soft">
              {[client.addressLine1, client.addressLine2, client.city, client.region, client.postalCode, client.country].filter(Boolean).join(', ') || 'No address on file.'}
            </p>
            <h3 className="mt-4 font-semibold">Additional contacts</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {contacts.map((row) => (
                <li key={row.id}>{row.fullName} · {row.title} · {row.email} {row.isPrimary ? <Badge tone="teal">Primary</Badge> : null}</li>
              ))}
            </ul>
            {can(store.state, profile, 'clients', 'edit') ? (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!contactName.trim()) return
                  store.saveContact({
                    id: newId(),
                    clientId: client.id,
                    fullName: contactName,
                    email: '',
                    phone: '',
                    title: '',
                    isPrimary: contacts.length === 0,
                  })
                  setContactName('')
                  refresh()
                }}
              >
                <Field label="Add contact">
                  <Input value={contactName} onChange={(event) => setContactName(event.target.value)} />
                </Field>
                <Button type="submit" className="self-end">Add</Button>
              </form>
            ) : null}
          </Card>
        ) : null}
        {tab === 'notes' ? <Card><p className="whitespace-pre-wrap text-sm">{client.notes || 'No notes.'}</p></Card> : null}
        {tab === 'work' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="font-semibold">Projects / work</h3>
              <ul className="mt-2 space-y-2 text-sm">{projects.map((item) => <li key={item.id}><Link className="text-teal" to={`/projects/${item.id}`}>{item.name}</Link></li>)}</ul>
            </Card>
            <Card>
              <h3 className="font-semibold">Tasks</h3>
              <ul className="mt-2 space-y-2 text-sm">{tasks.map((task) => <li key={task.id}><Link className="text-teal" to="/tasks">{task.title}</Link></li>)}</ul>
            </Card>
            <Card>
              <h3 className="font-semibold">Appointments</h3>
              <ul className="mt-2 space-y-2 text-sm">{appointments.map((item) => <li key={item.id}>{item.title} · {formatDate(item.date)}</li>)}</ul>
            </Card>
          </div>
        ) : null}
        {tab === 'documents' ? (
          <Card>
            <ul className="space-y-2">{documents.map((item) => <li key={item.id}><Link className="text-teal" to="/documents">{item.name}</Link></li>)}</ul>
          </Card>
        ) : null}
        {tab === 'history' ? (
          <Card>
            <ul className="space-y-2 text-sm">
              {activity.map((item) => (
                <li key={item.id}>{item.description} · {formatDateTime(item.createdAt)}</li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
