try:
    import easyocr
    import cv2
    import numpy as np
    _reader = easyocr.Reader(['ko', 'en'], gpu=False)
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False
    _reader = None

def extract_text_from_image(image_path: str) -> str:
    if not _OCR_AVAILABLE or _reader is None:
        return "(OCR 라이브러리가 설치되지 않은 환경입니다)"

    image = cv2.imread(image_path)
    if image is None:
        return ""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    results = _reader.readtext(binary, detail=0)
    return "\n".join(results)
