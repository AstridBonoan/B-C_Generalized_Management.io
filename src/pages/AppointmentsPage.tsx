import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, isTimeRange, newId } from '../lib/validation'
import type { Appointment, AppointmentStatus } from '../types/domain'
import { Alert, Badge, Button, Card, ConfirmDialog, Field, Input, Modal, PageHeader, Select, Table, Tabs, Textarea } from '../components/ui'

function blankAppointment(): Appointment {
  const now = new Date().toISOString()
  return {
    id: newId(),
    title: '',
    clientId: null,
    employeeId: null,
    date: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    notes: '',
    status: 'scheduled',
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function AppointmentsPage() {
  const { store, refresh, profile } = useApp()
  const [view, setView] = useState('list')
  const [form, setForm] = useState<Appointment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancel, setCancel] = useState<Appointment | null>(null)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [assigned, setAssigned] = useState('')
  const items = useMemo(() => store.listAppointments({ pageSize: 50, assignedEmployeeId: assigned || undefined }).items, [store, assigned])

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.title, 'Title'), isNonEmpty(form.date, 'Date'), isTimeRange(form.startTime, form.endTime)])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveAppointment(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save appointment.')
    }
  }

  const [year, monthNum] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNum, 0).getDate()
  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const day = `${month}-${String(index + 1).padStart(2, '0')}`
    return { day, items: items.filter((item) => item.date === day) }
  })

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="A scheduling foundation with list and month views. Not a full enterprise calendar."
        actions={can(store.state, profile, 'appointments', 'create') ? <Button type="button" onClick={() => { setError(null); setForm(blankAppointment()) }}>New appointment</Button> : null}
      />
      <Tabs value={view} onChange={setView} tabs={[{ id: 'list', label: 'List' }, { id: 'calendar', label: 'Calendar' }]} />
      <div className="mt-4 max-w-xs">
        <Select value={assigned} onChange={(event) => setAssigned(event.target.value)}>
          <option value="">All employees</option>
          {store.state.profiles.map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
        </Select>
      </div>
      {view === 'list' ? (
        <div className="mt-4">
          <Table headers={['Appointment', 'Date', 'People', 'Status', '']}>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="px-3 py-2"><button className="font-medium text-teal" type="button" onClick={() => setForm(item)}>{item.title}</button></td>
                <td className="px-3 py-2">{item.date} {item.startTime}–{item.endTime}</td>
                <td className="px-3 py-2 text-sm">{store.state.profiles.find((row) => row.id === item.employeeId)?.fullName ?? '—'} / {store.state.clients.find((row) => row.id === item.clientId)?.displayName ?? '—'}</td>
                <td className="px-3 py-2"><Badge tone={item.status === 'cancelled' ? 'danger' : 'teal'}>{item.status}</Badge></td>
                <td className="px-3 py-2 text-right">{item.status === 'scheduled' ? <Button variant="ghost" type="button" onClick={() => setCancel(item)}>Cancel</Button> : null}</td>
              </tr>
            ))}
          </Table>
        </div>
      ) : (
        <Card className="mt-4">
          <Field label="Month"><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field>
          <div className="mt-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {cells.map((cell) => (
              <div key={cell.day} className="min-h-24 rounded-md border border-line bg-paper p-2 text-xs">
                <p className="font-semibold">{cell.day.slice(-2)}</p>
                {cell.items.map((item) => (
                  <button key={item.id} className="mt-1 block w-full truncate text-left text-teal" type="button" onClick={() => setForm(item)}>
                    {item.startTime} {item.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
      {form ? (
        <Modal title="Appointment" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field></div>
            <Field label="Date"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
            <Field label="Start"><Input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
            <Field label="End"><Input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></Field>
            <Field label="Client">
              <Select value={form.clientId ?? ''} onChange={(event) => setForm({ ...form, clientId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Employee">
              <Select value={form.employeeId ?? ''} onChange={(event) => setForm({ ...form, employeeId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
      {cancel ? <ConfirmDialog title="Cancel appointment" body="The appointment will remain in history with a cancelled status." confirmLabel="Cancel appointment" onClose={() => setCancel(null)} onConfirm={() => { store.cancelAppointment(cancel.id); refresh(); setCancel(null) }} /> : null}
    </div>
  )
}
