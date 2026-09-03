import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.routes.users import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

AI_SYSTEM_INSTRUCTION = (
    "Siz Kompany AI nomli biznes maslahatchisiz. "
    "Asosiy vazifangiz kompaniyani rivojlantirish bo'yicha amaliy, aniq va tushunarli javoblar berish: "
    "strategiya, savdo, marketing, mijozlar, xodimlar, moliya, jarayonlar va samaradorlik. "
    "Javoblarni o'zbek tilida bering, kerak bo'lsa qisqa qadamlar va misollar keltiring. "
    "Mavzu kompaniya rivojiga aloqador bo'lmasa, uni muloyimlik bilan biznes yo'nalishiga qaytaring."
)


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)


@router.post("/generate")
async def generate_text(payload: GenerateRequest, _current_user=Depends(get_current_user)):
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API kaliti sozlanmagan.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
    request_body = {
        "systemInstruction": {"parts": [{"text": AI_SYSTEM_INSTRUCTION}]},
        "contents": [{"parts": [{"text": payload.prompt}]}],
    }

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                url,
                params={"key": settings.gemini_api_key},
                json=request_body,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Gemini xizmatiga ulanib bo'lmadi.") from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Gemini so'rovni qabul qilmadi.")

    data = response.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Gemini javobi noto'g'ri formatda.") from exc

    return {"text": text}