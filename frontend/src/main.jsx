import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import './index.css'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Datasets from './pages/Datasets.jsx'
import Submissions from './pages/Submissions.jsx'
import SubmissionDetail from './pages/SubmissionDetail.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import ApiTest from './pages/ApiTest.jsx'
import Notebook from './pages/Notebook.jsx'
import { useAuth, AuthProvider } from './state/auth.jsx'
import Users from './pages/Users.jsx'

function RoleRoute({roles, children}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (!roles.includes(user.role)) {
    return <div className="card m-10">Permission denied (role: {user.role})</div>
  }
  return children;
}

function usePageTitle() {
  const mapping = {
    "/": "Dashboard",
    "/register": "Register",
    "/datasets": "Datasets",
    "/submissions": "Submissions",
    "/leaderboard": "Leaderboard",
    "/apitest": "API Test",
    "/notebook": "Notebook",
    "/users": "Users"
  }
  const path = window.location.pathname.replace(/\/\d+$/,"");
  return mapping[path] || "";
}

function AppShell() {
  const { token, user, logout } = useAuth()
  if (!token) return <Navigate to="/login" />
  const pageTitle = usePageTitle()

  // local UI state for the topbar
  const [q, setQ] = React.useState('')

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-800 text-white p-4 space-y-3">
        <div className="text-xl font-semibold flex items-center gap-2">
          <span>🌙</span>LUNA25
        </div>
        <nav className="flex flex-col space-y-2">
          <NavLink to="/" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>🏠 Dashboard</NavLink>
          <NavLink to="/datasets" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>📚 Datasets</NavLink>
          <NavLink to="/submissions" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>📤 Submissions</NavLink>
          <NavLink to="/leaderboard" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>🏆 Leaderboard</NavLink>
          <NavLink to="/apitest" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>🧪 API Test</NavLink>
          <NavLink to="/notebook" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>📔 Notebook</NavLink>
          {user ? (
            <NavLink to="/users" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>👥 Users</NavLink>
          ) : null}
        </nav>
        <div className="pt-6 text-sm opacity-90">
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="text-sm">{user.full_name || user.username}</div>
              <div className="text-xs"><span className="badge">{user.role}</span> <span className="muted ml-2">{user.group_name}</span></div>
            </div>
          ) : null}
        </div>
        <button className="btn mt-4 w-full" onClick={logout}>Logout</button>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="topbar">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold text-slate-700">{pageTitle || 'LUNA25'}</div>
            <div>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search datasets, submissions..." className="input w-72" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm muted">{user?.username}</div>
          </div>
        </header>
        <main className="flex-1 p-6 space-y-6">
          <Routes>
            <Route path="/" element={<Dashboard/>} />
            <Route path="/datasets" element={<Datasets/>} />
            <Route path="/submissions" element={<Submissions/>} />
            <Route path="/submissions/:id" element={<SubmissionDetail/>} />
            <Route path="/leaderboard" element={<Leaderboard/>} />
            <Route path="/apitest" element={
              <RoleRoute roles={["admin"]}>
                <ApiTest/>
              </RoleRoute>
            } />
            <Route path="/notebook" element={<Notebook/>} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function Root() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage/>} />
          <Route path="/register" element={<RegisterPage/>} />
          <Route path="/*" element={<AppShell/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>)
