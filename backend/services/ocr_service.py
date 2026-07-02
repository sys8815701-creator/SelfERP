import easyocr
import cv2
import numpy as np
from ultralytics import YOLO

# EasyOCR 리더 초기화 (한국어 + 영어)
reader = easyocr.Reader(['ko', 'en'], gpu=False)

def extract_text_from_image(image_path: str) -> str:
    """
    1. OpenCV로 이미지 로드
    2. 전처리 (그레이스케일, 이진화)
    3. EasyOCR로 텍스트 추출
    """
    # 이미지 로드
    image = cv2.imread(image_path)
    if image is None:
        return ""

    # 그레이스케일 변환
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 이진화 (텍스트 인식률 향상)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

    # EasyOCR 추출
    results = reader.readtext(binary, detail=0)

    # 텍스트 합치기
    raw_text = "\n".join(results)
    return raw_text