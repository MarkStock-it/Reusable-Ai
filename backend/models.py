from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class APIKey(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    provider: str  # openai, gemini, anthropic, groq, mistral, cohere
    encrypted_key: str
    status: str = "active"  # active, rate_limited, error
    rate_limit_until: Optional[datetime] = None
    last_used: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class APIKeyCreate(BaseModel):
    label: str
    key: str  # Plaintext key from user


class APIKeyResponse(BaseModel):
    id: str
    label: str
    provider: str
    status: str
    last_used: Optional[str] = None
    created_at: str
    masked_key: str  # Only show last 4 chars


class Session(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    mode: str  # general, code, render, study, analyze, creative
    pinned: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionCreate(BaseModel):
    title: str
    mode: str = "general"


class SessionResponse(BaseModel):
    id: str
    title: str
    mode: str
    pinned: bool
    created_at: str
    updated_at: str


class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # user, assistant
    content: str
    mode: str
    provider: Optional[str] = None
    model: Optional[str] = None
    tokens: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    mode: str
    provider: Optional[str] = None
    model: Optional[str] = None
    tokens: Optional[int] = None
    created_at: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    mode: str
    system_prompt: str


class ExportRequest(BaseModel):
    session_id: str
    format: str = "md"  # md or txt