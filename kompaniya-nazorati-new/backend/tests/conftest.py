import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.main import app
from app.models import User, SubscriptionPlan, Company, Subscription, Employee, WorkSession
from app.core.security import hash_password

# SQLite in-memory database for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Enable SQLite foreign keys
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# Create all tables immediately
Base.metadata.create_all(bind=engine)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Provide test database session with rollback isolation."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(db):
    """Create test client with dependency overrides."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    
    # Seed with default plans only if they don't exist
    existing_plans = db.query(SubscriptionPlan).count()
    if existing_plans == 0:
        plans = [
            SubscriptionPlan(
                id="plan_trial",
                code="trial",
                name="Trial",
                description="Free trial plan",
                monthly_price=0,
                company_limit=1,
                employee_limit=5,
                features="Basic features",
                is_active=True,
            ),
            SubscriptionPlan(
                id="plan_pro",
                code="pro",
                name="Pro",
                description="Professional plan",
                monthly_price=200000,
                company_limit=1,
                employee_limit=50,
                features="Advanced features",
                is_active=True,
            ),
            SubscriptionPlan(
                id="plan_pro_premium",
                code="pro_premium",
                name="Pro Premium",
                description="Premium plan",
                monthly_price=500000,
                company_limit=5,
                employee_limit=300,
                features="All features",
                is_active=True,
            ),
        ]
        db.add_all(plans)
        db.commit()

    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seed_db(db):
    """Seed database with initial data without duplicate plan rows."""
    existing_plans = db.query(SubscriptionPlan).count()
    if existing_plans == 0:
        plans = [
            SubscriptionPlan(
                id="plan_trial",
                code="trial",
                name="Trial",
                description="Free trial plan",
                monthly_price=0,
                company_limit=1,
                employee_limit=5,
                features="Basic features",
                is_active=True,
            ),
            SubscriptionPlan(
                id="plan_pro",
                code="pro",
                name="Pro",
                description="Professional plan",
                monthly_price=200000,
                company_limit=1,
                employee_limit=50,
                features="Advanced features",
                is_active=True,
            ),
        ]
        db.add_all(plans)
        db.commit()

    existing_user = db.query(User).filter(User.username == "testuser").first()
    if existing_user is None:
        test_user = User(
            id="user_test123",
            username="testuser",
            email="test@example.com",
            password_hash="hashed_password_here",
            role="company_owner",
            is_active=True,
            is_verified=True,
        )
        db.add(test_user)
        db.commit()

    return db
