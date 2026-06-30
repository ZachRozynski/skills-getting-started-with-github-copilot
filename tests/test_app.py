import copy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture
def client():
    app_module.activities = copy.deepcopy(app_module.activities)
    with TestClient(app_module.app) as test_client:
        yield test_client


def test_root_redirects_to_static_index(client):
    response = client.get("/", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_catalog(client):
    response = client.get("/activities")

    assert response.status_code == 200
    body = response.json()
    assert "Chess Club" in body
    assert body["Chess Club"]["max_participants"] == 12
    assert "michael@mergington.edu" in body["Chess Club"]["participants"]


def test_signup_and_unregister_flow(client):
    email = "newstudent@mergington.edu"

    signup_response = client.post(
        "/activities/Soccer Team/signup",
        params={"email": email},
    )

    assert signup_response.status_code == 200
    assert signup_response.json()["message"] == f"Signed up {email} for Soccer Team"
    assert email in app_module.activities["Soccer Team"]["participants"]

    unregister_response = client.post(
        "/activities/Soccer Team/unregister",
        params={"email": email},
    )

    assert unregister_response.status_code == 200
    assert unregister_response.json()["message"] == f"Unregistered {email} from Soccer Team"
    assert email not in app_module.activities["Soccer Team"]["participants"]


def test_signup_rejects_duplicate_email(client):
    email = "michael@mergington.edu"

    response = client.post(
        "/activities/Chess Club/signup",
        params={"email": email},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"


def test_signup_rejects_unknown_activity(client):
    response = client.post(
        "/activities/Unknown Activity/signup",
        params={"email": "student@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_rejects_unregistered_email(client):
    response = client.post(
        "/activities/Drama Club/unregister",
        params={"email": "not-registered@mergington.edu"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Student is not registered for this activity"
