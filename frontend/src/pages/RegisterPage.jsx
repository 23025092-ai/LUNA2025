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
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
                {err && <div className="text-red-600 text-sm">{err}</div>}
                {ok && <div className="text-green-600 text-sm">{ok}</div>}
                <div>
                    <div className="text-2xl font-semibold">Register</div>
                    <div className="text-sm muted">Create an account to access LUNA25 evaluation tools</div>
                </div>
                <div>
                    <div className="label">Username</div>
                    <input className="input" value={u} onChange={e => setU(e.target.value)} />
                </div>

                <div>
                    <div className="label">Password</div>
                    <input type="password" className="input" value={p} onChange={e => setP(e.target.value)} />
                </div>

                <div>
                    <div className="label">Confirm Password</div>
                    <input type="password" className="input" value={cp} onChange={e => setCp(e.target.value)} />
                </div>

                <button className="btn w-full" type="submit">Register</button>

                <div className="text-xs muted text-center">
                    Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
                </div>
            </form>
        </div>
    )
}