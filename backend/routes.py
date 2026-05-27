from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import (
    APIKeyCreate, APIKeyResponse, APIKey,
    Session, SessionCreate, SessionResponse,
    Message, MessageResponse
)
from encryption import encrypt_api_key, decrypt_api_key
from provider_detection import detect_provider
from datetime import datetime, timezone
from typing import List


def create_keys_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/keys", tags=["keys"])
    
    @router.post("", response_model=APIKeyResponse)
    async def add_api_key(key_create: APIKeyCreate):
        """Add a new API key."""
        # Detect provider
        provider = detect_provider(key_create.key)
        
        if provider == 'unknown':
            raise HTTPException(status_code=400, detail="Could not detect provider from API key")
        
        # Encrypt the key
        encrypted_key = encrypt_api_key(key_create.key)
        
        # Create API key document
        api_key = APIKey(
            label=key_create.label,
            provider=provider,
            encrypted_key=encrypted_key,
            status="active"
        )
        
        # Store in database
        doc = api_key.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.api_keys.insert_one(doc)
        
        # Return response
        return APIKeyResponse(
            id=api_key.id,
            label=api_key.label,
            provider=api_key.provider,
            status=api_key.status,
            last_used=None,
            created_at=api_key.created_at.isoformat(),
            masked_key=f"...{key_create.key[-4:]}"
        )
    
    @router.get("", response_model=List[APIKeyResponse])
    async def get_api_keys():
        """Get all API keys."""
        keys = await db.api_keys.find({}, {"_id": 0}).to_list(100)
        
        response_keys = []
        for key in keys:
            # Decrypt to get last 4 chars
            try:
                decrypted = decrypt_api_key(key['encrypted_key'])
                masked_key = f"...{decrypted[-4:]}"
            except:
                masked_key = "...****"
            
            response_keys.append(APIKeyResponse(
                id=key['id'],
                label=key['label'],
                provider=key['provider'],
                status=key['status'],
                last_used=key.get('last_used'),
                created_at=key['created_at'],
                masked_key=masked_key
            ))
        
        return response_keys
    
    @router.delete("/{key_id}")
    async def delete_api_key(key_id: str):
        """Delete an API key."""
        result = await db.api_keys.delete_one({"id": key_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="API key not found")
        
        return {"message": "API key deleted successfully"}
    
    @router.patch("/{key_id}/status")
    async def update_key_status(key_id: str, status: str):
        """Manually update key status."""
        if status not in ['active', 'rate_limited', 'error']:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        result = await db.api_keys.update_one(
            {"id": key_id},
            {"$set": {"status": status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="API key not found")
        
        return {"message": "Status updated successfully"}
    
    return router


def create_sessions_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/sessions", tags=["sessions"])
    
    @router.post("", response_model=SessionResponse)
    async def create_session(session_create: SessionCreate):
        """Create a new chat session."""
        session = Session(
            title=session_create.title,
            mode=session_create.mode
        )
        
        doc = session.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.sessions.insert_one(doc)
        
        return SessionResponse(
            id=session.id,
            title=session.title,
            mode=session.mode,
            pinned=session.pinned,
            created_at=session.created_at.isoformat(),
            updated_at=session.updated_at.isoformat()
        )
    
    @router.get("", response_model=List[SessionResponse])
    async def get_sessions():
        """Get all sessions."""
        sessions = await db.sessions.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
        
        return [
            SessionResponse(
                id=s['id'],
                title=s['title'],
                mode=s['mode'],
                pinned=s['pinned'],
                created_at=s['created_at'],
                updated_at=s['updated_at']
            )
            for s in sessions
        ]
    
    @router.get("/{session_id}", response_model=SessionResponse)
    async def get_session(session_id: str):
        """Get a specific session."""
        session = await db.sessions.find_one({"id": session_id}, {"_id": 0})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionResponse(
            id=session['id'],
            title=session['title'],
            mode=session['mode'],
            pinned=session['pinned'],
            created_at=session['created_at'],
            updated_at=session['updated_at']
        )
    
    @router.patch("/{session_id}")
    async def update_session(session_id: str, title: str = None, pinned: bool = None):
        """Update session title or pinned status."""
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if title is not None:
            update_data["title"] = title
        if pinned is not None:
            update_data["pinned"] = pinned
        
        result = await db.sessions.update_one(
            {"id": session_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"message": "Session updated successfully"}
    
    @router.delete("/{session_id}")
    async def delete_session(session_id: str):
        """Delete a session and all its messages."""
        # Delete session
        session_result = await db.sessions.delete_one({"id": session_id})
        
        if session_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete all messages in session
        await db.messages.delete_many({"session_id": session_id})
        
        return {"message": "Session deleted successfully"}
    
    @router.get("/{session_id}/messages", response_model=List[MessageResponse])
    async def get_session_messages(session_id: str):
        """Get all messages in a session."""
        messages = await db.messages.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(1000)
        
        return [
            MessageResponse(
                id=m['id'],
                session_id=m['session_id'],
                role=m['role'],
                content=m['content'],
                mode=m['mode'],
                provider=m.get('provider'),
                model=m.get('model'),
                tokens=m.get('tokens'),
                created_at=m['created_at']
            )
            for m in messages
        ]
    
    return router