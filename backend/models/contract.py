from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Contract(Base):
    __tablename__ = "contracts"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=True)

    title           = Column(String(200), nullable=False)
    contract_type   = Column(Enum("근로계약서", "거래처계약서", "인사계약서", "기타"), default="근로계약서")
    counterparty    = Column(String(100))       # 계약 상대방 이름
    start_date      = Column(Date, nullable=True)
    end_date        = Column(Date, nullable=True)
    amount          = Column(Integer, default=0) # 계약 금액 (선택)
    file_path       = Column(String(500))        # 업로드된 파일 경로
    sign_status     = Column(Enum("작성중", "서명요청", "서명완료", "거절"), default="작성중")
    note            = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="contracts")
    employee = relationship("Employee", back_populates="contracts")
