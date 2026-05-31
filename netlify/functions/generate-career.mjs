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
      return `[Day 0 사전설문]
이름: ${d.name || ''}
관심 분야: ${(d.top3 || []).join(', ')}
강점: ${[d.str1, d.str2, d.str3].filter(Boolean).join(' / ')}
부족한 점: ${[d.weak1, d.weak2, d.weak3].filter(Boolean).join(' / ')}`
    }
    if (e.day_number >= 1 && e.day_number <= 4) {
      return `[Day ${e.day_number}]
오전: ${d.am_place || ''} - ${d.am_sum || ''}
오후: ${d.pm_place || ''} - ${d.pm_sum || ''}
인상 깊은 순간: ${d.impression || ''}
영감: ${d.inspiration || ''}
기억에 남는 역할: ${d.person || ''}
새로운 궁금증: ${d.question || ''}
더 키울 역량: ${d.need_grow || ''}`
    }
    if (e.day_number === 5) {
      const scores = d.scores || {}
      return `[Day 5 최종]
목표 진로: ${d.career || ''}
선택 이유: ${d.reason || ''}
5년 후 나: ${d.future || ''}
갭 분석: ${Object.entries(scores).map(([k, v]) => `${k} ${v}점`).join(', ')}
1개월 실행 계획: ${d.action1 || ''}
1년 목표: ${d.action2 || ''}
계속 연결하고 싶은 것: ${d.connect || ''}`
    }
    return ''
  }).filter(Boolean).join('\n\n')

  const prompt = `다음은 해외 창업 생태계 탐방 프로그램에 참가한 학생(${profile?.name || '학생'})의 5일간 현장학습 일지입니다.

${journalText}

위 일지를 바탕으로 아래 내용을 분석해주세요:

1. **핵심 인사이트 요약** (2-3문장): 이 학생이 5일간 가장 많이 탐구하고 끌렸던 것
2. **진로 방향 분석**: 학생이 선택한 진로와 일지 내용의 연결성, 적합성
3. **강점 활용 방안**: 학생의 강점이 목표 진로에 어떻게 연결될 수 있는지
4. **갭 보완 전략**: 낮게 평가한 역량을 키우기 위한 구체적인 제안 (2-3가지)
5. **한 줄 응원 메시지**: 이 학생에게 보내는 진심 어린 한 마디

중고등학생 눈높이에 맞게 따뜻하고 격려하는 톤으로 작성해주세요. 각 항목은 번호와 제목으로 구분해주세요.`

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const result = data.content?.[0]?.text || '분석 결과를 가져오지 못했습니다.'

    return new Response(JSON.stringify({ result }), {
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

export const config = {
  path: '/api/generate-career'
}
