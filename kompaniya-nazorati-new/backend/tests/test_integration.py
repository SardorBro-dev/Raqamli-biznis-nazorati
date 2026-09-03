import asyncio
from types import SimpleNamespace

import pytest
from app.models import User, SubscriptionPlan


def test_forward_company_message_to_channel(monkeypatch):
    captured = {}

    async def fake_post(self, url, json=None, params=None):
        captured["url"] = url
        captured["json"] = json
        return SimpleNamespace(status_code=200, json=lambda: {"ok": True})

    monkeypatch.setattr("app.core.telegram.httpx.AsyncClient.post", fake_post)
    monkeypatch.setattr(
        "app.core.telegram.get_settings",
        lambda: SimpleNamespace(telegram_bot_token="token123", telegram_channel_id="-1001234567890"),
    )

    asyncio.run(
        __import__("app.core.telegram", fromlist=["forward_company_chat_message"]).forward_company_chat_message(
            "Kompaniya 1",
            "Ali Valiyev",
            "alivaliyev",
            "Salom, ishchilar!",
        )
    )

    assert captured["url"] == "https://api.telegram.org/bottoken123/sendMessage"
    assert captured["json"]["chat_id"] == "-1001234567890"
    assert captured["json"]["parse_mode"] == "HTML"
    assert "Yangi kompaniya xabari" in captured["json"]["text"]
    assert "Kompaniya" in captured["json"]["text"]
    assert "Ali Valiyev" in captured["json"]["text"]
    assert "Salom, ishchilar!" in captured["json"]["text"]


def test_health_check(client):
    """Test health endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_user(client, db):
    """Test user registration."""
    payload = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["username"] == "newuser"
    assert data["role"] == "company_owner"


def test_register_preserves_first_and_last_name(client, db):
    response = client.post("/api/v1/auth/register", json={
        "name": "Ali Valiyev",
        "username": "alivaliyev",
        "email": "alivaliyev@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    })

    assert response.status_code == 201
    assert response.json()["name"] == "Ali"
    assert response.json()["last_name"] == "Valiyev"


def test_register_duplicate_username(client, db):
    """Test registration with duplicate username."""
    # Create first user
    payload = {
        "username": "duplicate",
        "email": "first@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    }
    response1 = client.post("/api/v1/auth/register", json=payload)
    assert response1.status_code == 201

    # Try to create with same username
    payload["email"] = "second@example.com"
    response2 = client.post("/api/v1/auth/register", json=payload)
    assert response2.status_code == 400
    assert "already exists" in response2.json()["detail"].lower()


def test_login_user(client, seed_db):
    """Test user login."""
    # First register a user
    register_payload = {
        "username": "loginuser",
        "email": "login@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    }
    client.post("/api/v1/auth/register", json=register_payload)

    # Now login
    login_payload = {
        "username": "loginuser",
        "password": "SecurePassword123!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["username"] == "loginuser"


def test_refresh_token(client, seed_db):
    """Test exchanging a valid refresh token for a new access token."""
    register_payload = {
        "username": "refreshuser",
        "email": "refresh@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    }
    login_response = client.post("/api/v1/auth/register", json=register_payload)
    refresh_token = login_response.json()["refresh_token"]

    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "refreshuser"
    assert data["access_token"]
    assert data["refresh_token"]


def test_login_invalid_password(client, seed_db):
    """Test login with wrong password."""
    # Register a user
    register_payload = {
        "username": "wrongpass",
        "email": "wrong@example.com",
        "password": "CorrectPassword123!",
        "confirm_password": "CorrectPassword123!",
        "accept_terms": True,
    }
    client.post("/api/v1/auth/register", json=register_payload)

    # Try with wrong password
    login_payload = {
        "username": "wrongpass",
        "password": "WrongPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401


def test_get_current_user(client, seed_db):
    """Test getting current user profile."""
    # Register a user
    register_payload = {
        "username": "profileuser",
        "email": "profile@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    }
    register_response = client.post("/api/v1/auth/register", json=register_payload)
    token = register_response.json()["access_token"]

    # Get profile
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/users/me", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "profileuser"
    assert data["role"] == "company_owner"


def test_update_current_profile(client, seed_db):
    """Test updating editable profile fields."""
    register_payload = {
        "username": "profileupdate",
        "email": "profileupdate@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
        "name": "Old Name",
    }
    register_response = client.post("/api/v1/auth/register", json=register_payload)
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.patch(
        "/api/v1/users/me",
        json={
            "first_name": "New",
            "last_name": "Profile",
            "username": "newprofile",
            "password": "NewPassword123!",
            "profile_image": "data:image/png;base64,abc",
        },
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["username"] == "newprofile"
    assert response.json()["profile_image"].startswith("data:image/")

    second_response = client.patch(
        "/api/v1/users/me",
        json={
            "first_name": "Updated",
            "last_name": "Profile",
            "username": "updatedprofile",
            "profile_image": "data:image/png;base64,abc",
        },
        headers=headers,
    )
    assert second_response.status_code == 200
    assert second_response.json()["username"] == "updatedprofile"

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "updatedprofile", "password": "NewPassword123!"},
    )
    assert login_response.status_code == 200


def test_subscription_plans_list(client):
    """Test fetching subscription plans."""
    response = client.get("/api/v1/companies/plans")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should create trial, pro, pro_premium if none exist
    assert len(data) >= 3


def test_create_company(client, seed_db):
    """Test creating a company."""
    # Register and login as company owner
    register_payload = {
        "username": "companyowner",
        "email": "owner@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    }
    register_response = client.post("/api/v1/auth/register", json=register_payload)
    token = register_response.json()["access_token"]

    # Create company
    headers = {"Authorization": f"Bearer {token}"}
    company_payload = {
        "name": "Test Company",
        "industry": "Technology",
        "owner_name": "Company Owner",
        "address": "123 Main St",
        "phone": "+998901234567",
        "email": "company@example.com",
        "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "work_start_time": "09:00",
        "work_end_time": "18:00",
        "default_break_time": 30,
    }
    response = client.post("/api/v1/companies", json=company_payload, headers=headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Company"
    assert data["industry"] == "Technology"
    assert "id" in data


def test_create_employee(client, seed_db):
    """Test creating an employee."""
    # Register company owner
    register_payload = {
        "username": "empowner",
        "email": "empowner@example.com",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "accept_terms": True,
    }
    register_response = client.post("/api/v1/auth/register", json=register_payload)
    owner_token = register_response.json()["access_token"]

    # Create company
    headers = {"Authorization": f"Bearer {owner_token}"}
    company_payload = {
        "name": "Employee Test Company",
        "industry": "Technology",
        "owner_name": "Owner",
        "address": "123 Main St",
        "phone": "+998901234567",
        "email": "company@example.com",
        "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "work_start_time": "09:00",
        "work_end_time": "18:00",
        "default_break_time": 30,
    }
    company_response = client.post("/api/v1/companies", json=company_payload, headers=headers)
    company_id = company_response.json()["id"]

    # Create employee
    employee_payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "position": "Developer",
        "department": "Engineering",
        "phone": "+998901234567",
        "work_schedule": "09:00-18:00",
    }
    response = client.post(
        f"/api/v1/employees",
        json=employee_payload,
        headers=headers,
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data["position"] == "Developer"
