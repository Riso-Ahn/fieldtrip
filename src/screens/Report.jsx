import React, { useEffect, useState } from 'react'
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

const PERIODS = ['1개월', '6개월', '1년', '5년']
const PERIOD_COLORS = ['#1a1a1a', '#40916C', '#52B788', '#95D5B2']

function buildPrompt(entriesData, profile) {
  const entries = typeof entriesData === 'object' && !Array.isArray(entriesData)
    ? Object.entries(entriesData).map(([k, v]) => ({ day_number: parseInt(k), content: v }))
    : entriesData

  const journalText = (entries || []).map(e => {
    const d = e.content
    if (!d) return ''
    if (e.day_number === 0) return `[Day 0] 관심분야: ${(d.top3||[]).join(', ')} / 강점: ${[d.str1,d.str2,d.str3].filter(Boolean).join(', ')} / 부족한점: ${[d.weak1,d.weak2,d.weak3].filter(Boolean).join(', ')}`
    if (e.day_number >= 1 && e.day_number <= 4) return `[Day ${e.day_number}] 오전: ${d.am_place||''} | 오후: ${d.pm_place||''} | 인상: ${d.impression||''} | 영감: ${d.inspiration||''} | 역할: ${d.person||''} | 성장: ${d.need_grow||''}`
    if (e.day_number === 5) { const s = d.scores||{}; return `[Day 5] 진로: ${d.career||''} | 이유: ${d.reason||''} | 5년후: ${d.future||''} | 점수: ${Object.entries(s).map(([k,v])=>`${k}${v}점`).join(',')} | 1개월: ${d.action1||''} | 1년: ${d.action2||''}` }
    return ''
  }).filter(Boolean).join('\n')

  const career = entries?.find(e => e.day_number === 5)?.content?.career || '창업가'
  const name = profile?.name || profile?.nickname || '학생'

  return `당신은 청소년 진로 코치입니다. 해외 창업 생태계 탐방 프로그램 참가자(${name})의 5일간 일지를 분석해서 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.\n\n일지:\n${journalText}\n\n{"insight":"2-3문장","career_fit":"2-3문장","strength":"2-3문장","gap_strategy":"2-3문장","message":"한 문장","day_summaries":[{"day":1,"keyword":"키워드","summary":"한 문장"},{"day":2,"keyword":"키워드","summary":"한 문장"},{"day":3,"keyword":"키워드","summary":"한 문장"},{"day":4,"keyword":"키워드","summary":"한 문장"}],"ideal_scores":{"전문 지식 (도메인 이해)":9,"네트워크 / 관계 형성":8,"커뮤니케이션 / 설득력":9,"실행력 / 추진력":9,"창의성 / 문제해결":8,"글로벌 감각 / 언어":7},"roadmap":[{"category":"도메인 학습","phases":[{"period":"1개월","goal":"목표","milestone":"결과물"},{"period":"6개월","goal":"목표","milestone":"결과물"},{"period":"1년","goal":"목표","milestone":"결과물"},{"period":"5년","goal":"목표","milestone":"결과물"}]},{"category":"네트워크 구축","phases":[{"period":"1개월","goal":"목표","milestone":"결과물"},{"period":"6개월","goal":"목표","milestone":"결과물"},{"period":"1년","goal":"목표","milestone":"결과물"},{"period":"5년","goal":"목표","milestone":"결과물"}]},{"category":"실행 경험","phases":[{"period":"1개월","goal":"목표","milestone":"결과물"},{"period":"6개월","goal":"목표","milestone":"결과물"},{"period":"1년","goal":"목표","milestone":"결과물"},{"period":"5년","goal":"목표","milestone":"결과물"}]},{"category":"글로벌 역량","phases":[{"period":"1개월","goal":"목표","milestone":"결과물"},{"period":"6개월","goal":"목표","milestone":"결과물"},{"period":"1년","goal":"목표","milestone":"결과물"},{"period":"5년","goal":"목표","milestone":"결과물"}]},{"category":"창업 준비","phases":[{"period":"1개월","goal":"목표","milestone":"결과물"},{"period":"6개월","goal":"목표","milestone":"결과물"},{"period":"1년","goal":"목표","milestone":"결과물"},{"period":"5년","goal":"목표","milestone":"결과물"}]}]}\n\nideal_scores는 "${career}" 진로 기준으로, roadmap goal/milestone은 일지 내용 반영해서 구체적으로 작성.`
}

