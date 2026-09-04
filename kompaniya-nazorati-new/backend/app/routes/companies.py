from datetime import datetime
import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company, Subscription, SubscriptionPlan, RoleEnum
from app.core.telegram import notify_channel_event
from app.routes.users import get_current_user

router = APIRouter(prefix="/companies", tags=["companies"])

PLAN_CONFIG = {
    "trial": {
        "id": "plan_trial",
        "code": "trial",
        "name": "Trial",
        "monthly_price": 1000000,
        "company_limit": 1,
        "employee_limit": 5,
    },
    "pro": {
        "id": "plan_pro",
        "code": "pro",
        "name": "PRO",
        "monthly_price": 200000,
        "company_limit": 1,
        "employee_limit": 50,
    },
    "pro_premium": {
        "id": "plan_pro_premium",
        "code": "pro_premium",
        "name": "PRO PREMIUM",
        "monthly_price": 500000,
        "company_limit": 5,
        "employee_limit": 300,
    },
    "promaster": {
        "id": "plan_promaster",
        "code": "promaster",
        "name": "PROMASTER",
        "monthly_price": 0,
        "company_limit": 10,
        "employee_limit": 1000,
    },
}


def ensure_subscription_plans(db: Session):
    existing_codes = {plan.code for plan in db.query(SubscriptionPlan).all()}
    for config in PLAN_CONFIG.values():
        if config["code"] not in existing_codes:
            db.add(SubscriptionPlan(
                id=config["id"],
                code=config["code"],
                name=config["name"],
                monthly_price=config["monthly_price"],
                company_limit=config["company_limit"],
                employee_limit=config["employee_limit"],
                is_active=True,
            ))
    if len(existing_codes) < len(PLAN_CONFIG):
        db.commit()


class PlanResponse(BaseModel):
    id: str
    code: str
    name: str
    monthly_price: int
    company_limit: int
    employee_limit: int


class CompanyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    industry: str = Field(..., min_length=2, max_length=120)
    owner_name: str = Field(..., min_length=2, max_length=120)
    address: str = Field(..., min_length=2, max_length=200)
    working_days: list[str] = Field(..., min_length=1, max_length=7)
    work_start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    work_end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    default_break_time: int = Field(..., ge=0, le=180)
    subscription_plan: str | None = Field(default=None, pattern=r"^(trial|pro|pro_premium|promaster)$")


class PlanUpgradeRequest(BaseModel):
    plan: str = Field(..., pattern=r"^(trial|pro|pro_premium|promaster)$")


class CompanyResponse(BaseModel):
    id: str
    name: str
    industry: str
    owner_name: str
    owner_id: str
    address: str
    working_days: str
    work_start_time: str
    work_end_time: str
    default_break_time: int
    employee_count: int = 0
    subscription_plan: str = "trial"


class PublicCompanyResponse(BaseModel):
    id: str
    name: str
    industry: str
    owner_name: str
    owner_id: str
    owner_profile_image: str = ""
    company_logo: str = ""
    employee_count: int = 0


def serialize_company(company: Company, plan_code: str = "trial") -> CompanyResponse:
    return CompanyResponse(
        id=company.id,
        name=company.name,
        industry=company.industry or "",
        owner_name=company.owner_name or "",
        owner_id=company.owner_id,
        address=company.address or "",
        working_days=company.working_days or "[]",
        work_start_time=company.work_start_time or "09:00",
        work_end_time=company.work_end_time or "18:00",
        default_break_time=company.default_break_time or 0,
        employee_count=sum(1 for employee in company.employees if employee.status != "fired"),
        subscription_plan=plan_code,
    )


@router.get("/plans", response_model=list[PlanResponse])
def get_subscription_plans(db: Session = Depends(get_db)):
    plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()
    
    existing_codes = {plan.code for plan in plans}
    missing_configs = [config for key, config in PLAN_CONFIG.items() if config["code"] not in existing_codes]
    if missing_configs:
        for config in missing_configs:
            db_plan = SubscriptionPlan(
                id=config["id"],
                code=config["code"],
                name=config["name"],
                monthly_price=config["monthly_price"],
                company_limit=config["company_limit"],
                employee_limit=config["employee_limit"],
                is_active=True,
            )
            db.add(db_plan)
        db.commit()
        plans = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()
    
    return [
        PlanResponse(
            id=p.id,
            code=p.code,
            name=p.name,
            monthly_price=int(p.monthly_price),
            company_limit=p.company_limit,
            employee_limit=p.employee_limit,
        )
        for p in plans
    ]


