from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import ChatRequest, Message, ExportRequest
from rotation_engine import APIRotationEngine
from datetime import datetime, timezone
import json
from typing import AsyncGenerator


def create_chat_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/chat", tags=["chat"])
    engine = APIRotationEngine(db)
    
    @router.post("/stream")
    async def stream_chat(request: ChatRequest):
        """Stream chat response with API rotation."""
        # Get session history
        messages = await db.messages.find(
            {"session_id": request.session_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
        
        # Format messages for API
        formatted_messages = [
            {"role": m['role'], "content": m['content']}
            for m in messages
        ]
        
        # Add current user message
        formatted_messages.append({"role": "user", "content": request.message})
        
        # Save user message to database
        user_message = Message(
            session_id=request.session_id,
            role="user",
            content=request.message,
            mode=request.mode
        )
        
        user_doc = user_message.model_dump()
        user_doc['created_at'] = user_doc['created_at'].isoformat()
        await db.messages.insert_one(user_doc)
        
        # Update session updated_at
        await db.sessions.update_one(
            {"id": request.session_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Stream response
        async def generate_stream() -> AsyncGenerator[str, None]:
            full_response = ""
            current_provider = None
            current_model = None
            
            async for chunk in engine.chat_with_rotation(
                formatted_messages,
                request.system_prompt,
                request.mode
            ):
                # Send SSE formatted data
                yield f"data: {json.dumps(chunk)}\n\n"
                
                if chunk['type'] == 'content':
                    full_response += chunk['content']
                    current_provider = chunk.get('provider')
                    current_model = chunk.get('model')
                elif chunk['type'] == 'done':
                    # Save assistant message
                    assistant_message = Message(
                        session_id=request.session_id,
                        role="assistant",
                        content=full_response,
                        mode=request.mode,
                        provider=chunk.get('provider'),
                        model=chunk.get('model'),
                        tokens=chunk.get('tokens')
                    )
                    
                    assistant_doc = assistant_message.model_dump()
                    assistant_doc['created_at'] = assistant_doc['created_at'].isoformat()
                    await db.messages.insert_one(assistant_doc)
            
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    
    @router.post("/export")
    async def export_conversation(request: ExportRequest):
        """Export conversation as markdown or text."""
        # Get session
        session = await db.sessions.find_one({"id": request.session_id}, {"_id": 0})
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        messages = await db.messages.find(
            {"session_id": request.session_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(1000)
        
        if request.format == "md":
            # Format as markdown
            output = f"# {session['title']}\n\n"
            output += f"Mode: {session['mode']}\n\n"
            output += "---\n\n"
            
            for msg in messages:
                role_label = "**You:**" if msg['role'] == 'user' else "**AI:**"
                output += f"{role_label}\n\n{msg['content']}\n\n---\n\n"
            
            return {"content": output, "filename": f"{session['title']}.md"}
        else:
            # Format as plain text
            output = f"{session['title']}\n\n"
            output += f"Mode: {session['mode']}\n\n"
            output += "=" * 50 + "\n\n"
            
            for msg in messages:
                role_label = "You:" if msg['role'] == 'user' else "AI:"
                output += f"{role_label}\n{msg['content']}\n\n" + "-" * 50 + "\n\n"
            
            return {"content": output, "filename": f"{session['title']}.txt"}
    
    return router