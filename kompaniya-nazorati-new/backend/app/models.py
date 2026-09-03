from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, ForeignKey, Enum as SQLEnum, DECIMAL, Text
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class RoleEnum(str, enum.Enum):
    SYSTEM_ADMIN = "system_admin"
    COMPANY_OWNER = "company_owner"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String(50), primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    monthly_price = Column(DECIMAL(10, 2), nullable=False, default=0)
    company_limit = Column(Integer, nullable=False, default=1)
    employee_limit = Column(Integer, nullable=False, default=50)
    features = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    subscriptions = relationship("Subscription", back_populates="plan")


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(13), nullable=True, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    profile_image = Column(Text, nullable=True)
    role = Column(SQLEnum(RoleEnum), nullable=False, default=RoleEnum.COMPANY_OWNER)
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    companies = relationship("Company", back_populates="owner", foreign_keys="Company.owner_id")
    subscriptions = relationship("Subscription", back_populates="user")
    employees = relationship("Employee", back_populates="user", foreign_keys="Employee.user_id")


class TelegramPhoneLink(Base):
    __tablename__ = "telegram_phone_links"

    phone = Column(String(13), primary_key=True)
    chat_id = Column(String(50), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Company(Base):
    __tablename__ = "companies"

    id = Column(String(50), primary_key=True)
    owner_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=True)
    owner_name = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    working_days = Column(String(255), nullable=True)  # JSON stored as string
    work_start_time = Column(String(10), nullable=True)
    work_end_time = Column(String(10), nullable=True)
    default_break_time = Column(Integer, nullable=True, default=30)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="companies", foreign_keys=[owner_id])
    subscriptions = relationship("Subscription", back_populates="company")
    employees = relationship("Employee", back_populates="company")
    work_sessions = relationship("WorkSession", back_populates="company")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, unique=True)
    plan_id = Column(String(50), ForeignKey("subscription_plans.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    purchased_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="subscriptions")
    company = relationship("Company", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, unique=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    position = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    work_schedule = Column(String(100), nullable=True)
    work_start_time = Column(String(10), nullable=True)
    work_end_time = Column(String(10), nullable=True)
    break_start = Column(String(10), nullable=True)
    break_end = Column(String(10), nullable=True)
    status = Column(String(50), nullable=False, default="active")  # active, fired, on_leave
    is_online = Column(Boolean, nullable=False, default=False)
    idle_time = Column(Integer, nullable=False, default=0)
    camera_enabled = Column(Boolean, nullable=False, default=False)
    total_work_time = Column(Integer, nullable=False, default=0)
    today_work_time = Column(Integer, nullable=False, default=0)
    current_task = Column(String(255), nullable=True)
    last_activity = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="employees", foreign_keys=[user_id])
    company = relationship("Company", back_populates="employees")
    work_sessions = relationship("WorkSession", back_populates="employee")


class WorkSession(Base):
    __tablename__ = "work_sessions"

    id = Column(String(50), primary_key=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False)
    status = Column(String(50), nullable=False, default="not_working")  # not_working, working, on_break, completed
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    total_work_minutes = Column(Integer, nullable=False, default=0)
    break_start_time = Column(DateTime, nullable=True)
    break_end_time = Column(DateTime, nullable=True)
    total_break_minutes = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    employee = relationship("Employee", back_populates="work_sessions")
    company = relationship("Company", back_populates="work_sessions")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(50), primary_key=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    sender_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class News(Base):
    __tablename__ = "news"

    id = Column(String(50), primary_key=True)
    company_id = Column(String(50), ForeignKey("companies.id"), nullable=False, index=True)
    author_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    title = Column(String(160), nullable=False)
    description = Column(Text, nullable=False)
    image = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