function GanttChart({ roadmap }) {
  const [hoveredCell, setHoveredCell] = useState(null)
  if (!roadmap?.length) return null

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ width: 120, padding: '8px 12px', textAlign: 'left', fontSize: 12, color: '#888', fontWeight: 600, borderBottom: '1px solid #e8e7e0' }}>카테고리</th>
            {PERIODS.map((p, i) => (
              <th key={p} style={{ padding: '8px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#fff', background: PERIOD_COLORS[i], borderBottom: '1px solid #e8e7e0', minWidth: i >= 3 ? 140 : 110 }}>
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roadmap.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid #f0efea' }}>
              <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#1a1a1a', background: '#fafaf8', whiteSpace: 'nowrap' }}>
                {row.category}
              </td>
              {PERIODS.map((p, pi) => {
                const phase = row.phases?.find(ph => ph.period === p)
                const isHovered = hoveredCell === `${ri}-${pi}`
                return (
                  <td
                    key={p}
                    style={{ padding: '6px 8px', verticalAlign: 'top', position: 'relative', cursor: phase ? 'pointer' : 'default' }}
                    onMouseEnter={() => phase && setHoveredCell(`${ri}-${pi}`)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {phase && (
                      <div style={{
                        background: PERIOD_COLORS[pi],
                        borderRadius: 6,
                        padding: '6px 8px',
                        opacity: isHovered ? 1 : 0.85,
                        transition: 'all 0.15s',
                        transform: isHovered ? 'scale(1.02)' : 'scale(1)'
                      }}>
                        <div style={{ fontSize: 11, color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>{phase.goal}</div>
                        {isHovered && (
                          <div style={{ marginTop: 4, fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4 }}>
                            🎯 {phase.milestone}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 11, color: '#aaa' }}>* 각 셀에 마우스를 올리면 달성 지표를 확인할 수 있습니다</div>
    </div>
  )
}

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
    const saved = localStorage.getItem(`report_v2_${profile.id}`)
    if (saved) setReport(JSON.parse(saved))
    else await generateReport(map)
    setLoading(false)
  }

  async function generateReport(entriesData) {
    setAiLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3500,
          messages: [{ role: 'user', content: buildPrompt(entriesData || entries, profile) }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      const reportData = JSON.parse(clean)
      setReport(reportData)
      localStorage.setItem(`report_v2_${profile.id}`, JSON.stringify(reportData))
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

    const s1 = prs.addSlide()
    s1.background = { color: C.dark }
    s1.addText('해외 현장학습', { x:0.6, y:0.5, w:11.8, h:0.6, fontSize:18, color:C.light, fontFace:'Calibri' })
    s1.addText('진로 계획서', { x:0.6, y:1.1, w:11.8, h:1.4, fontSize:52, bold:true, color:C.white, fontFace:'Calibri' })
    s1.addText(name, { x:0.6, y:2.6, w:8, h:0.6, fontSize:22, color:'A8D5B5', fontFace:'Calibri' })
    s1.addText(day5.career || '', { x:0.6, y:3.2, w:8, h:0.5, fontSize:16, color:C.light, fontFace:'Calibri', italic:true })
    const dayColors = ['2D6A4F','40916C','52B788','74C69D','95D5B2']
    ;(report?.day_summaries||[]).slice(0,5).forEach((s, i) => {
      s1.addShape(prs.ShapeType.rect, { x:0.6+i*2.4, y:4.2, w:2.2, h:0.7, fill:{color:dayColors[i]}, line:{color:dayColors[i]} })
      s1.addText(`Day ${i+1}\n${s.keyword||''}`, { x:0.6+i*2.4, y:4.2, w:2.2, h:0.7, fontSize:9, color:C.white, fontFace:'Calibri', align:'center', valign:'middle' })
    })

    const s2 = prs.addSlide()
    s2.background = { color: C.bg }
    s2.addText('갭 분석 & 진로 방향', { x:0.5, y:0.3, w:12, h:0.6, fontSize:24, bold:true, color:C.dark, fontFace:'Calibri' })
    s2.addShape(prs.ShapeType.rect, { x:0.5, y:1.0, w:5.5, h:0.9, fill:{color:C.dark}, line:{color:C.dark} })
    s2.addText('목표 진로', { x:0.5, y:1.0, w:5.5, h:0.3, fontSize:11, color:C.light, fontFace:'Calibri', align:'center', valign:'middle' })
    s2.addText(day5.career || '', { x:0.5, y:1.3, w:5.5, h:0.6, fontSize:18, bold:true, color:C.white, fontFace:'Calibri', align:'center', valign:'middle' })
    const idealScores = report?.ideal_scores || {}
    const skillShort = ['도메인 이해','네트워크','커뮤니케이션','실행력','창의성','글로벌']
    GAP_SKILLS.forEach((skill, i) => {
      const current = scores[skill] || 5
      const ideal = idealScores[skill] || 8
      const y = 2.1 + i * 0.42
      s2.addText(skillShort[i], { x:0.5, y, w:1.8, h:0.35, fontSize:11, color:C.mid, fontFace:'Calibri', valign:'middle' })
      s2.addShape(prs.ShapeType.rect, { x:2.4, y:y+0.05, w:3.0, h:0.22, fill:{color:'E0E0DC'}, line:{color:'E0E0DC'} })
      s2.addShape(prs.ShapeType.rect, { x:2.4, y:y+0.05, w:3.0*ideal/10, h:0.22, fill:{color:'C0DD97'}, line:{color:'C0DD97'} })
      s2.addShape(prs.ShapeType.rect, { x:2.4, y:y+0.05, w:3.0*current/10, h:0.22, fill:{color:C.dark}, line:{color:C.dark} })
      s2.addText(`${current}→${ideal}`, { x:5.5, y, w:0.8, h:0.35, fontSize:10, color:C.dark, fontFace:'Calibri', valign:'middle' })
    })
    s2.addText('선택 이유', { x:6.8, y:1.0, w:5.6, h:0.35, fontSize:12, bold:true, color:C.mid, fontFace:'Calibri' })
    s2.addText(day5.reason || '', { x:6.8, y:1.4, w:5.6, h:1.8, fontSize:11, color:C.dark, fontFace:'Calibri', valign:'top', wrap:true })
    s2.addShape(prs.ShapeType.rect, { x:6.8, y:3.3, w:5.6, h:1.5, fill:{color:'EAF3DE'}, line:{color:'C0DD97'} })
    s2.addText('5년 후', { x:6.9, y:3.35, w:2, h:0.3, fontSize:11, color:'27500A', bold:true, fontFace:'Calibri' })
    s2.addText(day5.future || '', { x:6.9, y:3.65, w:5.3, h:1.0, fontSize:11, color:C.dark, fontFace:'Calibri', wrap:true, valign:'top' })

    const s3 = prs.addSlide()
    s3.background = { color: C.white }
    s3.addText('5개년 성장 로드맵', { x:0.5, y:0.3, w:12, h:0.5, fontSize:22, bold:true, color:C.dark, fontFace:'Calibri' })
    const periods = ['1개월','3개월','6개월','1년','3년','5년']
    const pColors = ['1a1a1a','2D6A4F','40916C','52B788','74C69D','95D5B2']
    const colW = 1.9
    periods.forEach((p, pi) => {
      s3.addShape(prs.ShapeType.rect, { x:2.0+pi*colW, y:0.9, w:colW-0.05, h:0.35, fill:{color:pColors[pi]}, line:{color:pColors[pi]} })
      s3.addText(p, { x:2.0+pi*colW, y:0.9, w:colW-0.05, h:0.35, fontSize:11, bold:true, color:'FFFFFF', fontFace:'Calibri', align:'center', valign:'middle' })
    })
    ;(report?.roadmap||[]).slice(0,5).forEach((row, ri) => {
      const y = 1.35 + ri * 0.9
      s3.addShape(prs.ShapeType.rect, { x:0.4, y, w:1.55, h:0.8, fill:{color:'F0EFE8'}, line:{color:'E0DFD8'} })
      s3.addText(row.category, { x:0.4, y, w:1.55, h:0.8, fontSize:10, bold:true, color:C.dark, fontFace:'Calibri', align:'center', valign:'middle', wrap:true })
      periods.forEach((p, pi) => {
        const phase = row.phases?.find(ph => ph.period === p)
        if (phase) {
          s3.addShape(prs.ShapeType.rect, { x:2.0+pi*colW, y:y+0.04, w:colW-0.1, h:0.72, fill:{color:pColors[pi]+'22'}, line:{color:pColors[pi]} })
          s3.addText(phase.goal, { x:2.05+pi*colW, y:y+0.06, w:colW-0.18, h:0.65, fontSize:8, color:C.dark, fontFace:'Calibri', wrap:true, valign:'top' })
        }
      })
    })

    await prs.writeFile({ fileName: `${name}_진로계획서.pptx` })
    setPptLoading(false)
  }

  const day5 = entries[5] || {}
  const scores = day5.scores || {}
  const idealScores = report?.ideal_scores || {}

  const chartData = {
    labels: GAP_SKILLS,
    datasets: [
      {
        label: '현재 수준',
        data: GAP_SKILLS.map(s => scores[s] || 5),
        backgroundColor: 'rgba(26,26,26,0.1)',
        borderColor: '#1a1a1a',
        borderWidth: 2.5,
        pointBackgroundColor: '#1a1a1a',
        pointRadius: 4
      },
      {
        label: '목표 수준',
        data: GAP_SKILLS.map(s => idealScores[s] || 8),
        backgroundColor: 'rgba(45,106,79,0.08)',
        borderColor: '#2D6A4F',
        borderWidth: 2,
        borderDash: [5, 4],
        pointBackgroundColor: '#2D6A4F',
        pointRadius: 3
      }
    ]
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'80vh' }}>
      <span className="spinner" />
    </div>
  )

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div className="top-bar">
        <div>
          <div style={{ fontWeight:700, fontSize:20 }}>진로계획 리포트</div>
          <div className="muted">{profile?.name || profile?.nickname}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← 뒤로</button>
          <button className="btn btn-sm" onClick={() => { localStorage.removeItem(`report_v2_${profile.id}`); generateReport(entries) }} disabled={aiLoading}>
            {aiLoading ? <span className="spinner" /> : '↻ 재분석'}
          </button>
          <button className="btn btn-primary" onClick={exportPPT} disabled={pptLoading}>
            {pptLoading ? <span className="spinner" /> : '📥 PPT 내보내기'}
          </button>
        </div>
      </div>

      <div style={{ background:'#1a1a1a', borderRadius:16, padding:'1.5rem 2rem', marginBottom:'1rem', color:'#fff' }}>
        <div style={{ fontSize:11, color:'#888', marginBottom:4, letterSpacing:'0.05em', textTransform:'uppercase' }}>목표 진로</div>
        <div style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>{day5.career || '—'}</div>
        <div style={{ fontSize:13, color:'#aaa', lineHeight:1.9 }}>
          {(day5.reason || '').split(/(?=\d\.)/).filter(Boolean).map((line, i) => (
            <div key={i} style={{ marginBottom: 4 }}>{line.trim()}</div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
        <div className="card">
          <div className="section-title">갭 분석</div>
          <div style={{ maxWidth:300, margin:'0 auto' }}>
            <Radar data={chartData} options={{
              responsive: true,
              scales: { r: { min:0, max:10, ticks:{ stepSize:2, font:{size:10} }, pointLabels:{ font:{size:10}, padding:8 } } },
              plugins: { legend: { position:'bottom', labels:{ font:{size:11}, padding:12 } } },
              layout: { padding: { top:16, left:16, right:16, bottom:8 } }
            }} />
          </div>
          <div style={{ marginTop:'1rem' }}>
            {GAP_SKILLS.map(skill => {
              const current = scores[skill] || 5
              const ideal = idealScores[skill] || 8
              const gap = ideal - current
              return (
                <div key={skill} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:11, flex:1, color:'#444' }}>{skill}</span>
                  <div style={{ width:100, height:8, background:'#e8e7e0', borderRadius:4, overflow:'hidden', position:'relative' }}>
                    <div style={{ position:'absolute', left:0, top:0, width:`${ideal*10}%`, height:'100%', background:'#c0dd97', borderRadius:4 }} />
                    <div style={{ position:'absolute', left:0, top:0, width:`${current*10}%`, height:'100%', background:'#1a1a1a', borderRadius:4 }} />
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, minWidth:36, color: gap > 2 ? '#a32d2d' : gap > 0 ? '#633806' : '#27500a' }}>
                    {current}→{ideal}
                  </span>
                </div>
              )
            })}
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <span style={{ fontSize:10, color:'#888' }}>■ 현재</span>
              <span style={{ fontSize:10, color:'#2D6A4F' }}>■ 목표</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">실행 마일스톤</div>
          {[
            { label:'1개월', value:day5.action1, color:'#1a1a1a' },
            { label:'1년', value:day5.action2, color:'#2D6A4F' },
            { label:'5년 비전', value:day5.future, color:'#27500A' },
          ].map(m => (
            <div key={m.label} style={{ marginBottom:'1rem' }}>
              <div style={{ display:'inline-block', fontSize:11, fontWeight:600, background:m.color, color:'#fff', padding:'2px 10px', borderRadius:6, marginBottom:6 }}>{m.label}</div>
              <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.6, background:'#fafaf8', borderRadius:8, padding:'8px 12px' }}>{m.value || '—'}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'#888', marginBottom:6 }}>계속 연결하고 싶은 것</div>
            <div style={{ fontSize:13, color:'#444', lineHeight:1.6 }}>{day5.connect || '—'}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom:'1rem' }}>
        <div className="section-title">5개년 성장 로드맵</div>
        {aiLoading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'#888' }}>AI가 맞춤형 로드맵을 생성하고 있습니다...</div>
        ) : (
          <GanttChart roadmap={report?.roadmap} />
        )}
      </div>

      {report && !aiLoading && (
        <div className="card" style={{ marginBottom:'1rem' }}>
          <div className="section-title">AI 분석 리포트</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {[
              { label:'핵심 인사이트', value:report.insight },
              { label:'진로 적합성', value:report.career_fit },
              { label:'강점 활용', value:report.strength },
              { label:'갭 보완 전략', value:report.gap_strategy },
            ].map(item => (
              <div key={item.label} style={{ background:'#fafaf8', borderRadius:8, padding:'1rem' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#888', marginBottom:6 }}>{item.label}</div>
                <div style={{ fontSize:13, color:'#1a1a1a', lineHeight:1.7 }}>{item.value}</div>
              </div>
            ))}
          </div>
          {report.message && (
            <div style={{ marginTop:'1rem', background:'#1a1a1a', borderRadius:8, padding:'1rem', color:'#fff', fontSize:14, textAlign:'center', lineHeight:1.6 }}>
              💬 {report.message}
            </div>
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
