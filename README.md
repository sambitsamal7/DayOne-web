# ⚔️ Life RPG — Gamified Task & Progression Engine

> **Tech Zephyr 4.0 Hackathon Submission** | **Team DayOne**

Life RPG converts real-world productivity tasks into a dark-mode fantasy RPG progression engine featuring real-time authentication, dynamic streak mechanics, an item shop, and dungeon boss fights.

## Live Demo
https://sambitsamal7.github.io/DayOne-web/

---

## 👥 Team Details & Authors

- **Team Name**: DayOne
- **Team Leader**: Sambit Samal
- **Member 2**: Anshuman Swain
- **Member 3**: Omjyoti Baliarsingh
- **Member 4**: Om Kumar

---

## 🚀 Tech Stack & AI Disclosures

- **Frontend**: Vanilla HTML5, CSS3 (Obsidian Dark Theme), Modern JavaScript (ES6+)
- **Backend & Database**: Supabase (PostgreSQL, Row-Level Security, Native Auth)
- **Audio Engine**: Web Audio API (Synthesized SFX)
- **AI Tooling Disclosure**: Google Gemini was used for architectural guidance, documentation scaffolding, and code refactoring, as permitted under the submission guidelines.

---

## ✨ Core Features

1. **Real-time Authentication** — Email/Password Sign Up & Sign In powered by Supabase Auth.
2. **Cloud Persistence** — Full PostgreSQL database storage, replacing local browser memory.
3. **Dynamic Streak Calculation** — Tracks daily logins with automated consecutive-day logic.
4. **Interactive Economy & Boss Arena** — Earn Gold to purchase gear or deal damage to a dungeon boss.
5. **Row-Level Security** — Each user can only read or modify their own character data and tasks.

---

## 🛠️ Local Setup Instructions

1. **Clone the repository**:
```bash
   git clone https://github.com/sambitsamal7/DayOne-web.git
   cd DayOne-web
```
2. **Set up Supabase**:
   - Create a free project at [supabase.com](https://supabase.com)
   - Copy your Project URL and anon public key from Project Settings → API
   - See `.env.example` for the variable names used
3. **Run locally**:
   - Since this is a plain HTML/CSS/JS app with no build step, just open `index.html` directly in your browser, or use the VS Code "Live Server" extension for hot-reload.
4. **Database setup**: create a `user_data` table and a `tasks` table in Supabase matching the fields used in `app.js`, and enable Row-Level Security with owner-only policies (see below).