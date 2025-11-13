import React, { useState } from 'react'
import { useAuth } from '../state/auth.jsx'
import { Navigate, Link } from 'react-router-dom'

export default function RegisterPage(){
    const { register, login, token } = useAuth()
    const [u, setU] = useState('')
    const [p, setP] = useState('')
    const [cp, setCp] = useState('')
    const [err, setErr] = useState('')
    const [ok, setOk] = useState('')

    if (token) return <Navigate to="/" />

    const onSubmit = async (e) => {
        e.preventDefault()
        setErr('')
        setOk('')

        if (!u || !p) {
            setErr('Username and password are required')
            return
        }
        if (p !== cp) {
            setErr('Passwords do not match')
            return
        }

        try {
            if (!register) throw new Error('Register not supported by auth provider')
            await register(u, p)
            // attempt automatic login if available
            if (login) {
                await login(u, p)
            } else {
                setOk('Account created. You can now sign in.')
            }
        } catch (ex) {
            setErr(ex.response?.data?.detail || ex.message || 'Register failed')
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
                    <p className="text-navy-600 mt-2">Create an account to get started</p>
                </div>
                {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{err}</div>}
                {ok && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{ok}</div>}
                <div>
                    <div className="label">Username</div>
                    <input className="input" value={u} onChange={e => setU(e.target.value)} autoComplete="username" />
                </div>

                <div>
                    <div className="label">Password</div>
                    <input type="password" className="input" value={p} onChange={e => setP(e.target.value)} autoComplete="new-password" />
                </div>

                <div>
                    <div className="label">Confirm Password</div>
                    <input type="password" className="input" value={cp} onChange={e => setCp(e.target.value)} autoComplete="new-password" />
                </div>

                <button className="btn w-full text-base py-3" type="submit">Register</button>

                <div className="text-sm text-navy-600 text-center">
                    Already have an account? <Link to="/login" className="text-brand-600 hover:text-brand-700 font-semibold">Log in</Link>
                </div>
            </form>
        </div>
    )
}