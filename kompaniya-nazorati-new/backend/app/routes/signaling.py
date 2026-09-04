from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_token
from app.database import SessionLocal
from app.models import Company, Employee, User

router = APIRouter(tags=["signaling"])
rooms: dict[str, set[WebSocket]] = defaultdict(set)


def can_access_company(company_id: str, user: User, db) -> bool:
    company = db.query(Company).filter(Company.id == company_id, Company.is_active == True).first()
    if company is None or company.owner_id == user.id:
        return company is not None and company.owner_id == user.id
    return db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.user_id == user.id,
        Employee.status != "fired",
    ).first() is not None


@router.websocket("/ws/signaling/{company_id}")
async def signaling_socket(websocket: WebSocket, company_id: str, token: str):
    db = SessionLocal()
    try:
        payload = decode_token(token)
        if payload.get("type") == "refresh" or not payload.get("sub"):
            await websocket.close(code=1008, reason="Access token required")
            return
        user = db.query(User).filter(User.username.ilike(payload["sub"]), User.is_active == True).first()
        if user is None or not can_access_company(company_id, user, db):
            await websocket.close(code=1008, reason="Company access denied")
            return

        await websocket.accept()
        rooms[company_id].add(websocket)
        while True:
            message = await websocket.receive_json()
            for peer in tuple(rooms[company_id]):
                if peer is not websocket:
                    await peer.send_json(message)
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close(code=1011, reason="Signaling error")
    finally:
        rooms[company_id].discard(websocket)
        if not rooms[company_id]:
            rooms.pop(company_id, None)
        db.close()