import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const QUESTIONS = [
  { id: 'am_place', label: '오전에 방문하거나 만난 곳/사람', ph: '장소, 기관, 인물 등', section: 'morning' },
  { id: 'am_sum', label: '오전 한 줄 요약', ph: '오전을 한 문장으로', section: 'morning' },
  { id: 'pm_place', label: '오후에 방문하거나 만난 곳/사람', ph: '장소, 기관, 인물 등', section: 'afternoon' },
  { id: 'pm_sum', label: '오후 한 줄 요약', ph: '오후를 한 문장으로', section: 'afternoon' },
  { id: 'impression', label: '오늘 가장 인상 깊었던 순간', ph: '장면, 말, 분위기 등', section: 'insight' },
  { id: 'inspiration', label: '어떤 영감을 받았나요?', ph: '아이디어, 느낌, 새로 발견한 것', section: 'insight' },
  { id: 'person', label: '가장 기억에 남는 역할/직업과 그 이유', ph: '그 이유와 함께 써보세요', section: 'insight' },
  { id: 'question', label: '오늘 새롭게 생긴 궁금증', ph: '자유롭게', section: 'insight' },
  { id: 'change', label: '어제 일지와 비교해 생각이 바뀐 부분', ph: "없으면 '없음'이라고 써도 됩니다", section: 'reflect', fromDay: 2 },
  { id: 'can_do', label: '오늘 내가 잘할 수 있을 것 같다고 느낀 것', ph: '', section: 'reflect' },
  { id: 'need_grow', label: '더 키워야겠다고 느낀 역량', ph: '', section: 'reflect' },
]

const SECTION_LABELS = {
  morning: '🌅 오전 활동',
  afternoon: '🌆 오후 활동',
  insight: '💡 인사이트',
  reflect: '🪞 자기 성찰'
}

export default function DayN() {
  const { n } = useParams()
  const dayNum = parseInt(n)
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (profile?.id && !loaded) loadEntry()
  }, [profile?.id])

  async function loadEntry() {
    const { data } = await supabase
      .from('journal_entries')
      .select('content')
      .eq('user_id', profile.id)
      .eq('day_number', dayNum)
      .single()
    if (data?.content) setForm(data.content)
    setLoaded(true)
  }

  async function save() {
    setSaving(true)
    await supabase.from('journal_entries').upsert({
      user_id: profile.id,
      day_number: dayNum,
      content: form
    }, { onConflict: 'user_id,day_number' })
    setSaving(false)
    navigate('/dashboard')
  }

  const visibleQuestions = QUESTIONS.filter(q => !q.fromDay || dayNum >= q.fromDay)
  const sections = [...new Set(visibleQuestions.map(q => q.section))]

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="top-bar">
        <div style={{ fontWeight: 600 }}>Day {dayNum} — 일지</div>
        <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← 뒤로</button>
      </div>

      <div className="card">
        {sections.map(section => (
          <div key={section} style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#888',
              marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {SECTION_LABELS[section]}
            </div>
            {visibleQuestions.filter(q => q.section === section).map(q => (
              <div className="field" key={q.id}>
                <label className="label">{q.label}</label>
                <textarea
                  value={form[q.id] || ''}
                  onChange={e => setForm(f => ({ ...f, [q.id]: e.target.value }))}
                  placeholder={q.ph}
                />
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>취소</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
