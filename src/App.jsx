import React, { createContext, useContext, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './screens/Login'
import Signup from './screens/Signup'
import Dashboard from './screens/Dashboard'
import Day0 from './screens/Day0'
import DayN from './screens/DayN'
import Day5 from './screens/Day5'
import Admin from './screens/Admin'
import StudentDetail from './screens/StudentDetail'
import Report from './screens/Report'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  const isAdmin = profile?.is_admin
  const isLoggedIn = !!session

  return (
    <AuthContext.Provider value={{ session, profile, signOut, refreshProfile: () => fetchProfile(session?.user?.id) }}>
      <Routes>
        <Route path="/login" element={!isLoggedIn ? <Login /> : <Navigate to={isAdmin ? '/admin' : '/dashboard'} />} />
        <Route path="/signup" element={!isLoggedIn ? <Signup /> : <Navigate to={isAdmin ? '/admin' : '/dashboard'} />} />
        <Route path="/dashboard" element={isLoggedIn && !isAdmin ? <Dashboard /> : <Navigate to={isLoggedIn ? '/admin' : '/login'} />} />
        <Route path="/day/0" element={isLoggedIn && !isAdmin ? <Day0 /> : <Navigate to="/login" />} />
        <Route path="/day/:n" element={isLoggedIn && !isAdmin ? <DayN /> : <Navigate to="/login" />} />
        <Route path="/day5" element={isLoggedIn && !isAdmin ? <Day5 /> : <Navigate to="/login" />} />
        <Route path="/admin" element={isLoggedIn && isAdmin ? <Admin /> : <Navigate to="/login" />} />
        <Route path="/admin/student/:id" element={isLoggedIn && isAdmin ? <StudentDetail /> : <Navigate to="/login" />} />
        <Route path="/report" element={isLoggedIn && !isAdmin ? <Report /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isLoggedIn ? (isAdmin ? '/admin' : '/dashboard') : '/login'} />} />
      </Routes>
    </AuthContext.Provider>
  )
}
