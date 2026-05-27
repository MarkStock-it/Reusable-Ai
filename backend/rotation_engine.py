import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, AsyncGenerator
import json
from motor.motor_asyncio import AsyncIOMotorDatabase
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from encryption import decrypt_api_key
from provider_detection import get_provider_config, detect_provider


class APIRotationEngine:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.cooldown_seconds = 60
        
    async def get_active_keys(self, provider: Optional[str] = None) -> List[Dict]:
        """Get all active API keys, optionally filtered by provider."""
        now = datetime.now(timezone.utc)
        query = {
            "$or": [
                {"status": "active"},
                {
                    "status": "rate_limited",
                    "rate_limit_until": {"$lt": now}
                }
            ]
        }
        
        if provider:
            query["provider"] = provider
            
        keys = await self.db.api_keys.find(query, {"_id": 0}).to_list(100)
        
        # Reset rate-limited keys that have passed cooldown
        for key in keys:
            if key.get('status') == 'rate_limited' and key.get('rate_limit_until'):
                if isinstance(key['rate_limit_until'], str):
                    rate_limit_until = datetime.fromisoformat(key['rate_limit_until'])
                else:
                    rate_limit_until = key['rate_limit_until']
                    
                if rate_limit_until < now:
                    await self.db.api_keys.update_one(
                        {"id": key['id']},
                        {"$set": {"status": "active", "rate_limit_until": None}}
                    )
                    key['status'] = 'active'
                    
        return [k for k in keys if k['status'] == 'active']
    
    async def mark_rate_limited(self, key_id: str):
        """Mark a key as rate limited with cooldown."""
        rate_limit_until = datetime.now(timezone.utc) + timedelta(seconds=self.cooldown_seconds)
        await self.db.api_keys.update_one(
            {"id": key_id},
            {
                "$set": {
                    "status": "rate_limited",
                    "rate_limit_until": rate_limit_until.isoformat()
                }
            }
        )
    
    async def mark_error(self, key_id: str):
        """Mark a key as errored."""
        await self.db.api_keys.update_one(
            {"id": key_id},
            {"$set": {"status": "error"}}
        )
    
    async def update_last_used(self, key_id: str):
        """Update last used timestamp."""
        await self.db.api_keys.update_one(
            {"id": key_id},
            {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
        )
    
    async def chat_with_rotation(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        mode: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Send chat request with automatic key rotation on rate limits."""
        # Get all active keys
        active_keys = await self.get_active_keys()
        
        if not active_keys:
            yield {
                "type": "error",
                "content": "No active API keys available. Please add API keys in settings."
            }
            return
        
        # Try keys one by one
        for key_data in active_keys:
            try:
                provider = key_data['provider']
                decrypted_key = decrypt_api_key(key_data['encrypted_key'])
                
                # Update last used
                await self.update_last_used(key_data['id'])
                
                # Send status update
                yield {
                    "type": "status",
                    "provider": provider,
                    "key_label": key_data['label'],
                    "key_id": key_data['id']
                }
                
                # Use emergentintegrations for supported providers
                if provider in ['openai', 'anthropic', 'gemini', 'emergent']:
                    async for chunk in self._stream_with_emergent(
                        decrypted_key, messages, system_prompt, provider, key_data
                    ):
                        yield chunk
                else:
                    # Use direct HTTP for other providers
                    async for chunk in self._stream_with_http(
                        decrypted_key, messages, system_prompt, provider, key_data
                    ):
                        yield chunk
                
                # If we get here, request was successful
                return
                
            except Exception as e:
                error_str = str(e).lower()
                
                # Check if it's a rate limit error
                if '429' in error_str or 'rate_limit' in error_str or 'quota' in error_str:
                    await self.mark_rate_limited(key_data['id'])
                    yield {
                        "type": "retry",
                        "message": f"Rate limit hit on {key_data['label']}, trying next key..."
                    }
                    continue
                else:
                    # Other error - mark as error and try next
                    await self.mark_error(key_data['id'])
                    yield {
                        "type": "retry",
                        "message": f"Error with {key_data['label']}: {str(e)[:100]}, trying next key..."
                    }
                    continue
        
        # All keys failed
        yield {
            "type": "error",
            "content": "All API keys exhausted or rate limited. Please try again later."
        }
    
    async def _stream_with_emergent(
        self,
        api_key: str,
        messages: List[Dict[str, str]],
        system_prompt: str,
        provider: str,
        key_data: Dict
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream response using emergentintegrations library."""
        # Map provider names
        provider_map = {
            'emergent': 'openai',  # Emergent key works with OpenAI API
            'openai': 'openai',
            'anthropic': 'anthropic',
            'gemini': 'gemini'
        }
        
        llm_provider = provider_map.get(provider, 'openai')
        
        # Determine model
        model_map = {
            'openai': 'gpt-4o-mini',
            'anthropic': 'claude-sonnet-4-5-20250929',
            'gemini': 'gemini-2.5-flash'
        }
        model = model_map.get(llm_provider, 'gpt-4o-mini')
        
        # Create chat instance
        chat = LlmChat(
            api_key=api_key,
            session_id=messages[0].get('session_id', 'default'),
            system_message=system_prompt
        ).with_model(llm_provider, model)
        
        # Get last user message
        last_message = messages[-1]['content'] if messages else ""
        
        user_message = UserMessage(text=last_message)
        
        # Get response (non-streaming, library uses send_message)
        response = await chat.send_message(user_message)
        full_response = response if isinstance(response, str) else str(response)

        # Chunk the response to simulate streaming for better UX
        words = full_response.split(' ')
        chunk_size = 3

        for i in range(0, len(words), chunk_size):
            chunk = ' '.join(words[i:i+chunk_size])
            if i + chunk_size < len(words):
                chunk += ' '
            yield {
                "type": "content",
                "content": chunk,
                "provider": provider,
                "model": model
            }
            await asyncio.sleep(0.03)

        # Send completion
        yield {
            "type": "done",
            "provider": provider,
            "model": model,
            "tokens": len(full_response.split())  # Rough estimate
        }
    
    async def _stream_with_http(
        self,
        api_key: str,
        messages: List[Dict[str, str]],
        system_prompt: str,
        provider: str,
        key_data: Dict
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream response using direct HTTP calls."""
        config = get_provider_config(provider)
        
        # Format request based on provider
        if provider in ['groq', 'mistral']:
            # OpenAI-compatible format
            formatted_messages = [{"role": "system", "content": system_prompt}]
            formatted_messages.extend(messages)
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{config['base_url']}{config['chat_endpoint']}",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": config['default_model'],
                        "messages": formatted_messages,
                        "stream": True
                    },
                    timeout=60.0
                )
                
                if response.status_code == 429:
                    raise Exception("Rate limit exceeded")
                
                response.raise_for_status()
                
                full_response = ""
                async for line in response.aiter_lines():
                    if line.startswith('data: '):
                        data = line[6:]
                        if data == '[DONE]':
                            break
                        try:
                            chunk_data = json.loads(data)
                            content = chunk_data['choices'][0]['delta'].get('content', '')
                            if content:
                                full_response += content
                                yield {
                                    "type": "content",
                                    "content": content,
                                    "provider": provider,
                                    "model": config['default_model']
                                }
                        except:
                            continue
                
                yield {
                    "type": "done",
                    "provider": provider,
                    "model": config['default_model'],
                    "tokens": len(full_response.split())
                }
        
        elif provider == 'cohere':
            # Cohere format
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{config['base_url']}{config['chat_endpoint']}",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": config['default_model'],
                        "message": messages[-1]['content'],
                        "preamble": system_prompt,
                        "stream": True
                    },
                    timeout=60.0
                )
                
                if response.status_code == 429:
                    raise Exception("Rate limit exceeded")
                
                response.raise_for_status()
                
                full_response = ""
                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk_data = json.loads(line)
                            if chunk_data.get('event_type') == 'text-generation':
                                content = chunk_data.get('text', '')
                                if content:
                                    full_response += content
                                    yield {
                                        "type": "content",
                                        "content": content,
                                        "provider": provider,
                                        "model": config['default_model']
                                    }
                        except:
                            continue
                
                yield {
                    "type": "done",
                    "provider": provider,
                    "model": config['default_model'],
                    "tokens": len(full_response.split())
                }