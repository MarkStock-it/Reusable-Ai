# Minimal stub for Emergent supervisor compatibility.
# NEXUS is now a pure client-side app - this file does nothing.
# When pushing to GitHub / running locally, ignore the /app/backend folder entirely.
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx

app = FastAPI()


@app.get("/api/")
async def root():
    return {"status": "NEXUS is now a static client-side app. Backend not used."}


class TestKeyRequest(BaseModel):
    provider: str
    apiKey: str
    # optional model or extra params can be added later
    model: Optional[str] = None


@app.post("/api/test-key")
async def test_key(req: TestKeyRequest):
    """Perform a lightweight provider-specific probe from the server to avoid browser CORS blockers.

    Returns a small summary containing the provider HTTP status code, success flag and a short
    body preview or error message.
    """
    provider = req.provider.lower()
    key = req.apiKey

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            if provider in ("openai", "openai-api"):
                url = "https://api.openai.com/v1/models"
                headers = {"Authorization": f"Bearer {key}"}
                r = await client.get(url, headers=headers)
            elif provider in ("gemini", "google", "google-genai", "google-generative"):
                # The Google generative API often accepts a key as a query param for simple probes
                url = f"https://generativelanguage.googleapis.com/v1/models?key={key}"
                r = await client.get(url)
            elif provider in ("cohere",):
                url = "https://api.cohere.ai/v1/models"
                headers = {"Authorization": f"Bearer {key}"}
                r = await client.get(url, headers=headers)
            elif provider in ("anthropic",):
                # Anthropic may require different endpoints; try a model list/metadata endpoint
                url = "https://api.anthropic.com/v1/models"
                headers = {"x-api-key": key}
                r = await client.get(url, headers=headers)
            else:
                return JSONResponse(status_code=400, content={"error": "unknown provider"})

            # Return compact response info to the frontend
            content_preview = r.text[:800]
            return {
                "status_code": r.status_code,
                "ok": r.is_success,
                "body_preview": content_preview,
            }
        except httpx.HTTPStatusError as e:
            return JSONResponse(status_code=500, content={"error": f"http error: {str(e)}"})
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"request failed: {str(e)}"})
