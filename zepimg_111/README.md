# 🎨 Sprite Maker API Server

AI 기반 픽셀 아트 스프라이트 생성 백엔드 서버

## 📋 개요

사용자가 업로드한 이미지를 기반으로 Google Gemini AI를 사용하여 픽셀 아트 스프라이트 시트를 자동 생성하는 FastAPI 서버입니다.

### 주요 기능

- 🤖 **AI 이미지 생성**: Google Gemini API를 사용한 고품질 픽셀 아트 생성
- 💾 **Supabase Storage**: 생성된 스프라이트를 Supabase Storage에 저장
- 📁 **사용자별 관리**: 사용자별로 폴더 분리하여 스프라이트 관리
- 🗑️ **자동 정리**: 새 스프라이트 생성 시 기존 파일 자동 삭제

### 기술 스택

- **Framework**: FastAPI + Uvicorn
- **AI**: Google Gemini 3 Pro Image Preview
- **Storage**: Supabase Storage
- **Image Processing**: Pillow (PIL)

---

## 🚀 설치 및 실행

### 1️⃣ 사전 요구사항

- Python 3.8 이상
- Google Gemini API 키
- Supabase 프로젝트 (Service Role Key 필요)

### 2️⃣ 패키지 설치

```bash
cd zepimg_111
pip install -r requirements.txt
```

### 3️⃣ 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 실제 값을 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```env
# Google Gemini API 키
GOOGLE_API_KEY=AIzaSy...

# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### 📌 API 키 획득 방법

**Google Gemini API**:
1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. Google 계정으로 로그인
3. "API 키 만들기" 클릭
4. 생성된 키 복사

**Supabase**:
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. Settings → API → Service Role Key 복사
4. Project URL도 함께 복사

### 4️⃣ 서버 실행

```bash
python api_server.py
```

서버가 시작되면 다음 주소에서 접근 가능합니다:
- **API 서버**: http://127.0.0.1:8000
- **API 문서**: http://127.0.0.1:8000/docs (Swagger UI)

---

## 📡 API 엔드포인트

### 1. 서버 상태 확인

```http
GET /
```

**응답**:
```json
{
  "message": "Sprite Maker API Server",
  "version": "2.0",
  "storage": "Supabase Storage",
  "ai": "Google Gemini"
}
```

---

### 2. 스프라이트 생성

```http
POST /create-sprite
Content-Type: multipart/form-data
```

**파라미터**:
| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `user_id` | string | ✅ | 사용자 ID |
| `nickname` | string | ✅ | 닉네임 (파일명에 사용) |
| `file` | file | ✅ | 업로드할 이미지 파일 |
| `old_sprite_url` | string | ❌ | 기존 스프라이트 URL (삭제용) |

**응답**:
```json
{
  "url": "https://.../lms-assets/sprites/user123/abc-123.png",
  "filename": "abc-123.png"
}
```

**예시 (cURL)**:
```bash
curl -X POST "http://127.0.0.1:8000/create-sprite" \
  -F "user_id=user123" \
  -F "nickname=my_character" \
  -F "file=@/path/to/image.jpg"
```

---

### 3. 스프라이트 목록 조회

```http
GET /sprite-list/{user_id}
```

**파라미터**:
| 이름 | 타입 | 설명 |
|------|------|------|
| `user_id` | string | 조회할 사용자 ID |

**응답**:
```json
{
  "sprites": [
    {
      "name": "abc-123.png",
      "url": "https://.../lms-assets/sprites/user123/abc-123.png",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 4. 스프라이트 삭제

```http
DELETE /delete-sprite
Content-Type: application/x-www-form-urlencoded
```

**파라미터**:
| 이름 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `file_url` | string | ✅ | 삭제할 파일의 공개 URL |

**응답**:
```json
{
  "success": true,
  "message": "삭제 완료"
}
```

---

## 🗂️ 프로젝트 구조

```
zepimg_111/
├── api_server.py           # FastAPI 메인 서버
├── sprite_maker.py         # Gemini AI 스프라이트 생성 로직
├── requirements.txt        # Python 패키지 의존성
├── .env.example            # 환경 변수 예시
├── .env                    # 환경 변수 (gitignore)
├── .gitignore              # Git 제외 파일
├── README.md               # 이 문서
├── template.png            # 스프라이트 레이아웃 템플릿
├── default_sprites/        # 기본 스프라이트 이미지
│   ├── default1.png
│   └── default2.png
├── temp_uploads/           # 임시 업로드 파일 (자동 생성)
└── outputs/                # 로컬 출력 파일 (자동 생성)
```

---

## 📦 Supabase Storage 구조

```
lms-assets/
├── audio/                  # TTS 오디오 파일
└── sprites/                # 스프라이트 이미지
    ├── {user_id_1}/
    │   ├── sprite1.png
    │   └── sprite2.png
    └── {user_id_2}/
        └── sprite1.png
```

---

## 🔧 개발 가이드

### 로컬 테스트

```bash
# 서버 실행
python api_server.py

# 다른 터미널에서 테스트
curl http://127.0.0.1:8000
```

### 디버깅

서버 로그에서 다음 정보를 확인할 수 있습니다:
- 📂 파일 업로드/저장 상태
- 🤖 AI 이미지 생성 진행 상황
- 📤 Supabase 업로드 성공/실패
- 🗑️ 파일 삭제 로그

### 문제 해결

**1. "API 키가 없습니다" 에러**
- `.env` 파일에 `GOOGLE_API_KEY`가 설정되었는지 확인
- API 키가 유효한지 확인

**2. "Supabase 업로드 실패" 에러**
- `.env` 파일에 Supabase 설정이 올바른지 확인
- Service Role Key를 사용하는지 확인 (Anon Key X)
- Supabase Storage에 `lms-assets` 버킷이 생성되었는지 확인

**3. "이미지 처리 실패" 에러**
- 업로드한 이미지가 유효한 형식인지 확인 (JPG, PNG 등)
- 파일 크기가 너무 크지 않은지 확인

---

## 🌐 배포

### 프로덕션 배포 예시

```bash
# Uvicorn으로 배포 (포트 8000)
uvicorn api_server:app --host 0.0.0.0 --port 8000

# 또는 Gunicorn + Uvicorn Workers
gunicorn api_server:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker 배포 (선택)

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t sprite-maker-api .
docker run -p 8000:8000 --env-file .env sprite-maker-api
```

---

## 📝 라이선스

이 프로젝트는 Speak King Korean LMS의 일부입니다.

---

## 🤝 기여

이슈나 개선 사항이 있으면 프로젝트 저장소에 보고해주세요.

---

## 📮 문의

문제가 발생하면 프로젝트 메인테이너에게 문의하세요.
