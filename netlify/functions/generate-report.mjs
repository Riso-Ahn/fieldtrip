export default async function handler(req, context) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { entries, profile } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY

  const journalText = (entries || []).map(e => {
    const d = e.content
    if (!d) return ''
    if (e.day_number === 0) {
      return `[Day 0] 관심분야: ${(d.top3||[]).join(', ')} / 강점: ${[d.str1,d.str2,d.str3].filter(Boolean).join(', ')} / 부족한점: ${[d.weak1,d.weak2,d.weak3].filter(Boolean).join(', ')}`
    }
    if (e.day_number >= 1 && e.day_number <= 4) {
      return `[Day ${e.day_number}] 오전: ${d.am_place||''} | 오후: ${d.pm_place||''} | 인상: ${d.impression||''} | 영감: ${d.inspiration||''} | 역할: ${d.person||''} | 성장: ${d.need_grow||''}`
    }
    if (e.day_number === 5) {
      const scores = d.scores || {}
      return `[Day 5] 진로: ${d.career||''} | 이유: ${d.reason||''} | 5년후: ${d.future||''} | 점수: ${Object.entries(scores).map(([k,v])=>`${k}${v}점`).join(',')} | 1개월: ${d.action1||''} | 1년: ${d.action2||''}`
    }
    return ''
  }).filter(Boolean).join('\n')

  const career = entries?.find?.(e=>e.day_number===5)?.content?.career || '창업가'

  const prompt = `당신은 청소년 진로 코치입니다. 해외 창업 생태계 탐방 프로그램 참가자(${profile?.name||'학생'})의 5일간 일지를 분석해서 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

일지 내용:
${journalText}

응답 형식 (JSON만):
{
  "insight": "5일간 학생이 보여준 핵심 성장 인사이트 2-3문장",
  "career_fit": "선택한 진로와 일지 내용의 연결성 분석 2-3문장",
  "strength": "강점이 목표 진로에 어떻게 연결될 수 있는지 2-3문장",
  "gap_strategy": "낮은 점수 역량 보완을 위한 구체적 전략 2-3문장",
  "message": "학생에게 보내는 진심 어린 응원 한 문장",
  "day_summaries": [
    {"day": 1, "keyword": "2-3단어 핵심키워드", "summary": "핵심 인사이트 한 문장"},
    {"day": 2, "keyword": "2-3단어 핵심키워드", "summary": "핵심 인사이트 한 문장"},
    {"day": 3, "keyword": "2-3단어 핵심키워드", "summary": "핵심 인사이트 한 문장"},
    {"day": 4, "keyword": "2-3단어 핵심키워드", "summary": "핵심 인사이트 한 문장"}
  ],
  "ideal_scores": {
    "전문 지식 (도메인 이해)": 9,
    "네트워크 / 관계 형성": 8,
    "커뮤니케이션 / 설득력": 9,
    "실행력 / 추진력": 9,
    "창의성 / 문제해결": 8,
    "글로벌 감각 / 언어": 7
  },
  "roadmap": [
  {"category": "도메인 학습", "phases": [
  {"period": "1개월", "goal": "목표", "milestone": "결과물"},
  {"period": "6개월", "goal": "목표", "milestone": "결과물"},
  {"period": "1년", "goal": "목표", "milestone": "결과물"},
  {"period": "5년", "goal": "목표", "milestone": "결과물"}
  ]},
  {"category": "네트워크 구축", "phases": [
  {"period": "1개월", "goal": "목표", "milestone": "결과물"},
  {"period": "6개월", "goal": "목표", "milestone": "결과물"},
  {"period": "1년", "goal": "목표", "milestone": "결과물"},
    {"period": "5년", "goal": "목표", "milestone": "결과물"}
  ]},
  {"category": "실행 경험", "phases": [
  {"period": "1개월", "goal": "목표", "milestone": "결과물"},
  {"period": "6개월", "goal": "목표", "milestone": "결과물"},
  {"period": "1년", "goal": "목표", "milestone": "결과물"},
  {"period": "5년", "goal": "목표", "milestone": "결과물"}
  ]},
  {"category": "글로벌 역량", "phases": [
  {"period": "1개월", "goal": "목표", "milestone": "결과물"},
  {"period": "6개월", "goal": "목표", "milestone": "결과물"},
    {"period": "1년", "goal": "목표", "milestone": "결과물"},
    {"period": "5년", "goal": "목표", "milestone": "결과물"}
  ]},
  {"category": "창업 준비", "phases": [
  {"period": "1개월", "goal": "목표", "milestone": "결과물"},
  {"period": "6개월", "goal": "목표", "milestone": "결과물"},
  {"period": "1년", "goal": "목표", "milestone": "결과물"},
  {"period": "5년", "goal": "목표", "milestone": "결과물"}
  ]}
  ]
}

ideal_scores는 "${career}" 진로에 필요한 각 역량의 이상적인 목표 점수(1-10)를 설정해주세요.
roadmap의 각 goal과 milestone은 학생의 일지 내용, 강점, 부족한 점을 반영해서 구체적이고 실행 가능하게 작성해주세요.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const report = JSON.parse(clean)

    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
