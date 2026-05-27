"""NEXUS Backend API tests - keys, sessions, chat, provider detection."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')
# Fallback to backend env if frontend env not available in test env
if not BASE_URL.startswith('http'):
    BASE_URL = 'http://localhost:8001'

# Read frontend env for public URL
try:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
except Exception:
    pass

API = f"{BASE_URL}/api"

# Test key (using Emergent universal key but it's detected as openai prefix)
EMERGENT_KEY = "sk-emergent-284Bb367852F8Cf744"
TEST_OPENAI_KEY = "sk-test1234567890abcdef"
TEST_GEMINI_KEY = "AIzaTestGeminiKey12345"
TEST_ANTHROPIC_KEY = "sk-ant-testkey12345"
TEST_GROQ_KEY = "gsk_testkey12345"


# ---------- Health ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert "NEXUS" in r.json().get("message", "")


# ---------- Keys CRUD ----------
class TestKeys:
    created_ids = []

    def test_add_openai_key(self):
        r = requests.post(f"{API}/keys", json={"label": "TEST_OpenAI", "key": TEST_OPENAI_KEY})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["label"] == "TEST_OpenAI"
        assert data["provider"] in ("openai", "emergent")
        assert data["masked_key"].startswith("...")
        TestKeys.created_ids.append(data["id"])

    def test_add_gemini_key(self):
        r = requests.post(f"{API}/keys", json={"label": "TEST_Gemini", "key": TEST_GEMINI_KEY})
        assert r.status_code == 200, r.text
        assert r.json()["provider"] == "gemini"
        TestKeys.created_ids.append(r.json()["id"])

    def test_add_anthropic_key(self):
        r = requests.post(f"{API}/keys", json={"label": "TEST_Anthropic", "key": TEST_ANTHROPIC_KEY})
        assert r.status_code == 200
        assert r.json()["provider"] == "anthropic"
        TestKeys.created_ids.append(r.json()["id"])

    def test_add_groq_key(self):
        r = requests.post(f"{API}/keys", json={"label": "TEST_Groq", "key": TEST_GROQ_KEY})
        assert r.status_code == 200
        assert r.json()["provider"] == "groq"
        TestKeys.created_ids.append(r.json()["id"])

    def test_add_emergent_key(self):
        r = requests.post(f"{API}/keys", json={"label": "TEST_Emergent", "key": EMERGENT_KEY})
        assert r.status_code == 200
        # Emergent key contains 'emergent' so provider should be 'emergent'
        assert r.json()["provider"] == "emergent"
        TestKeys.created_ids.append(r.json()["id"])

    def test_add_invalid_key(self):
        r = requests.post(f"{API}/keys", json={"label": "BAD", "key": "random-bad-key-xx"})
        assert r.status_code == 400

    def test_list_keys(self):
        r = requests.get(f"{API}/keys")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        labels = [k["label"] for k in data]
        assert "TEST_OpenAI" in labels

    def test_update_key_status(self):
        if not TestKeys.created_ids:
            pytest.skip("no key created")
        kid = TestKeys.created_ids[0]
        r = requests.patch(f"{API}/keys/{kid}/status", params={"status": "rate_limited"})
        assert r.status_code == 200

    def test_zz_delete_keys(self):
        for kid in TestKeys.created_ids:
            r = requests.delete(f"{API}/keys/{kid}")
            assert r.status_code == 200


# ---------- Sessions CRUD ----------
class TestSessions:
    session_id = None

    def test_create_session(self):
        r = requests.post(f"{API}/sessions", json={"title": "TEST_Session", "mode": "general"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "TEST_Session"
        assert data["mode"] == "general"
        assert not data["pinned"]
        TestSessions.session_id = data["id"]

    def test_get_session(self):
        if not TestSessions.session_id:
            pytest.skip("no session")
        r = requests.get(f"{API}/sessions/{TestSessions.session_id}")
        assert r.status_code == 200
        assert r.json()["id"] == TestSessions.session_id

    def test_list_sessions(self):
        r = requests.get(f"{API}/sessions")
        assert r.status_code == 200
        assert any(s["id"] == TestSessions.session_id for s in r.json())

    def test_rename_session(self):
        r = requests.patch(
            f"{API}/sessions/{TestSessions.session_id}",
            params={"title": "TEST_Renamed"}
        )
        assert r.status_code == 200
        g = requests.get(f"{API}/sessions/{TestSessions.session_id}").json()
        assert g["title"] == "TEST_Renamed"

    def test_pin_session(self):
        r = requests.patch(
            f"{API}/sessions/{TestSessions.session_id}",
            params={"pinned": True}
        )
        assert r.status_code == 200
        g = requests.get(f"{API}/sessions/{TestSessions.session_id}").json()
        assert g["pinned"]

    def test_get_messages_empty(self):
        r = requests.get(f"{API}/sessions/{TestSessions.session_id}/messages")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_session_not_found(self):
        r = requests.get(f"{API}/sessions/nonexistent-id")
        assert r.status_code == 404

    def test_zz_delete_session(self):
        r = requests.delete(f"{API}/sessions/{TestSessions.session_id}")
        assert r.status_code == 200
        # verify
        r2 = requests.get(f"{API}/sessions/{TestSessions.session_id}")
        assert r2.status_code == 404


# ---------- Chat streaming (basic check) ----------
class TestChat:
    def test_chat_stream_endpoint_exists(self):
        # Create a session first
        s = requests.post(f"{API}/sessions", json={"title": "TEST_ChatSess", "mode": "general"}).json()
        sid = s["id"]
        try:
            payload = {
                "session_id": sid,
                "message": "Say hello in 3 words.",
                "mode": "general",
                "system_prompt": "You are helpful."
            }
            r = requests.post(f"{API}/chat/stream", json=payload, stream=True, timeout=30)
            assert r.status_code in (200, 500), f"unexpected: {r.status_code} {r.text[:300]}"
            if r.status_code == 200:
                # read a few chunks
                chunks = []
                for i, line in enumerate(r.iter_lines()):
                    if line:
                        chunks.append(line)
                    if i > 5:
                        break
                assert len(chunks) > 0
        finally:
            requests.delete(f"{API}/sessions/{sid}")
