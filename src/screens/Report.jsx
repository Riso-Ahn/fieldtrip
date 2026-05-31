import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import { GAP_SKILLS } from '../lib/constants'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function Report() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState({})
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [pptLoading, setPptLoading] = useState(false)

  useEffect(() => {
    if (profile?.id) fetchData()
  }, [profile?.id])

  async function fetchData() {
    const { data } = await supabase
      .from('journal_entries')
      .select('day_number, content')
      .eq('user_id', profile.id)
      .order('day_number')
    const map = {}
    data?.forEach(e => { map[e.day_number] = e.content })
    setEntries(map)
    const saved = localStorage.getItem(`report_${profile.id}`)
    if (saved) setReport(JSON.parse(saved))
    else await generateReport(map)
    setLoading(false)
  }

  async function generateReport(entriesData) {
    setAiLoading(true)
    try {
      const res = await fetch('/.netlify/functions/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: Object.entries(entriesData || entries).map(([k, v]) => ({ day_number: parseInt(k), content: v })),
          profile: { name: profile.name || profile.nickname }
        })
      })
      const json = await res.json()
      if (json.report) {
        setReport(json.report)
        localStorage.setItem(`report_${profile.id}`, JSON.stringify(json.report))
      }
    } catch (e) { console.error(e) }
    setAiLoading(false)
  }

  async function exportPPT() {
    setPptLoading(true)
    const { default: pptxgen } = await import('pptxgenjs')
    const prs = new pptxgen()
    prs.layout = 'LAYOUT_WIDE'
    const day5 = entries[5] || {}
    const scores = day5.scores || {}
    const name = profile.name || profile.nickname || '학생'
    const C = { dark:'1a1a1a', mid:'444444', light:'888888', bg:'F7F7F5', white:'FFFFFF', accent:'2D6A4F' }

    // Slide 1: Cover
    const s1 = prs.addSlide()
    s1.background = { color: C.dark }
    s1.addText('해외 현장학습', { x:0.6, y:0.5, w:11.8, h:0.6, fontSize:18, color:C.light, fontFace:'Calibri' })
    s1.addText('진로 계획서', { x:0.6, y:1.1, w:11.8, h:1.4, fontSize:52, bold:true, color:C.white, fontFace:'Calibri' })
    s1.addText(name, { x:0.6, y:2.6, w:8, h:0.6, fontSize:22, color:'A8D5B5', fontFace:'Calibri' })
    s1.addText(day5.career || 'AI 스타트업 창업자', { x:0.6, y:3.2, w:8, h:0.5, fontSize:16, color:C.light, fontFace:'Calibri', italic:true })
    const dayColors = ['2D6A4F','40916C','52B788','74C69D','95D5B2']
    const dayKeywords = [
      report?.day_summaries?.[0]?.keyword || 'AI 생태계',
      report?.day_summaries?.[1]?.keyword || '스타트업',
      report?.day_summaries?.[2]?.keyword || '정책혁신',
      report?.day_summaries?.[3]?.keyword || '투자실행',
      report?.day_summaries?.[4]?.keyword || '문제발견',
    ]
    dayKeywords.forEach((kw, i) => {
      s1.addShape(prs.ShapeType.rect, { x:0.6+i*2.4, y:4.2, w:2.2, h:0.7, fill:{color:dayColors[i]}, line:{color:dayColors[i]} })
      s1.addText(`Day ${i+1}\n${kw}`, { x:0.6+i*2.4, y:4.2, w:2.2, h:0.7, fontSize:9, color:C.white, fontFace:'Calibri', align:'center', valign:'middle' })
    })

    // Slide 2: Gap Analysis
    const s2 = prs.addSlide()
    s2.background = { color: C.bg }
    s2.addText('갭 분석 & 진로 방향', { x:0.5, y:0.3, w:12, h:0.6, fontSize:24, bold:true, color:C.dark, fontFace:'Calibri' })
    s2.addShape(prs.ShapeType.rect, { x:0.5, y:1.0, w:5.5, h:1.0, fill:{color:C.dark}, line:{color:C.dark} })
    s2.addText('목표 진로', { x:0.5, y:1.0, w:5.5, h:0.35, fontSize:11, color:C.light, fontFace:'Calibri', align:'center', valign:'middle' })
    s2.addText(day5.career || 'AI 스타트업 창업자', { x:0.5, y:1.35, w:5.5, h:0.65, fontSize:18, bold:true, color:C.white, fontFace:'Calibri', align:'center', valign:'middle' })
    const skillShort = ['도메인 이해','네트워크','커뮤니케이션','실행력','창의성','글로벌']
    GAP_SKILLS.forEach((skill, i) => {
      const score = scores[skill] || 5
      const y = 2.2 + i * 0.42
      s2.addText(skillShort[i], { x:0.5, y, w:1.8, h:0.35, fontSize:11, color:C.mid, fontFace:'Calibri', valign:'middle' })
      s2.addShape(prs.ShapeType.rect, { x:2.4, y:y+0.05, w:3.5, h:0.25, fill:{color:'E0E0DC'}, line:{color:'E0E0DC'} })
      s2.addShape(prs.ShapeType.rect, { x:2.4, y:y+0.05, w:3.5*score/10, h:0.25, fill:{color:C.accent}, line:{color:C.accent} })
      s2.addText(`${score}점`, { x:6.0, y, w:0.6, h:0.35, fontSize:11, bold:true, color:C.dark, fontFace:'Calibri', valign:'middle' })
    })
    s2.addText('선택 이유', { x:6.8, y:1.0, w:5.6, h:0.35, fontSize:12, bold:true, color:C.mid, fontFace:'Calibri' })
    s2.addText(day5.reason || '', { x:6.8, y:1.4, w:5.6, h:2.0, fontSize:12, color:C.dark, fontFace:'Calibri', valign:'top', wrap:true })
    s2.addShape(prs.ShapeType.rect, { x:6.8, y:3.5, w:5.6, h:1.3, fill:{color:'EAF3DE'}, line:{color:'C0DD97'} })
    s2.addText('5년 후', { x:6.9, y:3.55, w:2, h:0.3, fontSize:11, color:'27500A', bold:true, fontFace:'Calibri' })
    s2.addText(day5.future || '', { x:6.9, y:3.85, w:5.4, h:0.9, fontSize:11, color:C.dark, fontFace:'Calibri', wrap:true, valign:'top' })

    // Slide 3: Milestones + Daily Summary
    const s3 = prs.addSlide()
    s3.background = { color: C.white }
    s3.addText('실행 계획 & 일지 요약', { x:0.5, y:0.3, w:12, h:0.6, fontSize:24, bold:true, color:C.dark, fontFace:'Calibri' })
    const milestones = [
      { label:'1개월', value:day5.action1||'', color:C.dark },
      { label:'1년', value:day5.action2||'', color:C.accent },
      { label:'5년', value:day5.future||'', color:'27500A' },
    ]
    milestones.forEach((m, i) => {
      const x = 0.5 + i * 4.1
      s3.addShape(prs.ShapeType.rect, { x, y:1.1, w:3.8, h:0.4, fill:{color:m.color}, line:{color:m.color} })
      s3.addText(m.label, { x, y:1.1, w:3.8, h:0.4, fontSize:13, bold:true, color:C.white, fontFace:'Calibri', align:'center', valign:'middle' })
      s3.addShape(prs.ShapeType.rect, { x, y:1.5, w:3.8, h:1.3, fill:{color:'F7F7F5'}, line:{color:'E0E0DC'} })
      s3.addText(m.value, { x:x+0.1, y:1.55, w:3.6, h:1.2, fontSize:11, color:C.dark, fontFace:'Calibri', wrap:true, valign:'top' })
    })
    s3.addText('일자별 핵심 인사이트', { x:0.5, y:3.0, w:12, h:0.4, fontSize:14, bold:true, color:C.mid, fontFace:'Calibri' })
    const summaries = report?.day_summaries || []
    summaries.slice(0,4).forEach((s, i) => {
      const x = 0.5 + i * 3.1
      s3.addShape(prs.ShapeType.rect, { x, y:3.5, w:2.9, h:1.3, fill:{color:'F7F7F5'}, line:{color:'E0E0DC'} })
      s3.addText(`Day ${i+1}`, { x:x+0.1, y:3.55, w:1.5, h:0.3, fontSize:11, bold:true, color:C.accent, fontFace:'Calibri' })
      s3.addText(s.summary||'', { x:x+0.1, y:3.85, w:2.7, h:0.9, fontSize:10, color:C.dark, fontFace:'Calibri', wrap:true, valign:'top' })
    })
    s3.addShape(prs.ShapeType.rect, { x:0.5, y:5.0, w:12, h:0.7, fill:{color:C.dark}, line:{color:C.dark} })
    s3.addText(`계속 연결하고 싶은 것  |  ${day5.connect||''}`, { x:0.6, y:5.0, w:11.8, h:0.7, fontSize:12, color:C.white, fontFace:'Calibri', valign:'middle' })

    await prs.writeFile({ fileName: `${name}_진로계획서.pptx` })
    setPptLoading(false)
  }

  const day5 = entries[5] || {}
  const scores = day5.scores || {}
  const chartData = {
    labels: GAP_SKILLS,
    datasets: [{ label:'현재 수준', data:GAP_SKILLS.map(s => scores[s]||5), backgroundColor:'rgba(26,26,26,0.08)', borderColor:'#1a1a1a', borderWidth:2, pointBackgroundColor:'#1a1a1a', pointRadius:4 }]
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'80vh' }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div className="top-bar">
        <div>
          <div style={{ fontWeight:700, fontSize:20 }}>진로계획 리포트</div>
          <div className="muted">{profile?.name || profile?.nickname}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← 뒤로</button>
          <button className="btn btn-primary" onClick={exportPPT} disabled={pptLoading}>
            {pptLoading ? <span className="spinner" /> : '📥 PPT 내보내기'}
          </button>
        </div>
      </div>

      <div style={{ background:'#1a1a1a', borderRadius:16, padding:'2rem', marginBottom:'1rem', color:'#fff' }}>
        <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>목표 진로</div>
        <div style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>{day5.career || '—'}</div>
        <div style={{ fontSize:14, color:'#aaa', lineHeight:1.6 }}>{day5.reason}</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
        <div className="card">
          <div className="section-title">갭 분석</div>
          <div style={{ maxWidth:280, margin:'0 auto' }}>
            <Radar data={chartData} options={{ responsive:true, scales:{ r:{ min:0, max:10, ticks:{ stepSize:2, font:{size:10} } } }, plugins:{ legend:{display:false} } }} />
          </div>
          <div style={{ marginTop:'1rem' }}>
            {GAP_SKILLS.map(skill => {
              const score = scores[skill] || 5
              return (
                <div key={skill} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:12, flex:1, color:'#444' }}>{skill}</span>
                  <div style={{ width:80, height:6, background:'#e8e7e0', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${score*10}%`, height:'100%', background:'#1a1a1a', borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, minWidth:24 }}>{score}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-title">실행 마일스톤</div>
          {[
            { label:'1개월 목표', value:day5.action1, color:'#1a1a1a' },
            { label:'1년 목표', value:day5.action2, color:'#2D6A4F' },
            { label:'5년 비전', value:day5.future, color:'#27500A' },
          ].map(m => (
            <div key={m.label} style={{ marginBottom:'1rem' }}>
              <div style={{ display:'inline-block', fontSize:11, fontWeight:600, background:m.color, color:'#fff', padding:'2px 10px', borderRadius:6, marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.6, background:'#fafaf8', borderRadius:8, padding:'8px 12px' }}>{m.value || '—'}</div>
            </div>
          ))}
          <div style={{ marginTop:'0.5rem' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:6 }}>계속 연결하고 싶은 것</div>
            <div style={{ fontSize:13, color:'#444', lineHeight:1.6 }}>{day5.connect || '—'}</div>
          </div>
        </div>
      </div>

      {(report || aiLoading) && (
        <div className="card" style={{ marginBottom:'1rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <div className="section-title" style={{ margin:0 }}>AI 분석 리포트</div>
            <button className="btn btn-sm" onClick={() => generateReport(entries)} disabled={aiLoading}>
              {aiLoading ? <span className="spinner" /> : '↻ 재분석'}
            </button>
          </div>
          {aiLoading ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'#888' }}>AI가 5일간의 일지를 분석하고 있습니다...</div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                {[
                  { label:'핵심 인사이트', value:report?.insight },
                  { label:'진로 적합성', value:report?.career_fit },
                  { label:'강점 활용', value:report?.strength },
                  { label:'갭 보완 전략', value:report?.gap_strategy },
                ].map(item => (
                  <div key={item.label} style={{ background:'#fafaf8', borderRadius:8, padding:'1rem' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#888', marginBottom:6 }}>{item.label}</div>
                    <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.7 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {report?.message && (
                <div style={{ marginTop:'1rem', background:'#1a1a1a', borderRadius:8, padding:'1rem', color:'#fff', fontSize:14, textAlign:'center', lineHeight:1.6 }}>
                  💬 {report.message}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="card">
        <div className="section-title">일자별 핵심 인사이트</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
          {(report?.day_summaries || []).map((s, i) => (
            <div key={i} style={{ background:'#fafaf8', borderRadius:8, padding:'0.75rem' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#2D6A4F', marginBottom:4 }}>Day {i+1}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#1a1a1a', marginBottom:4 }}>{s.keyword}</div>
              <div style={{ fontSize:11, color:'#666', lineHeight:1.6 }}>{s.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
