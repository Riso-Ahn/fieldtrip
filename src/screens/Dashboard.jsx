import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { DAY_LABELS } from '../lib/constants'

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const [entries, setEntries] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (profile) fetchEntries()
  }, [profile])

  async function fetchEntries() {
    const { data } = await supabase
      .from('journal_entries')
      .select('day_number')
      .eq('user_id', profile.id)
    const map = {}
    data?.forEach(d => { map[d.day_number] = true })
    setEntries(map)
  }

  const completed = Object.keys(entries).length
  const pct = Math.round((completed / 6) * 100)

  function goDay(i) {
    if (i === 0) navigate('/day/0')
    else if (i === 5) navigate('/day5')
    else navigate(`/day/${i}`)
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="top-bar">
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>현장학습 일지</div>
          <div className="muted" style={{ marginTop: 2 }}>안녕하세요, {profile?.name || profile?.nickname}님</div>
        </div>
        <button className="btn btn-sm" onClick={signOut}>로그아웃</button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="muted" style={{ fontSize: 13 }}>전체 진행률</span>
          <span className="muted" style={{ fontSize: 13 }}>{completed}/6 완료 ({pct}%)</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10 }}>
        {DAY_LABELS.map((label, i) => {
          const done = !!entries[i]
          return (
            <button
              key={i}
              className="card"
              onClick={() => goDay(i)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: done ? '#c0dd97' : '#e8e7e0',
                transition: 'all 0.15s',
                padding: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className={`badge ${done ? 'badge-green' : 'badge-amber'}`}>
                  {done ? '완료' : '미작성'}
                </span>
                {done && <span style={{ color: '#639922', fontSize: 16 }}>✓</span>}
              </div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
            </button>
          )
        })}
      </div>

      {entries[5] && (
        <div style={{ marginTop: '1.5rem' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => navigate('/report')}
          >
            📊 최종 진로계획 리포트 보기
          </button>
        </div>
      )}
    </div>
  )
}
