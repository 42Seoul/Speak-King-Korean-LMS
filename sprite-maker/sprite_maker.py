
# sprite_maker.py
import os
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import io

# 1. .env 파일 로드
load_dotenv()

# 2. 환경 변수에서 키 꺼내오기
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("API 키가 없습니다! .env 파일을 확인해주세요.")

genai.configure(api_key=api_key)

# 모델 설정
model = genai.GenerativeModel('gemini-3-pro-image-preview') # Standard stable model

# 현재 스크립트의 절대 경로를 구함
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 생성된 파일을 저장할 디렉토리
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def make_my_character(user_image_path, nickname):
    print(f"🔄 처리 시작: {user_image_path}")

    # 1. 뼈대 이미지 (미리 준비해둔 것) - 절대 경로 사용
    template_path = os.path.join(BASE_DIR, "template.png")
    
    if not os.path.exists(template_path):
        return None, f"오류: 뼈대 이미지(template.png)가 없습니다! 경로: {template_path}"
    if not os.path.exists(user_image_path):
        return None, "오류: 유저 이미지를 찾을 수 없습니다!"

    # 2. 이미지 로드
    img_template = Image.open(template_path)
    img_user = Image.open(user_image_path)

    # 3. 프롬프트
    prompt = """
    Act as a professional Pixel Art Animator.
    Generate a high-quality pixel art sprite sheet image (336x384px) with a pure green background (#00FF00).
    
    Structure:
    - The output MUST be an IMAGE, not text.
    - Use the first image as a layout reference (poses, grid structure).
    - Use the second image as a character reference (colors, appearance).
    - Copy the poses from image 1 exactly.
    - Replace the character in image 1 with the character from image 2.
    - Do not include any objects or items held by the character in the first image.
    """

    print("🤖 AI가 그림을 그리는 중... (기다려주세요)")
    
    # 안전 설정 (필터 완화)
    safety_settings = [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_NONE"
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_NONE"
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_NONE"
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_NONE"
        },
    ]

    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"🔄 시도 {attempt + 1}/{max_retries}...")
            response = model.generate_content(
                [prompt, img_template, img_user],
                safety_settings=safety_settings
            )
            
            # 모델 응답 디버깅을 위한 출력
            print(f"🔍 모델 응답 객체 타입: {type(response)}")
            
            # 1. 텍스트 파트 확인 (디버깅용)
            text_response = ""
            try:
                if hasattr(response, 'text'):
                    text_response = response.text
                elif hasattr(response, 'parts'):
                    for part in response.parts:
                        if hasattr(part, 'text'):
                            text_response += part.text
                
                if text_response:
                    print(f"⚠️ 모델 응답 (텍스트): {text_response}")
            except Exception as e:
                print(f"⚠️ 텍스트 추출 중 경미한 에러 (무시됨): {e}")

            # 2. 이미지 데이터 추출 시도
            generated_image_data = None
            if hasattr(response, 'parts'):
                for part in response.parts:
                    if hasattr(part, 'inline_data') and part.inline_data.data:
                        generated_image_data = part.inline_data.data
                        break
            
            if generated_image_data:
                original_img = Image.open(io.BytesIO(generated_image_data))
                print("✅ AI 이미지 생성 완료!")

                print("✨ 초록색 배경을 투명하게 만드는 중...")
                img_rgba = original_img.convert("RGBA")
                datas = img_rgba.getdata()
                new_datas = []
                for item in datas:
                    r, g, b, a = item
                    if g > 100 and g > r * 1.3 and g > b * 1.3:
                        new_datas.append((0, 0, 0, 0))
                    else:
                        new_datas.append(item)
                img_rgba.putdata(new_datas)
                print("✅ 초록색 배경 제거 완료!")

                print("📐 전체 이미지 크기 조절 시작 (336x384px)...")
                resized_img = img_rgba.resize((336, 384), Image.Resampling.LANCZOS)
                print("✅ 이미지 크기 조절 완료!")

                # --- 로컬에 파일로 저장 ---
                output_filename = f"{nickname}.png"
                output_path = os.path.join(OUTPUT_DIR, output_filename)
                
                resized_img.save(output_path, 'PNG')
                print(f"✅ 파일 저장 완료! 경로: {output_path}")
                
                return output_path, None 

            else:
                print(f"⚠️ 시도 {attempt + 1}: 이미지가 생성되지 않음. 다시 시도합니다.")
                if attempt == max_retries - 1:
                     error_msg = f"AI가 이미지를 생성하지 못했습니다 (3회 시도 실패). 응답 텍스트: {text_response[:200]}..."
                     print(f"❌ {error_msg}")
                     return None, error_msg

        except Exception as img_err:
            print(f"❌ 시도 {attempt + 1} 중 에러: {img_err}")
            if attempt == max_retries - 1:
                return None, f"이미지 처리 중 에러 발생: {img_err}"
    
    return None, "알 수 없는 이유로 실패"

# --- 테스트 실행 영역 ---
if __name__ == "__main__":
    nickname = input("저장할 파일의 닉네임을 영어로 입력해주세요: ")
    local_path = make_my_character("test_photo.jpg", nickname)
    if local_path:
        print(f"✅ 스프라이트 생성 완료! 파일 위치: {local_path}")
    else:
        print("❌ 스프라이트 생성 실패.")
