from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.telegram import forward_company_chat_message, notify_channel_event, notify_meeting_status
from app.database import get_db
from app.models import Company, Message, News, User, RoleEnum
from app.routes.users import get_current_user

router = APIRouter(tags=["communications"])


class MessageRequest(BaseModel):
    company_id: str
    text: str = Field(..., min_length=1, max_length=4000)


class MeetingRequest(BaseModel):
    company_id: str
    started: bool = True
    meeting_url: str | None = None


class MessageResponse(BaseModel):
    id: str
    company_id: str
    sender_id: str
    sender: str
    text: str
    time: datetime


class NewsRequest(BaseModel):
    company_id: str
    title: str = Field(..., min_length=2, max_length=160)
    description: str = Field(..., min_length=2, max_length=10000)
    image: str | None = None


class NewsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    title: str
    description: str
    image: str | None
    created_at: datetime


def get_company_access(company_id: str, current_user: User, db: Session) -> Company:
    company = db.query(Company).filter(Company.id == company_id, Company.is_active == True).first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    if company.owner_id == current_user.id:
        return company
    employee = next((item for item in current_user.employees if item.company_id == company_id), None)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't access this company.")
    return company


def user_display_name(user: User) -> str:
    full_name = " ".join(part for part in (user.first_name, user.last_name) if part)
    return full_name or user.username


@router.get("/messages", response_model=list[MessageResponse])
def list_messages(company_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_access(company_id, current_user, db)
    rows = db.query(Message, User).join(User, User.id == Message.sender_id).filter(
        Message.company_id == company_id,
    ).order_by(Message.created_at.asc()).all()
    return [MessageResponse(id=row.id, company_id=row.company_id, sender_id=row.sender_id, sender=user_display_name(user), text=row.text, time=row.created_at) for row, user in rows]


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(payload: MessageRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = get_company_access(payload.company_id, current_user, db)
    message = Message(id=f"msg_{int(datetime.utcnow().timestamp() * 1000000)}", company_id=payload.company_id, sender_id=current_user.id, text=payload.text.strip())
    db.add(message)
    db.commit()
    db.refresh(message)

    await forward_company_chat_message(
        company.name,
        user_display_name(current_user),
        current_user.username,
        message.text,
    )

    return MessageResponse(id=message.id, company_id=message.company_id, sender_id=message.sender_id, sender=user_display_name(current_user), text=message.text, time=message.created_at)


@router.post("/meetings/status")
async def update_meeting_status(payload: MeetingRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = get_company_access(payload.company_id, current_user, db)
    if company.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the company owner can control meetings.")
    delivered = await notify_meeting_status(company.name, payload.started, payload.meeting_url)
    if not delivered:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram userbot ulanmagan yoki kanalga Group Video Chat yaratish huquqi yo'q.")
    return {"started": payload.started, "meeting_url": None, "delivered": True}


@router.get("/news", response_model=list[NewsResponse])
def list_news(company_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_access(company_id, current_user, db)
    return db.query(News).filter(News.company_id == company_id).order_by(News.created_at.desc()).all()


@router.post("/news", response_model=NewsResponse, status_code=status.HTTP_201_CREATED)
async def create_news(payload: NewsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    company = get_company_access(payload.company_id, current_user, db)
    if company.owner_id != current_user.id and current_user.role != RoleEnum.MANAGER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can publish news.")
    item = News(id=f"news_{int(datetime.utcnow().timestamp() * 1000000)}", company_id=payload.company_id, author_id=current_user.id, title=payload.title.strip(), description=payload.description.strip(), image=payload.image)
    db.add(item)
    db.commit()
    db.refresh(item)
    await notify_channel_event(
        "Yangi yangilik e'lon qilindi",
        f"Kompaniya: {company.name}\n"
        f"Sarlavha: {item.title}\n"
        f"Muallif: {user_display_name(current_user)}\n\n"
        f"{item.description}",
    )
    return item


@router.delete("/news/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_news(news_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(News).filter(News.id == news_id).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News not found.")
    company = get_company_access(item.company_id, current_user, db)
    if company.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete news.")
    news_title = item.title
    db.delete(item)
    db.commit()
    await notify_channel_event(
        "Yangilik o'chirildi",
        f"Kompaniya: {company.name}\n"
        f"Yangilik: {news_title}\n"
        f"O'chirgan foydalanuvchi: {user_display_name(current_user)}",
    )
    return None