from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password, start_session
from app.core.telegram import notify_channel_event
from app.database import get_db
from app.models import User, Company, Employee, Subscription, WorkSession, RoleEnum
from app.routes.users import get_current_user

router = APIRouter(prefix="/employees", tags=["employees"])


class EmployeeCreateRequest(BaseModel):
    company_id: str | None = None
    first_name: str = Field(..., min_length=2, max_length=80)
    last_name: str = Field(..., min_length=2, max_length=80)
    position: str = Field(..., min_length=2, max_length=80)
    department: str = Field(..., min_length=2, max_length=80)
    status: str = Field(default="active", pattern="^(active|on_leave)$")
    username: str = Field(..., min_length=3, max_length=40)
    temporary_password: str | None = Field(default="TempPass123!", min_length=8)
    work_schedule: str | None = Field(default="09:00-18:00", min_length=2, max_length=80)
    work_type: str = Field(default="computer", pattern="^(computer|physical)$")


class EmployeeUpdateRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=80)
    last_name: str | None = Field(default=None, min_length=2, max_length=80)
    username: str | None = Field(default=None, min_length=3, max_length=40)
    temporary_password: str | None = Field(default=None, min_length=8)
    position: str | None = Field(default=None, min_length=2, max_length=80)
    department: str | None = Field(default=None, min_length=2, max_length=80)
    status: str | None = Field(default=None, pattern="^(active|on_leave)$")
    work_schedule: str | None = Field(default=None, min_length=2, max_length=80)
    is_online: bool | None = None
    work_type: str | None = Field(default=None, pattern="^(computer|physical)$")


class EmployeeResponse(BaseModel):
    id: str
    user_id: str
    company_id: str
    first_name: str
    last_name: str
    position: str
    department: str
    username: str
    status: str = "not_working"
    work_schedule: str
    work_type: str = "computer"


