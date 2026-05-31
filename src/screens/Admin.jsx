import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { DAY_LABELS } from '../lib/constants'

export default function Admin() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStudents() }, [])

  async function fetchStudents() {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', false)
      .order('created_at')

    if (!profiles) { setLoading(false); return }

    const { data: entries } = await supabase
      .from('journal_entries')
      .select('user_id, day_number')

    const entryMap = {}
    entries?.forEach(e => {
      if (!entryMap[e.user_id]) entryMap[e.user_id] = new Set()
      entryMap[e.user_id].add(e.day_number)
    })

    setStudents(profiles.map(p => ({ ...p, completedDays: entryMap[p.id] || new Set() })))
    setLoading(false)
  }

  const totalCompleted = students.filter(s => s.completedDays.has(5)).length
  const avgProgress = students.length
    ? Math.round(students.reduce((a, s) => a + s.completedDays.size, 0) / students.length / 6 * 100)
    : 0

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="top-bar">
        <div style={{ fontWeight: 700, fontSize: 18 }}>관리자 대시보드</div>
        <button className="btn btn-sm" onClick={signOut}>로그아웃</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
        {[
          { label: '총 참가자', value: `${students.length}명` },
          { label: '진로계획 완성', value: `${totalCompleted}명` },
          { label: '평균 진행률', value: `${avgProgress}%` }
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ background: '#fafaf8', border: 'none' }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>닉네임</th>
                {[0,1,2,3,4,5].map(i => <th key={i}>D{i}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                    아직 가입한 학생이 없습니다
                  </td>
                </tr>
              ) : students.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name || '-'}</td>
                  <td className="muted">{s.nickname}</td>
                  {[0,1,2,3,4,5].map(i => (
                    <td key={i} style={{ textAlign: 'center' }}>
                      {s.completedDays.has(i)
                        ? <span style={{ color: '#639922', fontWeight: 700 }}>✓</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn btn-sm"
                      onClick={() => navigate(`/admin/student/${s.id}`)}
                    >
                      열람
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
