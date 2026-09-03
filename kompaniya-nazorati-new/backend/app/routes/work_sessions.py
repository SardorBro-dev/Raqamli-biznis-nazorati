from datetime import datetime
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkSession, Employee, User
from app.routes.users import get_current_user

router = APIRouter(prefix="/work-sessions", tags=["work-sessions"])


class WorkSessionRequest(BaseModel):
    employee_id: str


@router.post("/start")
def start_work(payload: WorkSessionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee_id = payload.employee_id
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
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
    
    return {"employee_id": employee_id, "status": "working"}


@router.post("/break")
def break_work(payload: WorkSessionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee_id = payload.employee_id
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own break state.")

    session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee.id,
        WorkSession.status == "working",
    ).order_by(WorkSession.start_time.desc()).first()
    
    if session is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Faol ish sessiyasi topilmadi.")

    session.status = "on_break"
    session.break_start_time = datetime.utcnow()
    db.commit()
    
    return {"employee_id": employee_id, "status": "on_break"}


@router.post("/resume")
def resume_work(payload: WorkSessionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee_id = payload.employee_id
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only resume your own shift.")

    session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee.id,
        WorkSession.status == "on_break",
    ).order_by(WorkSession.start_time.desc()).first()
    
    if session is None or not session.break_start_time:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Faol tanaffus topilmadi.")

    session.status = "working"
    session.break_end_time = datetime.utcnow()
    break_duration = (session.break_end_time - session.break_start_time).total_seconds() // 60
    session.total_break_minutes += int(break_duration)
    db.commit()
    
    return {"employee_id": employee_id, "status": "working"}


@router.post("/end")
def end_work(payload: WorkSessionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee_id = payload.employee_id
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    if current_user.id != employee.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only end your own shift.")

    session = db.query(WorkSession).filter(
        WorkSession.employee_id == employee.id,
        WorkSession.status.in_(["working", "on_break"]),
    ).order_by(WorkSession.start_time.desc()).first()
    
    if session is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Faol ish sessiyasi topilmadi.")

    session.status = "completed"
    session.end_time = datetime.utcnow()
    work_duration = (session.end_time - session.start_time).total_seconds() // 60 - session.total_break_minutes
    session.total_work_minutes = max(0, int(work_duration))
    db.commit()

    employee.is_online = False
    employee.last_activity = datetime.utcnow()
    db.commit()
    
    return {"employee_id": employee_id, "status": "not_working"}
