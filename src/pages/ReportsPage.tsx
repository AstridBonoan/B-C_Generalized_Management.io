import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { Card, PageHeader } from '../components/ui'

export function ReportsPage() {
  const { store } = useApp()
  const report = useMemo(() => store.reports(), [store])
  return (
    <div>
      <PageHeader title="Reports" description="Basic counts for clients, work, tasks, appointments, and activity." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['Clients', report.clientCount],
          ['Active clients', report.activeClients],
          ['Projects / work', report.projectCount],
          ['Open tasks', report.openTasks],
          ['Completed tasks', report.completedTasks],
          ['Upcoming appointments', report.upcomingAppointments],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-2 font-display text-3xl">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Projects / work</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.entries(report.projectsByStatus).map(([status, count]) => (
            <li key={status} className="rounded-md bg-paper px-3 py-2 text-sm">{status.replace('_', ' ')}: {count}</li>
          ))}
        </ul>
      </Card>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Employee activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {report.workload.map((row) => (
            <li key={row.profile.id}>
              {row.profile.fullName}: {row.openTasks} open tasks, {row.projects} projects, {row.appointments} upcoming appointments
            </li>
          ))}
        </ul>
      </Card>
      <Card className="mt-4">
        <h2 className="font-display text-xl">General activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {report.recentActivity.map((item) => (
            <li key={item.id}>{item.description} · {formatDateTime(item.createdAt)}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
