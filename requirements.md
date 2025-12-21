# LinkedIn Ghostwriter Agent - Requirements & Architecture

## Original Problem Statement
Build a web app called "LinkedIn Ghostwriter Agent" (prototype). Premium, professional dark mode with clean modern layout. User pastes 5–10 LinkedIn posts to learn voice, enters a topic, and app generates 5 new posts in learned voice. User can edit posts and mark favorites.

## User Choices
- AI Provider: OpenAI GPT-5.1 with Emergent LLM key
- Authentication: JWT-based email/password
- Design: Modern dark theme with charcoal background (#0B0F12), teal/blue accents, Outfit + Plus Jakarta Sans fonts

## Architecture Completed

### Backend (FastAPI)
- **Auth**: JWT-based registration/login with bcrypt password hashing
- **Voice Profile Analysis**: GPT-5.1 analyzes pasted posts to extract tone, structure, hook style, CTA style, themes, dos/don'ts
- **Post Generation**: GPT-5.1 generates 5 varied posts (Practical, Story, Contrarian, Framework, Punchy) based on voice profile + guardrails
- **Guardrails**: Configurable post length, emoji usage, hashtags, CTA style, tone boldness
- **CRUD**: Full post management (create, read, update, delete, regenerate, favorite)

### Frontend (React)
- **Landing Page**: Hero, features (Voice Profile, Any Topic, Weekly Draft Pack), example section
- **Auth Pages**: Sign in / Create account with form validation
- **Onboarding**: 3-step wizard (Voice training → Guardrails → Generate)
- **Dashboard**: Post generation, draft management, favorites tab
- **Settings**: Voice profile summary, guardrails configuration

### Data Model (MongoDB)
- **Users**: id, email, password (hashed), name, created_at
- **VoiceProfiles**: id, user_id, raw_samples, extracted_profile, settings, timestamps
- **DraftPosts**: id, user_id, topic, audience, content, tags, is_favorite, timestamps

## API Endpoints
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user
- `POST /api/voice-profile/analyze` - Analyze posts and create voice profile
- `GET /api/voice-profile` - Get user's voice profile
- `PUT /api/voice-profile/settings` - Update guardrails
- `POST /api/posts/generate` - Generate 5 posts
- `GET /api/posts` - List posts (optional favorites_only filter)
- `PUT /api/posts/{id}` - Update post content/favorite
- `DELETE /api/posts/{id}` - Delete post
- `POST /api/posts/{id}/regenerate` - Regenerate single post
- `GET /api/demo/sample-profile` - Get sample posts for demo

## Testing Results
- Backend: 90.9% pass rate (20/22 tests)
- Frontend: 95% pass rate
- All core flows working: registration, login, voice training, post generation, CRUD operations

## Next Action Items
1. Add post scheduling feature (draft to publish queue)
2. Implement post analytics tracking
3. Add bulk post export (CSV/JSON)
4. Create voice profile comparison (A/B test different tones)
5. Add LinkedIn API integration for direct posting

## Potential Enhancements
- **Monetization**: Premium tier with unlimited generations, advanced analytics
- **Collaboration**: Team workspaces for agencies
- **Templates**: Pre-built voice profiles for common personas
- **AI Coaching**: Suggestions to improve post engagement