@router.get("", response_model=list[CompanyResponse])
def get_companies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    companies = db.query(Company).filter(
        Company.owner_id == current_user.id,
        Company.is_active == True,
    ).order_by(Company.created_at.desc()).all()

    return [
        serialize_company(
            company,
            next(
                (
                    subscription.plan.code
                    for subscription in company.subscriptions
                    if subscription.is_active and subscription.plan
                ),
                "trial",
            ),
        )
        for company in companies
    ]


@router.get("/public", response_model=list[PublicCompanyResponse])
def get_public_companies(
    db: Session = Depends(get_db),
):
    companies = db.query(Company).filter(Company.is_active == True).all()
    return [
        PublicCompanyResponse(
            id=company.id,
            name=company.name,
            industry=company.industry or "",
            owner_name=(
                " ".join(filter(None, [company.owner.first_name, company.owner.last_name]))
                or company.owner_name
                or company.owner.username
                if company.owner
                else company.owner_name or "Egasi ko'rsatilmagan"
            ),
            owner_id=company.owner_id,
            owner_profile_image=(company.owner.profile_image or "") if company.owner else "",
            employee_count=sum(1 for employee in company.employees if employee.status != "fired"),
        )
        for company in companies
    ]


@router.post("/upgrade-plan")
async def upgrade_plan(
    payload: PlanUpgradeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ensure_subscription_plans(db)
    plan = db.query(SubscriptionPlan).filter(
        SubscriptionPlan.code == payload.plan,
        SubscriptionPlan.is_active == True,
    ).first()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found.")

    subscriptions = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.is_active == True,
    ).all()
    if not subscriptions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active company subscription found.")

    for subscription in subscriptions:
        subscription.plan_id = plan.id
        subscription.purchased_at = datetime.utcnow()
    db.commit()
    await notify_channel_event(
        "Kompaniya tarifi yangilandi",
        f"Foydalanuvchi: {current_user.username}\nTarif: {plan.code}",
    )
    return {"plan": plan.code, "company_limit": plan.company_limit}


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.is_active == True,
    ).first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

    if company.owner_id != current_user.id and not any(
        employee.company_id == company_id for employee in current_user.employees
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can't view this company.")

    return serialize_company(
        company,
        next(
            (
                subscription.plan.code
                for subscription in company.subscriptions
                if subscription.is_active and subscription.plan
            ),
            "trial",
        ),
    )


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != RoleEnum.COMPANY_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can delete companies.",
        )

    company = db.query(Company).filter(
        Company.id == company_id,
        Company.owner_id == current_user.id,
        Company.is_active == True,
    ).first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")

    company.is_active = False
    for employee in company.employees:
        employee.status = "fired"
        employee.is_online = False
        employee.user.is_active = False

    db.commit()
    await notify_channel_event(
        "Kompaniya o'chirildi",
        f"Kompaniya: {company.name}\nFoydalanuvchi: {current_user.username}",
    )
    return None


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    ensure_subscription_plans(db)
    if current_user.role != RoleEnum.COMPANY_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can create companies.",
        )

    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.is_active == True,
    ).order_by(Subscription.purchased_at.desc()).first()
    
    if not subscription:
        default_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == "trial").first()
        if not default_plan:
            raise HTTPException(status_code=500, detail="Default plan not found.")
        plan = default_plan
    else:
        plan = subscription.plan

    if payload.subscription_plan:
        requested_plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.code == payload.subscription_plan,
            SubscriptionPlan.is_active == True,
        ).first()
        if requested_plan:
            plan = requested_plan

    existing_companies = db.query(Company).filter(
        Company.owner_id == current_user.id,
        Company.is_active == True,
    ).count()
    
    if existing_companies >= plan.company_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Company creation limit reached for your subscription plan.",
        )

    company_id = f"company_{uuid4().hex}"
    working_days_json = json.dumps(payload.working_days)
    
    company = Company(
        id=company_id,
        owner_id=current_user.id,
        name=payload.name,
        industry=payload.industry,
        owner_name=payload.owner_name,
        address=payload.address,
        working_days=working_days_json,
        work_start_time=payload.work_start_time,
        work_end_time=payload.work_end_time,
        default_break_time=payload.default_break_time,
        is_active=True,
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    subscription_obj = Subscription(
        id=f"sub_{uuid4().hex}",
        user_id=current_user.id,
        company_id=company.id,
        plan_id=plan.id,
        is_active=True,
    )
    db.add(subscription_obj)
    db.commit()
    await notify_channel_event(
        "Yangi kompaniya yaratildi",
        f"Kompaniya: {company.name}\n"
        f"Sohasi: {company.industry}\n"
        f"Egasi: {current_user.username}\n"
        f"Tarif: {plan.code}",
    )
    
    return serialize_company(company, plan.code)
