import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { INDUSTRIES, ROLES } from '../lib/constants'

export default function Day0() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', str1: '', str2: '', str3: '',
    weak1: '', weak2: '', weak3: '', top3: []
  })
  const [selInd, setSelInd] = useState('')
  const [selRole, setSelRole] = useState('')

  useEffect(() => {
    if (profile) loadEntry()
  }, [profile])

  async function loadEntry() {
    const { data } = await supabase
      .from('journal_entries')
      .select('content')
      .eq('user_id', profile.id)
      .eq('day_number', 0)
      .single()
    if (data?.content) setForm(data.content)
  }

  function addTag() {
    if (!selInd || !selRole) return
    const tag = `${selInd} × ${selRole}`
    if (form.top3.length >= 3 || form.top3.includes(tag)) return
    setForm(f => ({ ...f, top3: [...f.top3, tag] }))
    setSelInd(''); setSelRole('')
  }

  function removeTag(tag) {
    setForm(f => ({ ...f, top3: f.top3.filter(t => t !== tag) }))
  }

  async function save() {
    setSaving(true)
    await supabase.from('journal_entries').upsert({
      user_id: profile.id,
      day_number: 0,
      content: form
    }, { onConflict: 'user_id,day_number' })
    setSaving(false)
    navigate('/dashboard')
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="top-bar">
        <div style={{ fontWeight: 600 }}>Day 0 — 사전 설문</div>
        <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← 뒤로</button>
      </div>

      <div className="card">
        <div className="field">
          <label className="label">이름 (실명)</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="홍길동" />
        </div>

        <div className="field">
          <label className="label">현재 관심 있는 분야 Top 3</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {form.top3.map(tag => (
              <span key={tag} className="tag">
                {tag}
                <button onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
            {form.top3.length === 0 && <span className="muted">아직 선택하지 않았어요</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={selInd} onChange={e => setSelInd(e.target.value)} style={{ flex: '1 1 160px' }}>
              <option value="">산업 선택</option>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
            <select value={selRole} onChange={e => setSelRole(e.target.value)} style={{ flex: '1 1 160px' }}>
              <option value="">직무 선택</option>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <button className="btn btn-sm" onClick={addTag} disabled={form.top3.length >= 3}>추가</button>
          </div>
          <div className="muted" style={{ marginTop: 6 }}>산업 + 직무 조합으로 최대 3개</div>
        </div>

        <div className="section-title" style={{ marginTop: '1.5rem' }}>나의 강점 3가지</div>
        {[1, 2, 3].map(i => (
          <div className="field" key={i}>
            <input
              value={form[`str${i}`]}
              onChange={e => setForm(f => ({ ...f, [`str${i}`]: e.target.value }))}
              placeholder={`강점 ${i}`}
            />
          </div>
        ))}

        <div className="section-title" style={{ marginTop: '0.5rem' }}>부족하다고 느끼는 것 3가지</div>
        {[1, 2, 3].map(i => (
          <div className="field" key={i}>
            <input
              value={form[`weak${i}`]}
              onChange={e => setForm(f => ({ ...f, [`weak${i}`]: e.target.value }))}
              placeholder={`부족한 점 ${i}`}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>취소</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
