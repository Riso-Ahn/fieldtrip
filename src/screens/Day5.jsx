import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { GAP_SKILLS, SCORE_HINTS } from '../lib/constants'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function Day5() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === '1'
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [form, setForm] = useState({
    career: '', reason: '', future: '',
    action1: '', action2: '', connect: '',
    scores: Object.fromEntries(GAP_SKILLS.map(s => [s, 5]))
  })

  useEffect(() => {
    if (profile) loadEntry()
  }, [profile])

  async function loadEntry() {
    const { data } = await supabase
      .from('journal_entries')
      .select('content')
      .eq('user_id', profile.id)
      .eq('day_number', 5)
      .single()
    if (data?.content) setForm(data.content)
  }

  function setScore(skill, val) {
    const v = Math.min(10, Math.max(1, parseInt(val) || 1))
    setForm(f => ({ ...f, scores: { ...f.scores, [skill]: v } }))
  }

  function getHint(v) {
    const keys = Object.keys(SCORE_HINTS).map(Number).sort((a, b) => a - b)
    let closest = keys[0]
    keys.forEach(k => { if (v >= k) closest = k })
    return SCORE_HINTS[closest] || ''
  }

  async function save() {
    setSaving(true)
    await supabase.from('journal_entries').upsert({
      user_id: profile.id,
      day_number: 5,
      content: form
    }, { onConflict: 'user_id,day_number' })
    setSaving(false)
    navigate('/dashboard')
  }

  async function generateAI() {
    setAiLoading(true)
    setAiResult('')
    try {
      const { data: allEntries } = await supabase
        .from('journal_entries')
        .select('day_number, content')
        .eq('user_id', profile.id)
        .order('day_number')

      const res = await fetch('/.netlify/functions/generate-career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: allEntries, profile: { name: profile.name } })
      })
      const json = await res.json()
      setAiResult(json.result || '분석 결과를 가져오지 못했습니다.')
    } catch (e) {
      setAiResult('오류가 발생했습니다. 다시 시도해주세요.')
    }
    setAiLoading(false)
  }

  const chartData = {
    labels: GAP_SKILLS,
    datasets: [{
      label: '현재 수준',
      data: GAP_SKILLS.map(s => form.scores[s] || 5),
      backgroundColor: 'rgba(26,26,26,0.08)',
      borderColor: '#1a1a1a',
      borderWidth: 2,
      pointBackgroundColor: '#1a1a1a',
      pointRadius: 4
    }]
  }

  const chartOptions = {
    responsive: true,
    scales: {
      r: {
        min: 0, max: 10,
        ticks: { stepSize: 2, font: { size: 11 } },
        pointLabels: { font: { size: 12 } }
      }
    },
    plugins: { legend: { display: false } }
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div className="top-bar">
        <div style={{ fontWeight: 600 }}>Day 5 — 최종 진로계획</div>
        <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← 뒤로</button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="section-title">Part A. 진로 방향</div>
        <div className="field">
          <label className="label">관심이 생긴 진로 / 역할 (자유롭게)</label>
          <input
            value={form.career}
            onChange={e => setForm(f => ({ ...f, career: e.target.value }))}
            placeholder="창업가, 투자자, 디자이너, 정책가 등 무엇이든"
          />
        </div>
        <div className="field">
          <label className="label">그 진로를 선택한 이유 (3가지 이내)</label>
          <textarea
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder={"1. ...\n2. ...\n3. ..."}
          />
        </div>
        <div className="field">
          <label className="label">5년 후 나는 어떤 사람이 되어 있을까요?</label>
          <textarea
            value={form.future}
            onChange={e => setForm(f => ({ ...f, future: e.target.value }))}
            placeholder="자유롭게 써보세요"
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="section-title">Part B. 갭 분석</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          5점=아마추어 수준 · 7점=관련 전공자 수준 · 10점=전문가
        </div>
        {GAP_SKILLS.map(skill => (
          <div className="score-row" key={skill}>
            <span className="score-label">{skill}</span>
            <input
              type="number" min="1" max="10"
              value={form.scores[skill] || 5}
              onChange={e => setScore(skill, e.target.value)}
              style={{ width: 60, textAlign: 'center' }}
            />
            <span className="score-hint">{getHint(form.scores[skill] || 5)}</span>
          </div>
        ))}
        <div style={{ marginTop: '1.5rem', maxWidth: 340, margin: '1.5rem auto 0' }}>
          <Radar
            data={chartData}
            options={chartOptions}
            aria-label="갭 분석 스파이더 그래프"
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="section-title">Part C. 실행 계획</div>
        <div className="field">
          <label className="label">귀국 후 1개월 안에 할 수 있는 행동 1가지</label>
          <textarea
            value={form.action1}
            onChange={e => setForm(f => ({ ...f, action1: e.target.value }))}
            placeholder="구체적일수록 좋아요"
          />
        </div>
        <div className="field">
          <label className="label">1년 안에 경험하고 싶은 것</label>
          <textarea
            value={form.action2}
            onChange={e => setForm(f => ({ ...f, action2: e.target.value }))}
          />
        </div>
        <div className="field">
          <label className="label">이번 탐방에서 계속 연결하고 싶은 것</label>
          <textarea
            value={form.connect}
            onChange={e => setForm(f => ({ ...f, connect: e.target.value }))}
            placeholder="사람, 기관, 아이디어 등"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>취소</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving}>
          {saving ? <span className="spinner" /> : '저장'}
        </button>
      </div>

      {form.career && (
        <div className="card">
          <div className="section-title">AI 진로 분석</div>
          <div className="muted" style={{ marginBottom: 12 }}>
            5일간의 일지를 바탕으로 Claude가 진로 방향을 분석해드립니다
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={generateAI} disabled={aiLoading}>
            {aiLoading ? <><span className="spinner" /> 분석 중...</> : '✨ AI 분석 실행'}
          </button>
          {aiResult && (
            <div style={{
              marginTop: '1rem',
              background: '#fafaf8',
              borderRadius: 8,
              padding: '1rem',
              fontSize: 14,
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap'
            }}>
              {aiResult}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
