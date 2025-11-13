import React, { useState } from 'react'
import { useAuth } from '../state/auth.jsx'
import { Navigate, Link } from 'react-router-dom'

export default function LoginPage(){
  const { login, token } = useAuth()
  const [u, setU] = useState('admin')
  const [p, setP] = useState('admin123')
  const [err, setErr] = useState('')

  if (token) return <Navigate to="/" />

  const onSubmit = async (e)=>{
    e.preventDefault()
    try{
      await login(u,p)
    }catch(ex){
      setErr(ex.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-5 shadow-soft-lg">
        <div className="text-center mb-2">
          <div className="text-4xl mb-3">🌙</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent font-display">
            LUNA25
          </h1>
          <p className="text-navy-600 mt-2">Sign in to access evaluation tools</p>
        </div>
        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{err}</div>}
        <div>
          <div className="label">Username</div>
          <input className="input" value={u} onChange={e=>setU(e.target.value)} autoComplete="username" />
        </div>
        <div>
          <div className="label">Password</div>
          <input type="password" className="input" value={p} onChange={e=>setP(e.target.value)} autoComplete="current-password" />
        </div>
        <button className="btn w-full text-base py-3" type="submit">Sign in</button>
        <div className="mt-4 text-center text-sm text-navy-600">
          Need an account? <Link to="/register" className="text-brand-600 hover:text-brand-700 font-semibold">Register</Link>
        </div>
      </form>
    </div>
  )
}
