import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../state/auth.jsx'

export default function Dashboard(){
  const { API, authHeader } = useAuth()
  const [datasets, setDatasets] = useState({items:[]})
  const [subs, setSubs] = useState({items:[]})

  useEffect(()=>{
    axios.get(`${API}/datasets/`).then(r=>setDatasets(r.data))
    axios.get(`${API}/submissions/`, { headers: authHeader }).then(r=>setSubs(r.data))
  }, [])

  const official = datasets.items.find(d=>d.is_official)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Welcome to LUNA25 Lung Cancer Prediction System</p>
        </div>
        <div className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Total Datasets</div>
              <div className="text-4xl font-bold">{datasets.total || 0}</div>
            </div>
            <div className="text-5xl opacity-30">📚</div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Total Submissions</div>
              <div className="text-4xl font-bold">{subs.total || 0}</div>
            </div>
            <div className="text-5xl opacity-30">📤</div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90 mb-1">Official Dataset</div>
              <div className="text-xl font-bold truncate">{official?.name || 'Not Set'}</div>
            </div>
            <div className="text-5xl opacity-30">⭐</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            System Overview
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-slate-600">Active Datasets</span>
              <span className="font-semibold text-blue-600">{datasets.items?.filter(d => d.is_official).length || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-slate-600">Pending Reviews</span>
              <span className="font-semibold text-orange-600">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-slate-600">Team Submissions</span>
              <span className="font-semibold text-green-600">{subs.total || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Quick Actions
          </h2>
          <div className="space-y-3">
            <a href="/datasets" className="block p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all hover:shadow-md">
              <div className="font-semibold text-blue-700">📚 Manage Datasets</div>
              <div className="text-sm text-slate-600 mt-1">Upload and analyze datasets</div>
            </a>
            <a href="/leaderboard" className="block p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all hover:shadow-md">
              <div className="font-semibold text-purple-700">🏆 View Leaderboard</div>
              <div className="text-sm text-slate-600 mt-1">Check team rankings and scores</div>
            </a>
            <a href="/submissions" className="block p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 hover:border-green-400 transition-all hover:shadow-md">
              <div className="font-semibold text-green-700">📤 View Submissions</div>
              <div className="text-sm text-slate-600 mt-1">Review all team submissions</div>
            </a>
          </div>
        </div>
      </div>

      <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200">
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-indigo-900">
          <span className="text-2xl">ℹ️</span>
          About LUNA25
        </h2>
        <p className="text-slate-700 leading-relaxed">
          LUNA25 is a lung cancer prediction system that evaluates malignant lung tumor risk from chest CT images. 
          The system ranks team models based on their performance on test datasets, with scoring from 6.5 to 10 (A+) 
          based on ranking positions. Teams submit their model APIs for evaluation on the official test dataset.
        </p>
      </div>
    </div>
  )
}
