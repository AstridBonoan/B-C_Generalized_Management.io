import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { Alert, Button, Card, Field, Input, PageHeader, Tabs } from '../components/ui'
import { MODULES } from '../types/domain'

export function SettingsPage() {
  const { store, refresh, profile } = useApp()
  const location = useLocation()
  const [tab, setTab] = useState(location.pathname.includes('roles') ? 'roles' : 'company')
  const [company, setCompany] = useState(store.state.company)
  const [message, setMessage] = useState<string | null>(null)
  const [statusLabel, setStatusLabel] = useState('')
  const [tagName, setTagName] = useState('')
  const [sourceName, setSourceName] = useState('')
  const canEdit = can(store.state, profile, 'settings', 'edit') || can(store.state, profile, 'settings', 'manage')

  return (
    <div>
      <PageHeader title="Settings" description="Company, role, and system configuration. Additional industry settings can be added as new sections." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'company', label: 'Company' },
          { id: 'users', label: 'Users' },
          { id: 'roles', label: 'Roles' },
          { id: 'system', label: 'System' },
        ]}
      />
      <div className="mt-4">
        {tab === 'company' ? (
          <Card>
            {message ? <Alert tone="success">{message}</Alert> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Company name"><Input value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} /></Field>
              <Field label="Email"><Input value={company.email} onChange={(event) => setCompany({ ...company, email: event.target.value })} /></Field>
              <Field label="Phone"><Input value={company.phone} onChange={(event) => setCompany({ ...company, phone: event.target.value })} /></Field>
              <Field label="Website"><Input value={company.website} onChange={(event) => setCompany({ ...company, website: event.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Address"><Input value={company.address} onChange={(event) => setCompany({ ...company, address: event.target.value })} /></Field></div>
            </div>
            <h3 className="mt-6 font-semibold">Notification preferences</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ['taskAssigned', 'Task assigned'],
                ['taskDue', 'Task due'],
                ['appointmentUpcoming', 'Appointment upcoming'],
                ['newLead', 'New lead'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={company.notificationPreferences[key]}
                    onChange={(event) => setCompany({
                      ...company,
                      notificationPreferences: { ...company.notificationPreferences, [key]: event.target.checked },
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
            {canEdit ? (
              <Button className="mt-4" type="button" onClick={() => { store.saveCompany(company); refresh(); setMessage('Company settings saved.') }}>
                Save company
              </Button>
            ) : null}
          </Card>
        ) : null}
        {tab === 'users' ? (
          <Card>
            <p className="text-sm text-ink-soft">User administration lives in the Users module so it can be reused independently.</p>
            <Link className="mt-3 inline-block text-teal underline" to="/users">Open user management</Link>
          </Card>
        ) : null}
        {tab === 'roles' ? <RolesPanel /> : null}
        {tab === 'system' ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="font-display text-lg">Lead sources</h3>
              <ul className="mt-2 text-sm">{store.state.leadSources.map((row) => <li key={row.id}>{row.name}</li>)}</ul>
              {canEdit ? (
                <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!sourceName.trim()) return; store.addLeadSource(sourceName); setSourceName(''); refresh() }}>
                  <Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="New source" />
                  <Button type="submit">Add</Button>
                </form>
              ) : null}
            </Card>
            <Card>
              <h3 className="font-display text-lg">Tags</h3>
              <ul className="mt-2 text-sm">{store.state.tags.map((row) => <li key={row.id}>{row.name}</li>)}</ul>
              {canEdit ? (
                <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!tagName.trim()) return; store.addTag(tagName); setTagName(''); refresh() }}>
                  <Input value={tagName} onChange={(event) => setTagName(event.target.value)} placeholder="New tag" />
                  <Button type="submit">Add</Button>
                </form>
              ) : null}
            </Card>
            <Card>
              <h3 className="font-display text-lg">Statuses</h3>
              <ul className="mt-2 max-h-40 overflow-auto text-sm">
                {store.state.statuses.map((row) => <li key={row.id}>{row.entity}: {row.label}</li>)}
              </ul>
              {canEdit ? (
                <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!statusLabel.trim()) return; store.addStatus('lead', statusLabel.toLowerCase().replace(/\s+/g, '_'), statusLabel); setStatusLabel(''); refresh() }}>
                  <Input value={statusLabel} onChange={(event) => setStatusLabel(event.target.value)} placeholder="New lead status" />
                  <Button type="submit">Add</Button>
                </form>
              ) : null}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RolesPanel() {
  const { store, refresh, profile } = useApp()
  const [roleId, setRoleId] = useState(store.state.roles[0]?.id ?? '')
  const selected = new Set(store.state.rolePermissions.filter((row) => row.roleId === roleId).map((row) => row.permissionId))
  const canManage = can(store.state, profile, 'roles', 'manage')
  return (
    <Card>
      <Field label="Role">
        <select className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
          {store.state.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select>
      </Field>
      <div className="mt-4 space-y-4">
        {MODULES.map((module) => (
          <div key={module}>
            <p className="text-sm font-semibold capitalize">{module.replace('-', ' ')}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              {store.state.permissions.filter((permission) => permission.module === module).map((permission) => (
                <label key={permission.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canManage}
                    checked={selected.has(permission.id)}
                    onChange={(event) => {
                      const next = new Set(selected)
                      if (event.target.checked) next.add(permission.id)
                      else next.delete(permission.id)
                      store.saveRolePermissions(roleId, [...next])
                      refresh()
                    }}
                  />
                  {permission.action}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
