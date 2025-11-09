import React from 'react'
import { useAuth } from '../state/auth.jsx'

export default function Users() {
  const { API, authHeader, token, user: me } = useAuth()
  const [users, setUsers] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [selected, setSelected] = React.useState(null)
  const [edit, setEdit] = React.useState({})

  const isAdmin = me?.role === 'admin'

  // helper to build headers supporting authHeader() or authHeader object or token
  function buildHeaders(extra = {}) {
    let base = {}
    try {
      if (typeof authHeader === 'function') base = authHeader() || {}
      else if (authHeader && typeof authHeader === 'object') base = authHeader
      else if (token) base = { Authorization: `Bearer ${token}` }
    } catch (e) {
      base = token ? { Authorization: `Bearer ${token}` } : {}
    }
    return { ...base, ...extra }
  }

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/users`, {
        headers: buildHeaders({ 'Content-Type': 'application/json' })
      })

      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (ct.includes('application/json')) {
        const data = await res.json()
        if (!res.ok) {
          const msg = data?.detail || JSON.stringify(data) || 'Failed to fetch users'
          throw new Error(msg)
        }
        // backend returns either list (admin) or single-item list (non-admin)
        if (Array.isArray(data)) setUsers(data)
        else setUsers([data])
      } else {
        const text = await res.text()
        throw new Error(text || 'Unexpected non-JSON response from server')
      }
    } catch (err) {
      console.error('fetchUsers error', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [API, authHeader, token])

  React.useEffect(()=> {
    fetchUsers()
  }, [fetchUsers])

  async function deleteUser(id) {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return
    try {
      const res = await fetch(`${API}/users/${id}`, {
        method: 'DELETE',
        headers: buildHeaders()
      })
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (ct.includes('application/json')) {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.detail || JSON.stringify(data) || 'Delete failed')
      } else {
        const text = await res.text()
        if (!res.ok) throw new Error(text || 'Delete failed')
      }

      await fetchUsers()
      setSelected(null)
    } catch (err) {
      console.error('deleteUser error', err)
      alert('Error: ' + (err.message || String(err)))
    }
  }

  async function updateUser(id, payload) {
    try {
      const res = await fetch(`${API}/users/${id}`, {
        method: 'PATCH',
        headers: buildHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      })
      const ct = (res.headers.get('content-type') || '').toLowerCase()
      if (ct.includes('application/json')) {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.detail || JSON.stringify(data) || 'Update failed')
        // update local state
        await fetchUsers()
        setSelected(data)
      } else {
        const text = await res.text()
        if (!res.ok) throw new Error(text || 'Update failed')
        // no json returned but ok -> refresh
        await fetchUsers()
        setSelected(null)
      }
    } catch (err) {
      console.error('updateUser error', err)
      alert('Error: ' + (err.message || String(err)))
    }
  }

  function openEdit(u) {
    setSelected(u)
    setEdit({
      username: u.username || '',
      full_name: u.full_name || '',
      email: u.email || '',
      group_name: u.group_name || '',
      role: u.role || ''
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="text-sm muted">{isAdmin ? 'Admins only (full access)' : 'Your profile'}</div>
      </div>

      <div className="card p-4">
        {loading ? (
          <div>Loading users...</div>
        ) : error ? (
          <div className="text-red-600">Error: {error}</div>
        ) : (
          <>
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Username</th>
                  <th className="p-2">Full name</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Group</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 muted">No users</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.username}</td>
                    <td className="p-2">{u.full_name || '-'}</td>
                    <td className="p-2"><span className="badge">{u.role}</span></td>
                    <td className="p-2 muted">{u.group_name || '-'}</td>
                    <td className="p-2">
                      <button className="btn btn-sm mr-2" onClick={()=>openEdit(u)}>View / Edit</button>
                      {isAdmin ? (
                        <button className="btn btn-danger btn-sm" onClick={()=>deleteUser(u.id)}>Delete</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {selected ? (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">User Info</div>
            <div>
              <button className="btn btn-sm mr-2" onClick={()=>{setSelected(null); setEdit({})}}>Close</button>
              {isAdmin ? (
                <button className="btn btn-danger btn-sm" onClick={()=>deleteUser(selected.id)}>Delete</button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs muted">Username</label>
              <input className="input" value={edit.username} onChange={e=>setEdit(s=>({...s, username: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs muted">Full name</label>
              <input className="input" value={edit.full_name} onChange={e=>setEdit(s=>({...s, full_name: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs muted">Email</label>
              <input className="input" value={edit.email} onChange={e=>setEdit(s=>({...s, email: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs muted">Group</label>
              <input className="input" value={edit.group_name} onChange={e=>setEdit(s=>({...s, group_name: e.target.value}))} />
            </div>

            {isAdmin ? (
              <div>
                <label className="text-xs muted">Role</label>
                <select className="input" value={edit.role} onChange={e=>setEdit(s=>({...s, role: e.target.value}))}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            ) : null}

            <div>
              <label className="text-xs muted">Password (leave empty to keep)</label>
              <input className="input" type="password" value={edit.password || ''} onChange={e=>setEdit(s=>({...s, password: e.target.value}))} />
            </div>

            <div className="col-span-2 flex items-center gap-3 mt-2">
              <button className="btn" onClick={()=>updateUser(selected.id, edit)}>Save</button>
              <button className="btn btn-ghost" onClick={()=>{ setEdit({
                username: selected.username || '',
                full_name: selected.full_name || '',
                email: selected.email || '',
                group_name: selected.group_name || '',
                role: selected.role || ''
              })}}>Reset</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}