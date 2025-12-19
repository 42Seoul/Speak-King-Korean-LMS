import os
import uuid
import uvicorn
import shutil
from datetime import datetime, timedelta
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google.cloud import storage

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

# 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "temp_uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
DEFAULT_SPRITES_DIR = os.path.join(BASE_DIR, "default_sprites")

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DEFAULT_SPRITES_DIR, exist_ok=True)

# Google Cloud Storage 설정
GCS_BUCKET_NAME = "zep-png"
GCS_CREDENTIALS_PATH = os.path.join(BASE_DIR, "zep-png-2398f04b792f.json")

def configure_gcs_cors():
    """
    GCS 버킷에 CORS 설정을 적용하여 브라우저 Canvas에서 이미지를 사용할 수 있게 합니다.
    """
    try:
        storage_client = storage.Client.from_service_account_json(GCS_CREDENTIALS_PATH)
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        
        # CORS 설정 정의
        cors_configuration = [
            {
                "origin": ["*"],  # 모든 도메인 허용
                "responseHeader": ["Content-Type", "x-goog-resumable"],
                "method": ["GET", "HEAD", "OPTIONS"],
                "maxAgeSeconds": 3600
            }
        ]
        
        bucket.cors = cors_configuration
        bucket.patch()
        print(f"✅ GCS 버킷('{GCS_BUCKET_NAME}') CORS 설정 완료!")
    except Exception as e:
        print(f"⚠️ GCS CORS 설정 실패: {e}")

def upload_to_gcs(local_file_path: str, destination_blob_name: str) -> str:
    """
    GCS에 파일을 업로드하고 공개 URL을 반환합니다.
    Uniform Bucket Level Access 대응을 위해 IAM 정책 수정을 시도합니다.
    """
    try:
        storage_client = storage.Client.from_service_account_json(GCS_CREDENTIALS_PATH)
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(destination_blob_name)

        # 파일 업로드
        blob.upload_from_filename(local_file_path)
        print(f"✅ GCS 파일 업로드 완료: {destination_blob_name}")

        # 버킷 전체를 공개(allUsers)로 설정 시도
        try:
            policy = bucket.get_iam_policy(requested_policy_version=3)
            has_permission = any(
                b["role"] == "roles/storage.objectViewer" and "allUsers" in b["members"]
                for b in policy.bindings
            )
            
            if not has_permission:
                print("ℹ️ 버킷 공개 권한 추가 시도...")
                policy.bindings.append({"role": "roles/storage.objectViewer", "members": {"allUsers"}})
                bucket.set_iam_policy(policy)
                print("✅ 버킷 공개 설정 성공!")
        except Exception as iam_err:
            print(f"⚠️ IAM 정책 수정 실패 (수동 설정 권장): {iam_err}")

        return f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{destination_blob_name}"
    except Exception as e:
        print(f"❌ GCS 업로드 에러: {e}")
        raise HTTPException(status_code=500, detail=f"GCS 업로드 실패: {str(e)}")

def delete_from_gcs(file_url: str):
    """
    주어진 GCS URL에서 파일명을 추출하여 해당 파일을 버킷에서 삭제합니다.
    URL 형식이 맞지 않거나 파일이 없으면 무시합니다.
    """
    try:
        # URL에서 버킷 이름 뒷부분(Blob name) 추출
        # 예: https://storage.googleapis.com/zep-png/sprites/abc.png -> sprites/abc.png
        if GCS_BUCKET_NAME not in file_url:
            print("ℹ️ 삭제 건너뜀: GCS 버킷 URL이 아님.")
            return

        blob_name = file_url.split(f"/{GCS_BUCKET_NAME}/")[-1]
        
        storage_client = storage.Client.from_service_account_json(GCS_CREDENTIALS_PATH)
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)

        if blob.exists():
            blob.delete()
            print(f"🗑️ 기존 파일 삭제 완료: {blob_name}")
        else:
            print(f"ℹ️ 삭제할 파일이 없음: {blob_name}")

    except Exception as e:
        print(f"⚠️ 기존 파일 삭제 중 오류 (무시됨): {e}")

# 정적 파일 서빙
app.mount("/sprites", StaticFiles(directory=OUTPUT_DIR), name="sprites")
app.mount("/default-sprites", StaticFiles(directory=DEFAULT_SPRITES_DIR), name="default_sprites")

@app.get("/sprite-list")
def list_sprites():
    if not os.path.exists(OUTPUT_DIR): return []
    files = [f for f in os.listdir(OUTPUT_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    files.sort(key=lambda x: os.path.getmtime(os.path.join(OUTPUT_DIR, x)), reverse=True)
    return files

@app.post("/create-sprite")
def create_sprite_endpoint(
    nickname: str = Form(...), 
    file: UploadFile = File(...), 
    old_sprite_url: str = Form(None)
):
    temp_file_path = None
    try:
        ext = os.path.splitext(file.filename)[1]
        temp_filename = f"{uuid.uuid4()}{ext}"
        temp_file_path = os.path.join(TEMP_DIR, temp_filename)

        # 파일 포인터를 처음으로 이동 (안전장치)
        file.file.seek(0)
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 파일 크기 확인 로그
        file_size = os.path.getsize(temp_file_path)
        print(f"📂 저장된 임시 파일 크기: {file_size} bytes ({temp_file_path})")

        if file_size == 0:
            raise HTTPException(status_code=400, detail="업로드된 파일이 비어있습니다.")

        # PIL로 이미지 유효성 검사 및 표준화 (JPEG로 변환)
        try:
            from PIL import Image
            standard_temp_path = temp_file_path + ".standard.jpg"
            
            with Image.open(temp_file_path) as img:
                # MPO 등 멀티 프레임 이미지일 경우 첫 번째 프레임만 사용하고 RGB로 변환
                # (MIME type 에러 방지)
                rgb_img = img.convert("RGB")
                rgb_img.save(standard_temp_path, "JPEG")
                
            # 기존 원본 임시 파일 삭제 후 표준 파일로 교체
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            temp_file_path = standard_temp_path
            print(f"✅ 이미지를 표준 JPEG로 변환 완료: {temp_file_path}")
            
        except Exception as e:
             print(f"❌ 이미지 변환 실패: {e}")
             raise HTTPException(status_code=400, detail=f"이미지를 처리할 수 없습니다 (지원하지 않는 형식): {str(e)}")


        safe_filename = str(uuid.uuid4())
        output_image_path, error_msg = make_my_character(temp_file_path, safe_filename)

        if output_image_path and os.path.exists(output_image_path):
            # 1. 새 파일 GCS 업로드 및 URL 획득
            gcs_url = upload_to_gcs(output_image_path, f"sprites/{safe_filename}.png")
            
            # 2. (성공 시) 기존 파일 삭제 시도
            if old_sprite_url:
                print(f"🧹 기존 스프라이트 정리 요청: {old_sprite_url}")
                delete_from_gcs(old_sprite_url)

            return JSONResponse(content={"url": gcs_url, "filename": f"{safe_filename}.png"})
        else:
            raise HTTPException(status_code=500, detail=error_msg or "생성 실패")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    print("🚀 서버 시작 중...")
    configure_gcs_cors() # 서버 시작 시 CORS 설정 적용
    print("FastAPI 서버를 시작합니다. 주소: http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)