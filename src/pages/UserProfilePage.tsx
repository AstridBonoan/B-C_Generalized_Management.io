import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { Badge, Card, PageHeader } from '../components/ui'

export function UserProfilePage() {
  const { id } = useParams()
  const { store, profile } = useApp()
  const user = store.state.profiles.find((row) => row.id === (!id || id === 'me' ? profile?.id : id))
  if (!user) return <p>User not found.</p>
  const role = store.state.roles.find((row) => row.id === user.roleId)
  return (
    <div>
      <PageHeader title={user.fullName} description="Employee profile information is separate from the sign-in credential." />
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs uppercase text-ink-soft">Email</dt><dd>{user.email}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Phone</dt><dd>{user.phone || '—'}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Title</dt><dd>{user.title || '—'}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Role</dt><dd>{role?.name}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Status</dt><dd><Badge tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</Badge></dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Updated</dt><dd>{formatDateTime(user.updatedAt)}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-ink-soft">{user.notes || 'No notes.'}</p>
        {id ? <Link className="mt-4 inline-block text-sm text-teal underline" to="/users">Back to users</Link> : null}
      </Card>
    </div>
  )
}
