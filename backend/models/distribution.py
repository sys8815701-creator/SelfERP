from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum, Numeric, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Vehicle(Base):
    """배송 차량"""
    __tablename__ = "vehicles"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    plate_no        = Column(String(20), nullable=False)    # 차량번호
    vehicle_type    = Column(String(50))                    # 트럭/승합/기타
    driver_name     = Column(String(100))
    driver_phone    = Column(String(20))
    max_weight      = Column(Numeric(10, 2))               # 최대 적재량(kg)
    note            = Column(Text)
    is_active       = Column(Integer, default=1)
    created_at      = Column(DateTime, default=datetime.utcnow)

    business    = relationship("Business", back_populates="vehicles")
    deliveries  = relationship("Delivery", back_populates="vehicle")


class SalesOrder(Base):
    """수주 (판매 주문)"""
    __tablename__ = "sales_orders"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    vendor_id       = Column(Integer, ForeignKey("vendors.id"), nullable=True)   # 고객사
    order_no        = Column(String(50))
    order_date      = Column(Date)
    due_date        = Column(Date)                          # 납기일
    status          = Column(Enum("접수", "생산중", "출하대기", "배송중", "완료", "취소"), default="접수")
    total_amount    = Column(Numeric(15, 2), default=0)
    note            = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business    = relationship("Business", back_populates="sales_orders")
    vendor      = relationship("Vendor", foreign_keys=[vendor_id])
    items       = relationship("SalesOrderItem", back_populates="order", cascade="all, delete-orphan")
    deliveries  = relationship("Delivery", back_populates="sales_order")


class SalesOrderItem(Base):
    """수주 품목 라인"""
    __tablename__ = "sales_order_items"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    order_id    = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    item_id     = Column(Integer, ForeignKey("items.id"), nullable=True)
    item_name   = Column(String(200))                       # item_id 없을 때 직접 입력
    quantity    = Column(Numeric(15, 3), nullable=False)
    unit_price  = Column(Numeric(15, 2), default=0)
    amount      = Column(Numeric(15, 2), default=0)         # quantity × unit_price
    note        = Column(String(200))

    order = relationship("SalesOrder", back_populates="items")
    item  = relationship("Item", foreign_keys=[item_id])


class Delivery(Base):
    """배송 지시"""
    __tablename__ = "deliveries"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    sales_order_id  = Column(Integer, ForeignKey("sales_orders.id"), nullable=True)
    vehicle_id      = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    delivery_no     = Column(String(50))
    scheduled_date  = Column(Date)
    completed_date  = Column(Date)
    destination     = Column(String(300))                   # 배송지
    recipient       = Column(String(100))                   # 수령인
    recipient_phone = Column(String(20))
    status          = Column(Enum("대기", "배송중", "완료", "실패", "취소"), default="대기")
    delivery_fee    = Column(Numeric(15, 2), default=0)
    note            = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business     = relationship("Business", back_populates="deliveries")
    vehicle      = relationship("Vehicle", back_populates="deliveries")
    sales_order  = relationship("SalesOrder", back_populates="deliveries")
    returns      = relationship("DeliveryReturn", back_populates="delivery")


class DeliveryReturn(Base):
    """반품"""
    __tablename__ = "delivery_returns"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    business_id     = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    delivery_id     = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    item_id         = Column(Integer, ForeignKey("items.id"), nullable=True)
    item_name       = Column(String(200))
    return_qty      = Column(Numeric(15, 3), nullable=False)
    reason          = Column(Enum("품질불량", "오배송", "주문취소", "파손", "기타"), default="기타")
    return_date     = Column(Date, nullable=False)
    note            = Column(Text)
    is_restocked    = Column(Integer, default=0)             # 재고 복원 여부
    created_at      = Column(DateTime, default=datetime.utcnow)

    business  = relationship("Business", back_populates="delivery_returns")
    delivery  = relationship("Delivery", back_populates="returns")
    item      = relationship("Item", foreign_keys=[item_id])
