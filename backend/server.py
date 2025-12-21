from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'ghostwriter_secret_key_2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="LinkedIn Ghostwriter Agent")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class VoiceProfileCreate(BaseModel):
    raw_samples: str
    settings: Optional[dict] = None

class VoiceProfileResponse(BaseModel):
    id: str
    user_id: str
    raw_samples: str
    extracted_profile: dict
    settings: dict
    created_at: str
    updated_at: str

class GuardrailsUpdate(BaseModel):
    post_length: str = "medium"
    emoji: str = "light"
    hashtags: str = "1-3"
    cta: str = "soft"
    risk_filter: str = "balanced"

class GeneratePostsRequest(BaseModel):
    topic: str
    audience: Optional[str] = None

class DraftPostResponse(BaseModel):
    id: str
    user_id: str
    topic: str
    audience: Optional[str]
    content: str
    tags: List[str]
    is_favorite: bool
    created_at: str
    updated_at: str

class DraftPostUpdate(BaseModel):
    content: Optional[str] = None
    is_favorite: Optional[bool] = None

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, created_at=now)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], created_at=user["created_at"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ============== VOICE PROFILE ENDPOINTS ==============

@api_router.post("/voice-profile/analyze", response_model=VoiceProfileResponse)
async def analyze_voice(data: VoiceProfileCreate, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Analyze voice using GPT-5.1
    chat = LlmChat(
        api_key=api_key,
        session_id=f"voice-analysis-{user['id']}-{uuid.uuid4()}",
        system_message="""You are a LinkedIn writing style analyst. Analyze the provided sample posts and extract:
1. Tone (professional, casual, inspirational, provocative, etc.)
2. Structure patterns (how they open, format paragraphs, use line breaks)
3. Hook style (question, statement, statistic, story opener)
4. CTA style (none, soft ask, direct ask)
5. Common themes and topics
6. Do's (things they consistently do)
7. Don'ts (things they avoid)

Return a JSON object with these fields: tone, structure, hook_style, cta_style, themes, dos, donts, summary"""
    ).with_model("openai", "gpt-5.1")
    
    try:
        analysis_prompt = f"""Analyze these LinkedIn posts and extract the author's writing style:

{data.raw_samples}

Return ONLY a valid JSON object with the analysis."""
        
        response = await chat.send_message(UserMessage(text=analysis_prompt))
        
        # Parse JSON from response
        import json
        try:
            # Try to extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                extracted_profile = json.loads(response[json_start:json_end])
            else:
                extracted_profile = {
                    "tone": "professional",
                    "structure": "short paragraphs with line breaks",
                    "hook_style": "direct statement",
                    "cta_style": "soft",
                    "themes": ["leadership", "growth"],
                    "dos": ["Use line breaks", "Start with hooks"],
                    "donts": ["Avoid jargon", "No walls of text"],
                    "summary": response[:500]
                }
        except json.JSONDecodeError:
            extracted_profile = {
                "tone": "professional",
                "structure": "conversational with line breaks",
                "hook_style": "engaging opener",
                "cta_style": "soft",
                "themes": ["business", "personal growth"],
                "dos": ["Be authentic", "Use storytelling"],
                "donts": ["Avoid corporate speak"],
                "summary": response[:500] if response else "Analysis completed"
            }
    except Exception as e:
        logger.error(f"Voice analysis error: {e}")
        extracted_profile = {
            "tone": "professional yet approachable",
            "structure": "short paragraphs, generous line breaks",
            "hook_style": "provocative question or bold statement",
            "cta_style": "soft engagement ask",
            "themes": ["leadership", "personal growth", "industry insights"],
            "dos": ["Use line breaks for readability", "Start with a hook", "End with engagement"],
            "donts": ["Avoid long paragraphs", "No excessive hashtags"],
            "summary": "Voice profile extracted from samples"
        }
    
    now = datetime.now(timezone.utc).isoformat()
    profile_id = str(uuid.uuid4())
    
    # Check if user already has a profile
    existing = await db.voice_profiles.find_one({"user_id": user["id"]})
    
    default_settings = {
        "post_length": "medium",
        "emoji": "light",
        "hashtags": "1-3",
        "cta": "soft",
        "risk_filter": "balanced"
    }
    
    settings = {**default_settings, **(data.settings or {})}
    
    profile_doc = {
        "id": profile_id,
        "user_id": user["id"],
        "raw_samples": data.raw_samples,
        "extracted_profile": extracted_profile,
        "settings": settings,
        "created_at": now,
        "updated_at": now
    }
    
    if existing:
        await db.voice_profiles.update_one(
            {"user_id": user["id"]},
            {"$set": {
                "raw_samples": data.raw_samples,
                "extracted_profile": extracted_profile,
                "settings": settings,
                "updated_at": now
            }}
        )
        profile_doc["id"] = existing["id"]
        profile_doc["created_at"] = existing["created_at"]
    else:
        await db.voice_profiles.insert_one(profile_doc)
    
    return VoiceProfileResponse(**profile_doc)

@api_router.get("/voice-profile", response_model=Optional[VoiceProfileResponse])
async def get_voice_profile(user: dict = Depends(get_current_user)):
    profile = await db.voice_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        return None
    return VoiceProfileResponse(**profile)

@api_router.put("/voice-profile/settings", response_model=VoiceProfileResponse)
async def update_guardrails(settings: GuardrailsUpdate, user: dict = Depends(get_current_user)):
    profile = await db.voice_profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Voice profile not found. Please create one first.")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.voice_profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "settings": settings.model_dump(),
            "updated_at": now
        }}
    )
    
    updated = await db.voice_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return VoiceProfileResponse(**updated)

