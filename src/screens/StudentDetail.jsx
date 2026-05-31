import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { GAP_SKILLS, DAY_LABELS } from '../lib/constants'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

function Block({ q, a }) {
  if (!a) return null
  return (
    <div className="detail-block">
      <div className="detail-q">{q}</div>
      <div className="detail-a">{a}</div>
    </div>
  )
}

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [entries, setEntries] = useState({})
  const [activeDay, setActiveDay] = useState(0)

  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
    setStudent(profile)
    const { data: journalEntries } = await supabase
      .from('journal_entries').select('*').eq('user_id', id).order('day_number')
    const map = {}
    journalEntries?.forEach(e => { map[e.day_number] = e.content })
    setEntries(map)
  }

  function renderDay(n) {
    const d = entries[n]
    if (!d) return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>아직 작성하지 않았습니다</div>
    )
    if (n === 0) return (
      <>
        <Block q="이름" a={d.name} />
        <Block q="관심 분야 Top 3" a={(d.top3 || []).join(', ')} />
        <Block q="강점 1" a={d.str1} />
        <Block q="강점 2" a={d.str2} />
        <Block q="강점 3" a={d.str3} />
        <Block q="부족한 점 1" a={d.weak1} />
        <Block q="부족한 점 2" a={d.weak2} />
        <Block q="부족한 점 3" a={d.weak3} />
      </>
    )
    if (n >= 1 && n <= 4) return (
      <>
        <Block q="오전 방문/만남" a={d.am_place} />
        <Block q="오전 요약" a={d.am_sum} />
        <Block q="오후 방문/만남" a={d.pm_place} />
        <Block q="오후 요약" a={d.pm_sum} />
        <Block q="인상 깊은 순간" a={d.impression} />
        <Block q="영감" a={d.inspiration} />
        <Block q="기억에 남는 역할/직업" a={d.person} />
        <Block q="새로 생긴 궁금증" a={d.question} />
        {d.change && <Block q="생각이 바뀐 부분" a={d.change} />}
        <Block q="잘할 수 있을 것" a={d.can_do} />
        <Block q="더 키울 역량" a={d.need_grow} />
      </>
    )
    if (n === 5) {
      const scores = d.scores || {}
      const chartData = {
        labels: GAP_SKILLS,
        datasets: [{
          label: '현재 수준',
          data: GAP_SKILLS.map(s => scores[s] || 5),
          backgroundColor: 'rgba(26,26,26,0.08)',
          borderColor: '#1a1a1a',
          borderWidth: 2,
          pointBackgroundColor: '#1a1a1a',
          pointRadius: 4
        }]
      }
      return (
        <>
          <Block q="목표 진로" a={d.career} />
          <Block q="선택 이유" a={d.reason} />
          <Block q="5년 후 나" a={d.future} />
          <div className="detail-block">
            <div className="detail-q">갭 분석 점수</div>
            {GAP_SKILLS.map(s => (
              <div key={s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, margin: '4px 0' }}>
                <span>{s}</span>
                <strong>{scores[s] || '-'}점</strong>
              </div>
            ))}
            <div style={{ maxWidth: 300, margin: '1rem auto 0' }}>
              <Radar data={chartData} options={{ responsive: true, scales: { r: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }} />
            </div>
          </div>
          <Block q="1개월 실행 계획" a={d.action1} />
          <Block q="1년 목표" a={d.action2} />
          <Block q="계속 연결하고 싶은 것" a={d.connect} />
        </>
      )
    }
  }

  if (!student) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" /></div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="top-bar">
        <div>
          <div style={{ fontWeight: 600 }}>{student.name || student.nickname} 일지 열람</div>
          <div className="muted">@{student.nickname}</div>
        </div>
        <button className="btn btn-sm" onClick={() => navigate('/admin')}>← 목록</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {DAY_LABELS.map((label, i) => (
          <button
            key={i}
            className={`nav-day-btn ${activeDay === i ? 'active' : ''} ${entries[i] ? 'done' : ''}`}
            onClick={() => setActiveDay(i)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {renderDay(activeDay)}
      </div>
    </div>
  )
}