class WorkSessionStatusResponse(BaseModel):
    employee_id: str
    status: str
    worked_minutes: int = 0
    break_minutes: int = 0


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {RoleEnum.COMPANY_OWNER, RoleEnum.MANAGER}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners or managers can create employees.",
        )

    company_id = payload.company_id
    if not company_id:
        company = db.query(Company).filter(
            Company.owner_id == current_user.id,
            Company.is_active == True,
        ).order_by(Company.created_at.desc()).first()
        if company is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
        company_id = company.id
    else:
        company = db.query(Company).filter(Company.id == company_id).first()
        if company is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

    if company.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't manage this company.")

    subscription = db.query(Subscription).filter(
        Subscription.company_id == company.id,
        Subscription.is_active == True,
    ).first()
    employee_limit = subscription.plan.employee_limit if subscription and subscription.plan else 5
    active_employee_count = db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.status != "fired",
    ).count()
    if active_employee_count >= employee_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Employee limit reached: {employee_limit}.",
        )

    existing_user = db.query(User).filter(User.username.ilike(payload.username)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee username already exists.")

    employee_id = f"emp_{uuid4().hex}"
    user_id = f"user_{uuid4().hex}_emp"
    temporary_password = payload.temporary_password or "TempPass123!"
    password_hash = hash_password(temporary_password)
    
    employee_user = User(
        id=user_id,
        username=payload.username,
        email=f"{payload.username}@company.example",
        password_hash=password_hash,
        role=RoleEnum.EMPLOYEE,
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_active=True,
        is_verified=False,
    )
    db.add(employee_user)
    db.commit()
    
    employee = Employee(
        id=employee_id,
        user_id=user_id,
        company_id=company_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        position=payload.position,
        department=payload.department,
        work_schedule=payload.work_schedule or "09:00-18:00",
        work_type=payload.work_type,
        status=payload.status,
        is_online=False,
        idle_time=0,
        camera_enabled=False,
        total_work_time=0,
        today_work_time=0,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    await notify_channel_event(
        "Yangi xodim qo'shildi",
        f"Kompaniya: {company.name}\n"
        f"Xodim: {employee.first_name} {employee.last_name}\n"
        f"Username: {employee_user.username}\n"
        f"Lavozim: {employee.position}\n"
        f"Qo'shgan foydalanuvchi: {current_user.username}",
    )

    return EmployeeResponse(
        id=employee.id,
        user_id=employee.user_id,
        company_id=employee.company_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        position=employee.position,
        department=employee.department,
        username=payload.username,
        status="not_working",
        work_schedule=employee.work_schedule,
        work_type=employee.work_type or "computer",
    )


@router.get("", response_model=list[EmployeeResponse])
def list_employees(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    if company.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't view this company.")

    employees = db.query(Employee).filter(Employee.company_id == company_id).all()
    return [
        EmployeeResponse(
            id=employee.id,
            user_id=employee.user_id,
            company_id=employee.company_id,
            first_name=employee.first_name,
            last_name=employee.last_name,
            position=employee.position or "Xodim",
            department=employee.department or "Umumiy",
            username=employee.user.username,
            status="fired" if employee.status == "fired" else ("not_working" if not employee.is_online else employee.status),
            work_schedule=employee.work_schedule or "09:00-18:00",
            work_type=employee.work_type or "computer",
        )
        for employee in employees
    ]


@router.get("/me", response_model=EmployeeResponse)
def get_my_employee_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee profile not found.")

    return EmployeeResponse(
        id=employee.id,
        user_id=employee.user_id,
        company_id=employee.company_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        position=employee.position or "Xodim",
        department=employee.department or "Umumiy",
        username=current_user.username,
        status="fired" if employee.status == "fired" else ("not_working" if not employee.is_online else employee.status),
        work_schedule=employee.work_schedule or "09:00-18:00",
        work_type=employee.work_type or "computer",
    )


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    payload: EmployeeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if employee.company.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't manage this employee.")

    employee_user = employee.user
    if payload.username and payload.username.lower() != employee_user.username.lower():
        username_exists = db.query(User).filter(User.username.ilike(payload.username)).first()
        if username_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee username already exists.")
        employee_user.username = payload.username
    if payload.first_name:
        employee.first_name = employee_user.first_name = payload.first_name
    if payload.last_name:
        employee.last_name = employee_user.last_name = payload.last_name
    if payload.temporary_password:
        employee_user.password_hash = hash_password(payload.temporary_password)
    for field in ("position", "department", "status", "work_schedule"):
        value = getattr(payload, field)
        if value is not None:
            setattr(employee, field, value)
    if payload.is_online is not None:
        employee.is_online = payload.is_online
    if payload.work_type is not None:
        employee.work_type = payload.work_type

    db.commit()
    db.refresh(employee)
    await notify_channel_event(
        "Xodim ma'lumotlari yangilandi",
        f"Kompaniya: {employee.company.name}\n"
        f"Xodim: {employee.first_name} {employee.last_name}\n"
        f"Username: {employee_user.username}\n"
        f"Yangilagan foydalanuvchi: {current_user.username}",
    )
    return EmployeeResponse(
        id=employee.id,
        user_id=employee.user_id,
        company_id=employee.company_id,
        first_name=employee.first_name,
        last_name=employee.last_name,
        position=employee.position or "Xodim",
        department=employee.department or "Umumiy",
        username=employee_user.username,
        status="fired" if employee.status == "fired" else ("not_working" if not employee.is_online else employee.status),
        work_schedule=employee.work_schedule or "09:00-18:00",
        work_type=employee.work_type or "computer",
    )


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def fire_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if employee.company.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't manage this employee.")

    employee.status = "fired"
    employee.is_online = False
    employee.user.is_active = False
    db.commit()
    await notify_channel_event(
        "Xodim ishdan bo'shatildi",
        f"Kompaniya: {employee.company.name}\n"
        f"Xodim: {employee.first_name} {employee.last_name}\n"
        f"Username: {employee.user.username}\n"
        f"Amalni bajargan foydalanuvchi: {current_user.username}",
    )
    return None


@router.delete("/{employee_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanently_delete_employee(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if employee.company.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't manage this employee.")
    if employee.status != "fired":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Avval xodimni ishdan bo'shating.")

    employee_name = f"{employee.first_name} {employee.last_name}"
    employee_username = employee.user.username
    company_name = employee.company.name
    db.query(WorkSession).filter(WorkSession.employee_id == employee.id).delete(synchronize_session=False)
    db.delete(employee)
    db.delete(employee.user)
    db.commit()
    await notify_channel_event(
        "Ishdan bo'shatilgan xodim butunlay o'chirildi",
        f"Kompaniya: {company_name}\n"
        f"Xodim: {employee_name}\n"
        f"Username: {employee_username}\n"
        f"O'chirgan foydalanuvchi: {current_user.username}",
    )
    return None


@router.get("/{employee_id}/status", response_model=WorkSessionStatusResponse)
def get_employee_status(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    if current_user.id != employee.company.owner_id and current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this employee.")

    session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee_id,
        WorkSession.status != "completed",
    ).order_by(WorkSession.start_time.desc()).first()
    
    worked_minutes = session.total_work_minutes if session else 0
    break_minutes = session.total_break_minutes if session else 0
    current_status = session.status if session else (
        employee.status if employee.status in {"fired", "on_leave"} else "not_working"
    )

    return WorkSessionStatusResponse(
        employee_id=employee_id,
        status=current_status,
        worked_minutes=worked_minutes,
        break_minutes=break_minutes,
    )


@router.post("/work-sessions/start")
def start_work(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == payload["employee_id"]).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only start your own shift.")

    active_session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee.id,
        WorkSession.status.in_(["working", "on_break"]),
    ).first()
    if active_session:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An active work session already exists.")

    employee.is_online = True
    employee.last_activity = datetime.utcnow()
    
    session = WorkSession(
        id=f"session_{uuid4().hex}",
        employee_id=employee.id,
        company_id=employee.company_id,
        status="working",
        start_time=datetime.utcnow(),
        total_work_minutes=0,
        total_break_minutes=0,
    )
    db.add(session)
    db.commit()

    return {"employee_id": payload["employee_id"], "status": "working"}


@router.post("/work-sessions/break")
def break_work(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == payload["employee_id"]).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own break state.")

    session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee.id,
        WorkSession.status == "working",
    ).order_by(WorkSession.start_time.desc()).first()
    
    if session:
        session.status = "on_break"
        session.break_start_time = datetime.utcnow()
        db.commit()

    return {"employee_id": payload["employee_id"], "status": "on_break"}


@router.post("/work-sessions/resume")
def resume_work(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == payload["employee_id"]).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only resume your own shift.")

    session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee.id,
        WorkSession.status == "on_break",
    ).order_by(WorkSession.start_time.desc()).first()
    
    if session and session.break_start_time:
        session.status = "working"
        session.break_end_time = datetime.utcnow()
        break_duration = (session.break_end_time - session.break_start_time).total_seconds() // 60
        session.total_break_minutes += int(break_duration)
        db.commit()

    return {"employee_id": payload["employee_id"], "status": "working"}


@router.post("/work-sessions/end")
def end_work(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(Employee.id == payload["employee_id"]).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only end your own shift.")

    session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee.id,
        WorkSession.status.in_(["working", "on_break"]),
    ).order_by(WorkSession.start_time.desc()).first()
    
    if session:
        session.status = "completed"
        session.end_time = datetime.utcnow()
        work_duration = (session.end_time - session.start_time).total_seconds() // 60 - session.total_break_minutes
        session.total_work_minutes = max(0, int(work_duration))
        db.commit()

    employee.is_online = False
    employee.last_activity = datetime.utcnow()
    db.commit()

    return {"employee_id": payload["employee_id"], "status": "not_working"}


@router.post("/login")
def employee_login(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username")
    password = payload.get("password")
    user = db.query(User).filter(User.username.ilike(username)).first()
    
    if user is None or user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid employee credentials.")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid employee credentials.")

    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee record not found.")

    session_id = start_session(user.id)
    return {
        "message": "Employee login successful.",
        "user_id": user.id,
        "username": username,
        "role": "employee",
        "access_token": create_access_token(user.id, session_id=session_id),
        "refresh_token": create_refresh_token(user.id, session_id=session_id),
    }
