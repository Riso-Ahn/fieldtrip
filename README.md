# 현장학습 일지 앱

해외 창업 생태계 탐방 프로그램용 5일간 현장학습 일지 웹앱

---

## 배포 순서

### 1. Supabase 설정

1. [supabase.com](https://supabase.com) → 프로젝트 생성
2. SQL Editor → `supabase-setup.sql` 전체 복사 → 실행
3. Authentication > Settings > Email Auth 확인 (기본 활성화)
4. **이메일 확인 비활성화** (테스트용):
   - Authentication > Settings > "Confirm email" → OFF

### 2. 환경변수 설정

`.env` 파일 생성:
```
VITE_SUPABASE_URL=https://npnwwqelrlrwletssnxo.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### 3. 로컬 테스트

```bash
npm install
npm run dev
```

### 4. Netlify 배포

**방법 A: GitHub 연동 (권장)**
1. GitHub에 이 프로젝트 push
2. netlify.com → New site → GitHub 연동
3. Build command: `npm run build`
4. Publish directory: `dist`

**방법 B: Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### 5. Netlify 환경변수 설정

Netlify 대시보드 → Site settings → Environment variables:
```
VITE_SUPABASE_URL = https://npnwwqelrlrwletssnxo.supabase.co
VITE_SUPABASE_ANON_KEY = (Supabase anon key)
ANTHROPIC_API_KEY = (Anthropic API key)
```

### 6. 관리자 계정 생성

1. 앱에서 닉네임 `admin`, 비밀번호 `5868102743` 으로 가입
2. Supabase SQL Editor에서 실행:
```sql
update profiles set is_admin = true where nickname = 'admin';
```

---

## 계정 구조

| 구분 | 닉네임 | 비밀번호 | 비고 |
|------|--------|---------|------|
| 관리자 | admin | 5868102743 | SQL로 권한 부여 필요 |
| 학생 | 자유 설정 | 6자 이상 | 관리자 코드: GARRISON2026 |

---

## 기술 스택

- Frontend: React + Vite
- Hosting: Netlify
- Database: Supabase (PostgreSQL)
- AI: Claude claude-sonnet-4-20250514 (Netlify Functions)
- Charts: Chart.js + react-chartjs-2
