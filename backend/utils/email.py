import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from core.config import settings


def send_verification_email(to_email: str, code: str) -> None:
    html = f"""
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 0;">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
        <!-- 헤더 -->
        <tr>
          <td style="background:#C49A30;padding:24px;text-align:center;">
            <span style="font-size:26px;font-weight:900;color:#0f0f0f;letter-spacing:1px;">SelfERP</span>
          </td>
        </tr>
        <!-- 본문 -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="color:#e0e0e0;font-size:16px;margin:0 0 8px;">이메일 인증 코드</p>
            <p style="color:#888;font-size:14px;margin:0 0 32px;">아래 6자리 코드를 입력해 이메일을 인증하세요.</p>
            <!-- 코드 박스 -->
            <div style="background:#111;border:2px solid #C49A30;border-radius:12px;padding:28px;text-align:center;letter-spacing:12px;">
              <span style="font-size:38px;font-weight:900;color:#C49A30;">{code}</span>
            </div>
            <p style="color:#666;font-size:13px;margin:20px 0 0;text-align:center;">
              이 코드는 <strong style="color:#e0e0e0;">10분간</strong> 유효합니다.
            </p>
          </td>
        </tr>
        <!-- 푸터 -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a2a;">
            <p style="color:#555;font-size:12px;margin:0;text-align:center;">
              본인이 요청하지 않은 경우 이 메일을 무시하세요.<br>
              문의: <a href="mailto:sys8815701@gmail.com" style="color:#C49A30;">sys8815701@gmail.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "[SelfERP] 이메일 인증 코드"
    msg["From"]    = settings.GMAIL_USER
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        smtp.sendmail(settings.GMAIL_USER, to_email, msg.as_string())
