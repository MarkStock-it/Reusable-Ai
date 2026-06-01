# Minimal stub for Emergent supervisor compatibility.
# NEXUS is now a pure client-side app - this file does nothing.
# When pushing to GitHub / running locally, ignore the /app/backend folder entirely.
from fastapi import FastAPI

app = FastAPI()


@app.get("/api/")
async def root():
    return {"status": "NEXUS is now a static client-side app. Backend not used."}
