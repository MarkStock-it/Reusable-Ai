def detect_provider(api_key: str) -> str:
    """Detect AI provider from API key prefix."""
    key = api_key.strip()
    key_lower = key.lower()
    
    # Check Anthropic first (sk-ant- prefix would otherwise match sk-)
    if key.startswith('sk-ant-'):
        return 'anthropic'
    # Check Emergent universal key
    if 'emergent' in key_lower:
        return 'emergent'
    # OpenAI keys
    if key.startswith('sk-proj-') or key.startswith('sk-'):
        return 'openai'
    # Gemini keys
    if key.startswith('AIza'):
        return 'gemini'
    # Groq keys
    if key.startswith('gsk_'):
        return 'groq'
    # Mistral keys (varies, often starts with 'mistral_' or is base64-like)
    if key.startswith('mistral_'):
        return 'mistral'
    # Cohere keys - explicit prefix or label-based detection (no length heuristic)
    if key.startswith('co-') or 'cohere' in key_lower:
        return 'cohere'
    return 'unknown'


def get_provider_config(provider: str) -> dict:
    """Get configuration for each provider."""
    configs = {
        'openai': {
            'base_url': 'https://api.openai.com/v1',
            'default_model': 'gpt-4',
            'chat_endpoint': '/chat/completions',
        },
        'gemini': {
            'base_url': 'https://generativelanguage.googleapis.com/v1beta',
            'default_model': 'gemini-pro',
            'chat_endpoint': '/models/{model}:generateContent',
        },
        'anthropic': {
            'base_url': 'https://api.anthropic.com/v1',
            'default_model': 'claude-3-sonnet-20240229',
            'chat_endpoint': '/messages',
        },
        'groq': {
            'base_url': 'https://api.groq.com/openai/v1',
            'default_model': 'mixtral-8x7b-32768',
            'chat_endpoint': '/chat/completions',
        },
        'mistral': {
            'base_url': 'https://api.mistral.ai/v1',
            'default_model': 'mistral-medium',
            'chat_endpoint': '/chat/completions',
        },
        'cohere': {
            'base_url': 'https://api.cohere.com/v1',
            'default_model': 'command',
            'chat_endpoint': '/chat',
        },
        'emergent': {
            'base_url': None,  # Uses emergentintegrations library
            'default_model': 'gpt-5.4',
            'chat_endpoint': None,
        },
    }
    return configs.get(provider, configs['openai'])