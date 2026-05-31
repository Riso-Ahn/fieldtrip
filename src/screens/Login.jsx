import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [nick, setNick] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const email = `${nick.trim()}@fieldtrip.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) {
      setErr('닉네임 또는 비밀번호가 틀렸습니다')
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 380, margin: '5rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>현장학습 일지</div>
        <div className="muted">해외 창업 생태계 탐방 프로그램</div>
      </div>
      <form className="card" onSubmit={handleLogin}>
        <div className="field">
          <label className="label">닉네임</label>
          <input value={nick} onChange={e => setNick(e.target.value)} placeholder="닉네임 입력" autoFocus />
        </div>
        <div className="field">
          <label className="label">비밀번호</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="비밀번호 입력" />
        </div>
        {err && <div style={{ color: '#a32d2d', fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={loading}>
          {loading ? <span className="spinner" /> : '로그인'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <span className="muted">계정이 없나요? </span>
          <Link to="/signup" style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>회원가입 →</Link>
        </div>
      </form>
    </div>
  )
}