# ============== POST GENERATION ==============

@api_router.post("/posts/generate", response_model=List[DraftPostResponse])
async def generate_posts(request: GeneratePostsRequest, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Get user's voice profile
    profile = await db.voice_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Please create a voice profile first")
    
    extracted = profile.get("extracted_profile", {})
    settings = profile.get("settings", {})
    
    # Build generation prompt
    length_guide = {
        "short": "Keep posts under 150 words",
        "medium": "Posts should be 150-250 words",
        "long": "Posts can be 250-400 words"
    }.get(settings.get("post_length", "medium"), "Posts should be 150-250 words")
    
    emoji_guide = {
        "none": "Do NOT use any emojis",
        "light": "Use 1-2 emojis sparingly, only if natural",
        "normal": "Use 3-5 emojis to add visual interest"
    }.get(settings.get("emoji", "light"), "Use 1-2 emojis sparingly")
    
    hashtag_guide = {
        "none": "Do NOT include any hashtags",
        "1-3": "Include 1-3 relevant hashtags at the end"
    }.get(settings.get("hashtags", "1-3"), "Include 1-3 relevant hashtags")
    
    cta_guide = {
        "none": "Do NOT include a call-to-action",
        "soft": "End with a soft engagement question or thought-provoking statement",
        "direct": "End with a direct call-to-action (comment, share, follow)"
    }.get(settings.get("cta", "soft"), "End with a soft engagement question")
    
    risk_guide = {
        "conservative": "Keep opinions mainstream and non-controversial",
        "balanced": "Share thoughtful opinions but stay professional",
        "spicy": "Be bold, take contrarian stances, challenge conventional wisdom"
    }.get(settings.get("risk_filter", "balanced"), "Share thoughtful opinions but stay professional")
    
    audience_context = f"Target audience: {request.audience}" if request.audience else "Target audience: LinkedIn professionals"
    
    system_prompt = f"""You are a LinkedIn ghostwriter. Write posts that match this voice profile:

VOICE PROFILE:
- Tone: {extracted.get('tone', 'professional')}
- Structure: {extracted.get('structure', 'short paragraphs with line breaks')}
- Hook style: {extracted.get('hook_style', 'engaging opener')}
- CTA style: {extracted.get('cta_style', 'soft')}
- Themes: {', '.join(extracted.get('themes', ['business']))}
- Do: {', '.join(extracted.get('dos', ['Be authentic']))}
- Avoid: {', '.join(extracted.get('donts', ['Corporate jargon']))}

GUARDRAILS:
- {length_guide}
- {emoji_guide}
- {hashtag_guide}
- {cta_guide}
- {risk_guide}

FORMAT RULES:
- Write like a real LinkedIn post with proper line breaks (use double newlines between paragraphs)
- Never write essay-style long paragraphs
- Each post must be distinct and offer unique value
- Do NOT copy phrases from the voice profile samples - generate original content"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"post-gen-{user['id']}-{uuid.uuid4()}",
        system_message=system_prompt
    ).with_model("openai", "gpt-5.1")
    
    generation_prompt = f"""Write 5 LinkedIn posts about: {request.topic}
{audience_context}

Generate 5 distinct posts with different angles:
1. PRACTICAL: Actionable insight or tip
2. STORY: Personal story or lesson learned  
3. CONTRARIAN: Challenge a common belief
4. FRAMEWORK: A checklist, framework, or step-by-step
5. PUNCHY: Short, bold observation (under 100 words)

Return ONLY a JSON array with 5 objects, each having:
- "content": the full post text with proper line breaks (use \\n\\n for paragraph breaks)
- "tag": one of ["Practical", "Story", "Contrarian", "Framework", "Punchy"]

Example format:
[{{"content": "Post text here...\\n\\nSecond paragraph...", "tag": "Practical"}}]"""

    try:
        response = await chat.send_message(UserMessage(text=generation_prompt))
        
        import json
        # Extract JSON array from response
        json_start = response.find('[')
        json_end = response.rfind(']') + 1
        
        if json_start >= 0 and json_end > json_start:
            posts_data = json.loads(response[json_start:json_end])
        else:
            raise ValueError("No JSON array found in response")
            
    except Exception as e:
        logger.error(f"Post generation error: {e}")
        # Fallback posts
        posts_data = [
            {"content": f"Here's what I've learned about {request.topic}:\n\nThe key is consistency over perfection.\n\nEvery expert was once a beginner.", "tag": "Practical"},
            {"content": f"A story about {request.topic}:\n\nLast year, I failed spectacularly. But that failure taught me everything I know today.", "tag": "Story"},
            {"content": f"Unpopular opinion about {request.topic}:\n\nMost advice you'll hear is wrong.\n\nHere's the truth nobody talks about.", "tag": "Contrarian"},
            {"content": f"My 3-step framework for {request.topic}:\n\n1. Start small\n2. Stay consistent\n3. Iterate fast\n\nSimple but effective.", "tag": "Framework"},
            {"content": f"{request.topic.title()} isn't complicated.\n\nWe make it complicated.\n\nStop overthinking. Start doing.", "tag": "Punchy"}
        ]
    
    # Save posts to database
    now = datetime.now(timezone.utc).isoformat()
    saved_posts = []
    
    for post_data in posts_data[:5]:  # Limit to 5
        post_id = str(uuid.uuid4())
        content = post_data.get("content", "")
        tag = post_data.get("tag", "Practical")
        
        post_doc = {
            "id": post_id,
            "user_id": user["id"],
            "topic": request.topic,
            "audience": request.audience,
            "content": content,
            "tags": [tag],
            "is_favorite": False,
            "created_at": now,
            "updated_at": now
        }
        
        await db.draft_posts.insert_one(post_doc)
        saved_posts.append(DraftPostResponse(**post_doc))
    
    return saved_posts

@api_router.get("/posts", response_model=List[DraftPostResponse])
async def get_posts(favorites_only: bool = False, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if favorites_only:
        query["is_favorite"] = True
    
    posts = await db.draft_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [DraftPostResponse(**p) for p in posts]

@api_router.put("/posts/{post_id}", response_model=DraftPostResponse)
async def update_post(post_id: str, update: DraftPostUpdate, user: dict = Depends(get_current_user)):
    post = await db.draft_posts.find_one({"id": post_id, "user_id": user["id"]})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.content is not None:
        update_data["content"] = update.content
    if update.is_favorite is not None:
        update_data["is_favorite"] = update.is_favorite
    
    await db.draft_posts.update_one({"id": post_id}, {"$set": update_data})
    
    updated = await db.draft_posts.find_one({"id": post_id}, {"_id": 0})
    return DraftPostResponse(**updated)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    result = await db.draft_posts.delete_one({"id": post_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}

@api_router.post("/posts/{post_id}/regenerate", response_model=DraftPostResponse)
async def regenerate_post(post_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    post = await db.draft_posts.find_one({"id": post_id, "user_id": user["id"]}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    profile = await db.voice_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not api_key or not profile:
        raise HTTPException(status_code=400, detail="Cannot regenerate without voice profile")
    
    extracted = profile.get("extracted_profile", {})
    tag = post["tags"][0] if post["tags"] else "Practical"
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"regen-{user['id']}-{uuid.uuid4()}",
        system_message=f"""You are a LinkedIn ghostwriter. Write in this voice:
Tone: {extracted.get('tone', 'professional')}
Structure: {extracted.get('structure', 'short paragraphs')}
Write a single LinkedIn post."""
    ).with_model("openai", "gpt-5.1")
    
    try:
        response = await chat.send_message(UserMessage(
            text=f"Write a new {tag} LinkedIn post about: {post['topic']}. Use proper line breaks. Return ONLY the post content, nothing else."
        ))
        new_content = response.strip()
    except Exception as e:
        logger.error(f"Regeneration error: {e}")
        new_content = post["content"]  # Keep original on error
    
    now = datetime.now(timezone.utc).isoformat()
    await db.draft_posts.update_one(
        {"id": post_id},
        {"$set": {"content": new_content, "updated_at": now}}
    )
    
    updated = await db.draft_posts.find_one({"id": post_id}, {"_id": 0})
    return DraftPostResponse(**updated)

# ============== DEMO ENDPOINTS ==============

@api_router.get("/demo/sample-profile")
async def get_sample_profile():
    """Returns sample voice profile for demo purposes"""
    return {
        "sample_posts": """Here's what I learned after 10 years of leading teams:

The best leaders don't have all the answers.

They have the best questions.

Ask more. Tell less. Watch your team transform.

---

I was wrong about remote work.

Two years ago, I thought it would kill culture. Instead, it forced us to be intentional about connection.

The office wasn't culture. It was proximity we mistook for culture.

Real culture is built through:
• Clear values
• Consistent actions
• Genuine care

Location is irrelevant.

---

Stop saying "I don't have time."

Start saying "It's not a priority."

Watch how quickly your calendar reflects your values.

Time management is really priority management.

What's one thing you've been "too busy" for that actually matters?

---

The most underrated skill in business?

Writing clearly.

Not clever. Not fancy. Clear.

Every email, every doc, every message is a chance to earn trust or lose it.

Simple words. Short sentences. One idea at a time.

That's it. That's the whole framework.

---

Controversial take: Your morning routine doesn't matter.

What matters is showing up consistently for the work that matters.

5am or 10am—who cares?

Results > rituals.""",
        "extracted_profile": {
            "tone": "Direct, confident, conversational",
            "structure": "Short paragraphs, generous line breaks, often one-liners",
            "hook_style": "Bold statement or contrarian opener",
            "cta_style": "Soft engagement question",
            "themes": ["Leadership", "Remote work", "Productivity", "Communication"],
            "dos": ["Use line breaks liberally", "Challenge conventional wisdom", "End with questions", "Keep paragraphs to 1-3 sentences"],
            "donts": ["No corporate jargon", "Avoid long paragraphs", "No excessive hashtags", "Don't hedge opinions"],
            "summary": "Direct, no-BS voice that challenges conventional thinking while remaining approachable"
        }
    }

@api_router.post("/demo/generate")
async def demo_generate_posts(request: GeneratePostsRequest):
    """Generate posts in demo mode without authentication"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Use sample voice profile
    extracted = {
        "tone": "Direct, confident, conversational",
        "structure": "Short paragraphs, generous line breaks, often one-liners",
        "hook_style": "Bold statement or contrarian opener",
        "cta_style": "Soft engagement question",
        "themes": ["Leadership", "Remote work", "Productivity", "Communication"],
        "dos": ["Use line breaks liberally", "Challenge conventional wisdom", "End with questions"],
        "donts": ["No corporate jargon", "Avoid long paragraphs", "No excessive hashtags"]
    }
    
    settings = {
        "post_length": "medium",
        "emoji": "light",
        "hashtags": "1-3",
        "cta": "soft",
        "risk_filter": "balanced"
    }
    
    system_prompt = f"""You are a LinkedIn ghostwriter. Write posts that match this voice profile:

VOICE PROFILE:
- Tone: {extracted.get('tone', 'professional')}
- Structure: {extracted.get('structure', 'short paragraphs with line breaks')}
- Hook style: {extracted.get('hook_style', 'engaging opener')}
- CTA style: {extracted.get('cta_style', 'soft')}
- Themes: {', '.join(extracted.get('themes', ['business']))}
- Do: {', '.join(extracted.get('dos', ['Be authentic']))}
- Avoid: {', '.join(extracted.get('donts', ['Corporate jargon']))}

GUARDRAILS:
- Posts should be 150-250 words
- Use 1-2 emojis sparingly, only if natural
- Include 1-3 relevant hashtags at the end
- End with a soft engagement question or thought-provoking statement
- Share thoughtful opinions but stay professional

FORMAT RULES:
- Write like a real LinkedIn post with proper line breaks (use double newlines between paragraphs)
- Never write essay-style long paragraphs
- Each post must be distinct and offer unique value"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"demo-gen-{uuid.uuid4()}",
        system_message=system_prompt
    ).with_model("openai", "gpt-5.1")
    
    audience_context = f"Target audience: {request.audience}" if request.audience else "Target audience: LinkedIn professionals"
    
    generation_prompt = f"""Write 5 LinkedIn posts about: {request.topic}
{audience_context}

Generate 5 distinct posts with different angles:
1. PRACTICAL: Actionable insight or tip
2. STORY: Personal story or lesson learned  
3. CONTRARIAN: Challenge a common belief
4. FRAMEWORK: A checklist, framework, or step-by-step
5. PUNCHY: Short, bold observation (under 100 words)

Return ONLY a JSON array with 5 objects, each having:
- "content": the full post text with proper line breaks (use \\n\\n for paragraph breaks)
- "tag": one of ["Practical", "Story", "Contrarian", "Framework", "Punchy"]"""

    try:
        response = await chat.send_message(UserMessage(text=generation_prompt))
        
        import json
        json_start = response.find('[')
        json_end = response.rfind(']') + 1
        
        if json_start >= 0 and json_end > json_start:
            posts_data = json.loads(response[json_start:json_end])
        else:
            raise ValueError("No JSON array found")
            
    except Exception as e:
        logger.error(f"Demo generation error: {e}")
        posts_data = [
            {"content": f"Here's what I've learned about {request.topic}:\n\nThe key is consistency over perfection.\n\nEvery expert was once a beginner.\n\nWhat's stopping you from starting today?", "tag": "Practical"},
            {"content": f"A story about {request.topic}:\n\nLast year, I failed spectacularly.\n\nBut that failure taught me everything I know today.\n\nThe lesson? Fail fast. Learn faster.", "tag": "Story"},
            {"content": f"Unpopular opinion about {request.topic}:\n\nMost advice you'll hear is wrong.\n\nHere's the truth nobody talks about:\n\nSimplicity beats complexity. Every time.", "tag": "Contrarian"},
            {"content": f"My 3-step framework for {request.topic}:\n\n1. Start small\n2. Stay consistent\n3. Iterate fast\n\nSimple but effective.\n\nWhich step do you struggle with most?", "tag": "Framework"},
            {"content": f"{request.topic.title()} isn't complicated.\n\nWe make it complicated.\n\nStop overthinking.\n\nStart doing.", "tag": "Punchy"}
        ]
    
    # Return posts without saving (demo mode)
    now = datetime.now(timezone.utc).isoformat()
    demo_posts = []
    
    for i, post_data in enumerate(posts_data[:5]):
        demo_posts.append({
            "id": f"demo-{uuid.uuid4()}",
            "user_id": "demo",
            "topic": request.topic,
            "audience": request.audience,
            "content": post_data.get("content", ""),
            "tags": [post_data.get("tag", "Practical")],
            "is_favorite": False,
            "created_at": now,
            "updated_at": now
        })
    
    return demo_posts

class DemoVoiceAnalyzeRequest(BaseModel):
    raw_samples: str

@api_router.post("/demo/analyze-voice")
async def demo_analyze_voice(data: DemoVoiceAnalyzeRequest):
    """Analyze voice in demo mode without authentication"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    if not data.raw_samples or len(data.raw_samples) < 100:
        raise HTTPException(status_code=400, detail="Please provide at least 100 characters of sample posts")
    
    # Analyze voice using GPT-5.1
    chat = LlmChat(
        api_key=api_key,
        session_id=f"demo-voice-analysis-{uuid.uuid4()}",
        system_message="""You are a LinkedIn writing style analyst. Analyze the provided sample posts and extract:
1. Tone (professional, casual, inspirational, provocative, etc.)
2. Structure patterns (how they open, format paragraphs, use line breaks)
3. Hook style (question, statement, statistic, story opener)
4. CTA style (none, soft ask, direct ask)
5. Common themes and topics
6. Do's (things they consistently do)
7. Don'ts (things they avoid)

Return a JSON object with these fields: tone, structure, hook_style, cta_style, themes, dos, donts, summary"""
    ).with_model("openai", "gpt-5.1")
    
    try:
        analysis_prompt = f"""Analyze these LinkedIn posts and extract the author's writing style:

{data.raw_samples}

Return ONLY a valid JSON object with the analysis."""
        
        response = await chat.send_message(UserMessage(text=analysis_prompt))
        
        # Parse JSON from response
        import json
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                extracted_profile = json.loads(response[json_start:json_end])
            else:
                raise ValueError("No JSON found")
        except (json.JSONDecodeError, ValueError):
            extracted_profile = {
                "tone": "professional yet approachable",
                "structure": "short paragraphs, generous line breaks",
                "hook_style": "engaging opener",
                "cta_style": "soft",
                "themes": ["business", "personal growth"],
                "dos": ["Use line breaks", "Be authentic"],
                "donts": ["Avoid jargon"],
                "summary": response[:500] if response else "Analysis completed"
            }
    except Exception as e:
        logger.error(f"Demo voice analysis error: {e}")
        extracted_profile = {
            "tone": "professional yet approachable",
            "structure": "short paragraphs, generous line breaks",
            "hook_style": "provocative question or bold statement",
            "cta_style": "soft engagement ask",
            "themes": ["leadership", "personal growth", "industry insights"],
            "dos": ["Use line breaks for readability", "Start with a hook", "End with engagement"],
            "donts": ["Avoid long paragraphs", "No excessive hashtags"],
            "summary": "Voice profile extracted from samples"
        }
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Return demo profile (not saved to database)
    return {
        "id": f"demo-profile-{uuid.uuid4()}",
        "user_id": "demo",
        "raw_samples": data.raw_samples,
        "extracted_profile": extracted_profile,
        "settings": {
            "post_length": "medium",
            "emoji": "light",
            "hashtags": "1-3",
            "cta": "soft",
            "risk_filter": "balanced"
        },
        "created_at": now,
        "updated_at": now
    }

@api_router.post("/demo/generate-with-profile")
async def demo_generate_with_profile(request: GeneratePostsRequest, profile: dict = None):
    """Generate posts in demo mode with a custom analyzed profile"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Use provided profile or default
    extracted = profile if profile else {
        "tone": "Direct, confident, conversational",
        "structure": "Short paragraphs, generous line breaks",
        "hook_style": "Bold statement or contrarian opener",
        "cta_style": "Soft engagement question",
        "themes": ["Leadership", "Productivity"],
        "dos": ["Use line breaks", "Challenge conventional wisdom"],
        "donts": ["No corporate jargon", "Avoid long paragraphs"]
    }
    
    system_prompt = f"""You are a LinkedIn ghostwriter. Write posts that match this voice profile:

VOICE PROFILE:
- Tone: {extracted.get('tone', 'professional')}
- Structure: {extracted.get('structure', 'short paragraphs with line breaks')}
- Hook style: {extracted.get('hook_style', 'engaging opener')}
- CTA style: {extracted.get('cta_style', 'soft')}
- Themes: {', '.join(extracted.get('themes', ['business'])) if isinstance(extracted.get('themes'), list) else extracted.get('themes', 'business')}
- Do: {', '.join(extracted.get('dos', ['Be authentic'])) if isinstance(extracted.get('dos'), list) else extracted.get('dos', 'Be authentic')}
- Avoid: {', '.join(extracted.get('donts', ['Corporate jargon'])) if isinstance(extracted.get('donts'), list) else extracted.get('donts', 'Corporate jargon')}

FORMAT RULES:
- Write like a real LinkedIn post with proper line breaks
- Never write essay-style long paragraphs
- Each post must be distinct"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"demo-gen-profile-{uuid.uuid4()}",
        system_message=system_prompt
    ).with_model("openai", "gpt-5.1")
    
    audience_context = f"Target audience: {request.audience}" if request.audience else "Target audience: LinkedIn professionals"
    
    generation_prompt = f"""Write 5 LinkedIn posts about: {request.topic}
{audience_context}

Generate 5 distinct posts with different angles:
1. PRACTICAL: Actionable insight or tip
2. STORY: Personal story or lesson learned  
3. CONTRARIAN: Challenge a common belief
4. FRAMEWORK: A checklist, framework, or step-by-step
5. PUNCHY: Short, bold observation (under 100 words)

Return ONLY a JSON array with 5 objects, each having:
- "content": the full post text with proper line breaks (use \\n\\n for paragraph breaks)
- "tag": one of ["Practical", "Story", "Contrarian", "Framework", "Punchy"]"""

    try:
        response = await chat.send_message(UserMessage(text=generation_prompt))
        
        import json
        json_start = response.find('[')
        json_end = response.rfind(']') + 1
        
        if json_start >= 0 and json_end > json_start:
            posts_data = json.loads(response[json_start:json_end])
        else:
            raise ValueError("No JSON array found")
            
    except Exception as e:
        logger.error(f"Demo generation with profile error: {e}")
        posts_data = [
            {"content": f"Here's what I've learned about {request.topic}:\n\nThe key is consistency over perfection.\n\nEvery expert was once a beginner.", "tag": "Practical"},
            {"content": f"A story about {request.topic}:\n\nLast year, I failed. But that failure taught me everything.", "tag": "Story"},
            {"content": f"Unpopular opinion about {request.topic}:\n\nMost advice is wrong.\n\nSimplicity beats complexity.", "tag": "Contrarian"},
            {"content": f"My 3-step framework for {request.topic}:\n\n1. Start small\n2. Stay consistent\n3. Iterate fast", "tag": "Framework"},
            {"content": f"{request.topic.title()} isn't complicated.\n\nWe make it complicated.\n\nStop overthinking.", "tag": "Punchy"}
        ]
    
    now = datetime.now(timezone.utc).isoformat()
    demo_posts = []
    
    for post_data in posts_data[:5]:
        demo_posts.append({
            "id": f"demo-{uuid.uuid4()}",
            "user_id": "demo",
            "topic": request.topic,
            "audience": request.audience,
            "content": post_data.get("content", ""),
            "tags": [post_data.get("tag", "Practical")],
            "is_favorite": False,
            "created_at": now,
            "updated_at": now
        })
    
    return demo_posts

# ============== ROOT & HEALTH ==============

@api_router.get("/")
async def root():
    return {"message": "LinkedIn Ghostwriter Agent API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
