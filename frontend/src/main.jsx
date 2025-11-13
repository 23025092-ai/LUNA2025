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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <aside className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-5 space-y-4 shadow-2xl">
        <div className="text-2xl font-bold flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
          <span className="text-3xl">🌙</span>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">LUNA25</span>
        </div>
        <nav className="flex flex-col space-y-1.5">
          <NavLink to="/" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>
            <span className="text-lg mr-2">🏠</span> Dashboard
          </NavLink>
          <NavLink to="/datasets" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>
            <span className="text-lg mr-2">📚</span> Datasets
          </NavLink>
          <NavLink to="/submissions" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>
            <span className="text-lg mr-2">📤</span> Submissions
          </NavLink>
          <NavLink to="/leaderboard" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>
            <span className="text-lg mr-2">🏆</span> Leaderboard
          </NavLink>
          <NavLink to="/apitest" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>
            <span className="text-lg mr-2">🧪</span> API Test
          </NavLink>
          <NavLink to="/notebook" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>
            <span className="text-lg mr-2">📔</span> Notebook
          </NavLink>
          {user ? (
            <NavLink to="/users" className={({isActive})=> isActive ? 'nav-link nav-link-active' : 'nav-link'}>
              <span className="text-lg mr-2">👥</span> Users
            </NavLink>
          ) : null}
        </nav>
        <div className="pt-6 mt-auto border-t border-slate-700">
          {user ? (
            <div className="flex flex-col gap-3 p-3 bg-slate-800/50 rounded-lg backdrop-blur-sm">
              <div className="text-sm font-semibold text-white">{user.full_name || user.username}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="badge text-xs">{user.role}</span>
                {user.group_name && <span className="text-slate-400">{user.group_name}</span>}
              </div>
            </div>
          ) : null}
        </div>
        <button className="btn mt-4 w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700" onClick={logout}>
          <span className="mr-2">🚪</span> Logout
        </button>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="topbar">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {pageTitle || 'LUNA25'}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                value={q} 
                onChange={e=>setQ(e.target.value)} 
                placeholder="Search datasets, submissions..." 
                className="input w-80 pl-10 bg-slate-50 border-slate-200" 
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-sm font-medium text-slate-700">{user?.username}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-8 space-y-6">
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
