import os
import uuid
import uvicorn
import shutil
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 내부 모듈 임포트
from sprite_maker import make_my_character

# FastAPI 앱 생성
app = FastAPI()

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_header(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Supabase 클라이언트 초기화
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️ WARNING: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다!")
    print("   .env 파일을 확인해주세요.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 설정
BUCKET_NAME = "lms-assets"
SPRITE_FOLDER = "sprites"

# 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============== Supabase Storage 헬퍼 함수 ==============

def upload_to_supabase(local_file_path: str, user_id: str, filename: str) -> str:
    """
    Supabase Storage에 파일 업로드
    경로: sprites/{user_id}/{filename}

    Args:
        local_file_path: 로컬 파일 경로
        user_id: 사용자 ID
        filename: 저장할 파일명

    Returns:
        공개 URL
    """
    try:
        file_path = f"{SPRITE_FOLDER}/{user_id}/{filename}"

        with open(local_file_path, 'rb') as f:
            file_data = f.read()

        print(f"📤 Supabase 업로드 시작: {file_path}")

        # 업로드 (upsert=true로 덮어쓰기 허용)
        response = supabase.storage.from_(BUCKET_NAME).upload(
            file_path,
            file_data,
            file_options={"content-type": "image/png", "upsert": "true"}
        )

        # 에러 체크
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Upload error: {response.error}")

        # 공개 URL 가져오기
        public_url_response = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)

        print(f"✅ Supabase 업로드 완료: {file_path}")
        return public_url_response

    except Exception as e:
        print(f"❌ Supabase 업로드 실패: {e}")
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")


def delete_from_supabase(file_url: str):
    """
    Supabase Storage에서 파일 삭제

    Args:
        file_url: 삭제할 파일의 공개 URL
    """
    try:
        # URL에서 파일 경로 추출
        # 예: https://.../storage/v1/object/public/lms-assets/sprites/user123/file.png
        if BUCKET_NAME not in file_url:
            print("ℹ️ Supabase Storage URL이 아님. 삭제 건너뜀.")
            return

        # URL 파싱하여 경로 추출
        parts = file_url.split(f"/{BUCKET_NAME}/")
        if len(parts) < 2:
            print(f"⚠️ URL 파싱 실패: {file_url}")
            return

        file_path = parts[-1]

        print(f"🗑️ 파일 삭제 시도: {file_path}")

        response = supabase.storage.from_(BUCKET_NAME).remove([file_path])

        # 에러 체크
        if hasattr(response, 'error') and response.error:
            print(f"⚠️ 삭제 중 에러: {response.error}")
        else:
            print(f"✅ 파일 삭제 완료: {file_path}")

    except Exception as e:
        print(f"⚠️ 삭제 중 에러 (무시됨): {e}")


# ============== API 엔드포인트 ==============

@app.get("/")
def read_root():
    return {
        "message": "Sprite Maker API Server",
        "version": "2.0",
        "storage": "Supabase Storage",
        "ai": "Google Gemini"
    }


@app.post("/create-sprite")
def create_sprite_endpoint(
    user_id: str = Form(...),
    nickname: str = Form(...),
    file: UploadFile = File(...),
    old_sprite_url: str = Form(None)
):
    """
    스프라이트 생성 엔드포인트

    Args:
        user_id: 사용자 ID
        nickname: 닉네임 (파일명에 사용)
        file: 업로드된 사용자 이미지
        old_sprite_url: 기존 스프라이트 URL (있으면 삭제)

    Returns:
        생성된 스프라이트의 공개 URL과 파일명
    """
    temp_file_path = None
    try:
        # 1. 임시 파일 저장
        ext = os.path.splitext(file.filename)[1]
        temp_filename = f"{uuid.uuid4()}{ext}"
        temp_file_path = os.path.join(TEMP_DIR, temp_filename)

        file.file.seek(0)

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 파일 크기 확인
        file_size = os.path.getsize(temp_file_path)
        print(f"📂 임시 파일 저장 완료: {file_size} bytes")

        if file_size == 0:
            raise HTTPException(status_code=400, detail="업로드된 파일이 비어있습니다.")

        # 2. 이미지 표준화 (JPEG로 변환)
        try:
            from PIL import Image
            standard_temp_path = temp_file_path + ".standard.jpg"

            with Image.open(temp_file_path) as img:
                rgb_img = img.convert("RGB")
                rgb_img.save(standard_temp_path, "JPEG")

            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            temp_file_path = standard_temp_path
            print(f"✅ 이미지 표준화 완료 (JPEG)")

        except Exception as e:
            print(f"❌ 이미지 변환 실패: {e}")
            raise HTTPException(status_code=400, detail=f"이미지 처리 실패: {str(e)}")

        # 3. Gemini로 스프라이트 생성
        safe_filename = str(uuid.uuid4())
        output_image_path, error_msg = make_my_character(temp_file_path, safe_filename)

        if output_image_path and os.path.exists(output_image_path):
            # 4. Supabase Storage에 업로드
            public_url = upload_to_supabase(
                output_image_path,
                user_id,
                f"{safe_filename}.png"
            )

            # 5. 기존 스프라이트 삭제 (있다면)
            if old_sprite_url:
                print(f"🧹 기존 스프라이트 삭제: {old_sprite_url}")
                delete_from_supabase(old_sprite_url)

            # 6. 로컬 임시 파일 삭제
            if os.path.exists(output_image_path):
                os.remove(output_image_path)

            return JSONResponse(content={
                "url": public_url,
                "filename": f"{safe_filename}.png"
            })
        else:
            raise HTTPException(status_code=500, detail=error_msg or "스프라이트 생성 실패")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # 임시 파일 정리
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.get("/sprite-list/{user_id}")
def list_sprites(user_id: str):
    """
    특정 사용자의 스프라이트 목록 조회

    Args:
        user_id: 사용자 ID

    Returns:
        스프라이트 파일 목록 (이름, URL, 생성일시)
    """
    try:
        folder_path = f"{SPRITE_FOLDER}/{user_id}"

        print(f"📂 스프라이트 목록 조회: {folder_path}")

        response = supabase.storage.from_(BUCKET_NAME).list(folder_path)

        # 응답 처리
        if isinstance(response, list):
            files = response
        elif hasattr(response, 'data'):
            files = response.data
        else:
            files = []

        sprites = []
        for file_info in files:
            if isinstance(file_info, dict) and file_info.get('name'):
                file_path = f"{folder_path}/{file_info['name']}"
                public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)

                sprites.append({
                    "name": file_info['name'],
                    "url": public_url,
                    "created_at": file_info.get('created_at')
                })

        print(f"✅ {len(sprites)}개 스프라이트 발견")
        return JSONResponse(content={"sprites": sprites})

    except Exception as e:
        print(f"❌ 목록 조회 실패: {e}")
        return JSONResponse(content={"sprites": []})


@app.delete("/delete-sprite")
def delete_sprite_endpoint(file_url: str = Form(...)):
    """
    스프라이트 삭제

    Args:
        file_url: 삭제할 파일의 공개 URL

    Returns:
        성공 여부
    """
    try:
        delete_from_supabase(file_url)
        return JSONResponse(content={"success": True, "message": "삭제 완료"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Sprite Maker API Server 시작")
    print("=" * 60)
    print(f"📦 Storage: Supabase Storage (bucket: {BUCKET_NAME})")
    print(f"🤖 AI: Google Gemini")
    print(f"🌐 주소: http://127.0.0.1:8000")
    print(f"📚 API 문서: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000)
