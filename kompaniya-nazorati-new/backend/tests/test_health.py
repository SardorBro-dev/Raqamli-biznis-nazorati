def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_endpoint(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "newuser123",
            "email": "newuser@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    assert response.status_code == 201
    assert response.json()["username"] == "newuser123"


def test_login_endpoint(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "demo_user",
            "email": "demo@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    assert response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "demo_user", "password": "Password123!"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["username"] == "demo_user"
    assert "access_token" in login_response.json()
    assert "refresh_token" in login_response.json()


def test_duplicate_username_is_rejected(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "username": "duplicate_user",
            "email": "dup1@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )

    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "duplicate_user",
            "email": "dup2@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already exists."


def test_profile_requires_authentication(client):
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_user_roles_metadata_is_available(client):
    response = client.get("/api/v1/users/roles")
    assert response.status_code == 200
    payload = response.json()
    assert any(item["name"] == "company_owner" for item in payload)
    assert any(item["name"] == "manager" for item in payload)
    assert any(item["name"] == "employee" for item in payload)


def test_authenticated_profile_returns_user_data(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "profile_user",
            "email": "profile@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    assert register_response.status_code == 201

    token = register_response.json()["access_token"]
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["username"] == "profile_user"
    assert response.json()["role"] == "company_owner"


def test_subscription_plans_are_available(client):
    response = client.get("/api/v1/companies/plans")
    assert response.status_code == 200
    payload = response.json()
    assert any(item["code"] == "trial" for item in payload)
    assert any(item["code"] == "pro" for item in payload)
    assert any(item["code"] == "pro_premium" for item in payload)


def test_owner_can_create_company_within_plan_limits(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "owner_company_user",
            "email": "ownercompany@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    token = register_response.json()["access_token"]

    response = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Sardor Tech",
            "industry": "IT Services",
            "owner_name": "Sardor",
            "address": "Tashkent",
            "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "work_start_time": "09:00",
            "work_end_time": "18:00",
            "default_break_time": 30,
        },
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Sardor Tech"


def test_company_creation_respects_subscription_limit(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "trial_company_owner",
            "email": "trialcompany@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    token = register_response.json()["access_token"]

    client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "First Trial Company",
            "industry": "Retail",
            "owner_name": "Trial Owner",
            "address": "Samarkand",
            "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "work_start_time": "09:00",
            "work_end_time": "18:00",
            "default_break_time": 30,
        },
    )

    second_response = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Second Trial Company",
            "industry": "Logistics",
            "owner_name": "Trial Owner",
            "address": "Bukhara",
            "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "work_start_time": "08:00",
            "work_end_time": "17:00",
            "default_break_time": 45,
        },
    )
    assert second_response.status_code == 403
    assert second_response.json()["detail"] == "Company creation limit reached for your subscription plan."


def test_owner_can_create_employee_account_and_employee_can_login(client):
    owner_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "owner_for_employee",
            "email": "owneremp@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    owner_token = owner_response.json()["access_token"]

    company_response = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "name": "Employee Test Company",
            "industry": "Retail",
            "owner_name": "Owner Name",
            "address": "Tashkent",
            "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "work_start_time": "09:00",
            "work_end_time": "18:00",
            "default_break_time": 30,
        },
    )
    company_id = company_response.json()["id"]

    employee_response = client.post(
        "/api/v1/employees",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "company_id": company_id,
            "first_name": "Ali",
            "last_name": "Valiyev",
            "position": "Sales Manager",
            "department": "Sales",
            "username": "ali_employee",
            "temporary_password": "TempPass123!",
            "work_schedule": "09:00-18:00",
        },
    )
    assert employee_response.status_code == 201
    employee_id = employee_response.json()["id"]

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "ali_employee", "password": "TempPass123!"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["username"] == "ali_employee"
    assert login_response.json()["role"] == "employee"

    status_response = client.get(
        "/api/v1/employees/{employee_id}/status".format(employee_id=employee_id),
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
    )
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "not_working"


def test_employee_session_flow_updates_status_and_duration(client):
    owner_response = client.post(
        "/api/v1/auth/register",
        json={
            "username": "owner_for_session",
            "email": "ownersession@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "accept_terms": True,
        },
    )
    owner_token = owner_response.json()["access_token"]
    company_response = client.post(
        "/api/v1/companies",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "name": "Session Company",
            "industry": "Logistics",
            "owner_name": "Owner Name",
            "address": "Samarkand",
            "working_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "work_start_time": "09:00",
            "work_end_time": "18:00",
            "default_break_time": 30,
        },
    )
    company_id = company_response.json()["id"]

    employee_response = client.post(
        "/api/v1/employees",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "company_id": company_id,
            "first_name": "Vali",
            "last_name": "Aliyev",
            "position": "Operator",
            "department": "Warehouse",
            "username": "vali_session",
            "temporary_password": "TempPass123!",
            "work_schedule": "09:00-18:00",
        },
    )
    employee_id = employee_response.json()["id"]

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "vali_session", "password": "TempPass123!"},
    )
    employee_token = login_response.json()["access_token"]

    start_response = client.post(
        "/api/v1/work-sessions/start",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={"employee_id": employee_id},
    )
    assert start_response.status_code == 200
    assert start_response.json()["status"] == "working"

    break_response = client.post(
        "/api/v1/work-sessions/break",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={"employee_id": employee_id},
    )
    assert break_response.status_code == 200
    assert break_response.json()["status"] == "on_break"

    resume_response = client.post(
        "/api/v1/work-sessions/resume",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={"employee_id": employee_id},
    )
    assert resume_response.status_code == 200
    assert resume_response.json()["status"] == "working"

    end_response = client.post(
        "/api/v1/work-sessions/end",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={"employee_id": employee_id},
    )
    assert end_response.status_code == 200
    assert end_response.json()["status"] == "not_working"
