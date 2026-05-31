import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ADMIN_CODE, ADMIN_NICKNAME, ADMIN_PASSWORD } from '../lib/constants'

export default function Signup() {
  const [name, setName] = useState('')
  const [nick, setNick] = useState('')
  const [pass, setPass] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSignup(e) {
    e.preventDefault()
    setErr('')
    if (!name.trim() || !nick.trim() || !pass) {
      setErr('이름, 닉네임, 비밀번호는 필수입니다')
      return
    }
    if (pass.length < 6) {
      setErr('비밀번호는 6자 이상이어야 합니다')
      return
    }
    setLoading(true)

    const isAdmin = adminCode.trim() === ADMIN_CODE || (nick.trim() === ADMIN_NICKNAME && pass === ADMIN_PASSWORD)
    const email = `${nick.trim()}@fieldtrip.local`

    const { data, error } = await supabase.auth.signUp({ email, password: pass })
    if (error) {
      setErr(error.message.includes('already') ? '이미 사용 중인 닉네임입니다' : error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nickname: nick.trim(),
        name: name.trim(),
        is_admin: isAdmin
      })
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 380, margin: '5rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>회원가입</div>
        <div className="muted">빠르게 계정을 만들어요</div>
      </div>
      <form className="card" onSubmit={handleSignup}>
        <div className="field">
          <label className="label">이름 (실명)</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" autoFocus />
        </div>
        <div className="field">
          <label className="label">닉네임 (로그인용)</label>
          <input value={nick} onChange={e => setNick(e.target.value)} placeholder="영문/숫자 조합 권장" />
        </div>
        <div className="field">
          <label className="label">비밀번호 (6자 이상)</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="비밀번호 설정" />
        </div>
        <div className="field">
          <label className="label">관리자 코드 (있는 경우)</label>
          <input value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="운영기관에서 받은 코드" />
        </div>
        {err && <div style={{ color: '#a32d2d', fontSize: 13, marginBottom: 8 }}>{err}</div>}
        <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={loading}>
          {loading ? <span className="spinner" /> : '가입하기'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/login" style={{ fontSize: 13, color: '#888' }}>← 로그인으로</Link>
        </div>
      </form>
    </div>
  )
}
