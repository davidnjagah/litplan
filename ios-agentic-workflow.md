# 🚀 iOS App Development: Agentic AI Team Workflow

## The Dream Team Setup

### Your AI Development Team

1. **You (Human)** - Vision Holder & Final Decision Maker
2. **Claude (Product Manager)** - Me, coordinating everything in claude.ai
3. **UI Designer** - Claude Code in Warp (Designer mode)
4. **Backend Engineer** - Claude Code in Warp (Backend mode)
5. **QA Tester** - Claude Code in Warp (Testing mode)

---

## 📁 Project Structure

```
my-ios-app/
├── .ai-team/                    # AI team coordination folder
│   ├── DAILY_LOG.md            # Single source of truth
│   ├── sprint-plan.md          # Current sprint goals
│   ├── ui-decisions.md         # Design system decisions
│   ├── backend-specs.md        # API contracts
│   └── qa-checklist.md         # Testing criteria
├── ios-app/                    # iOS project
│   ├── MyApp.xcodeproj
│   └── MyApp/
├── backend/                    # Backend services
│   └── api/
└── design/                     # Design assets
    └── figma-exports/
```

---

## 🎯 The Optimal Workflow

### Phase 1: Setup (One Time)

**Step 1: Create Your Project Folder**
```bash
mkdir my-ios-app
cd my-ios-app
mkdir -p .ai-team design backend ios-app
```

**Step 2: Initialize Daily Log**
Create `.ai-team/DAILY_LOG.md` with this template:

```markdown
# Daily Development Log

## [Date] - Sprint Day X

### 🎨 UI Designer (Claude Code - Designer)
- **Tasks Completed:**
  - 
- **Files Modified:**
  - 
- **Decisions Made:**
  - 
- **Blockers:**
  - 

### 🔧 Backend Engineer (Claude Code - Backend)
- **Tasks Completed:**
  - 
- **Files Modified:**
  - 
- **API Changes:**
  - 
- **Blockers:**
  - 

### ✅ QA Tester (Claude Code - QA)
- **Tests Run:**
  - 
- **Bugs Found:**
  - 
- **Tests Passed:**
  - 
- **Blockers:**
  - 

### 📊 Product Manager (Claude - PM)
- **Decisions Made:**
  - 
- **Team Coordination:**
  - 
- **Next Steps:**
  - 

---
```

**Step 3: Create Your Context Files**
These help each AI agent understand their role:

`.ai-team/UI_DESIGNER_CONTEXT.md`:
```markdown
# UI Designer Context

## Your Role
You are the expert iOS UI designer responsible for creating a modern, beautiful user interface.

## Design Philosophy
[Your vision here - minimal, bold, glassmorphic, etc.]

## Tech Stack
- SwiftUI
- UIKit (if needed)
- Modern iOS patterns (iOS 17+)

## Always Do
- Follow iOS Human Interface Guidelines
- Maintain design consistency
- Update ui-decisions.md with any new patterns
- Log all work in DAILY_LOG.md under your section
```

`.ai-team/BACKEND_ENGINEER_CONTEXT.md`:
```markdown
# Backend Engineer Context

## Your Role
Senior backend engineer building robust, scalable APIs.

## Tech Stack
[Your choice: Node.js/Express, Python/FastAPI, Swift Vapor, etc.]

## Always Do
- Write clean, documented code
- Update API specs in backend-specs.md
- Log all work in DAILY_LOG.md under your section
- Consider security and performance
```

`.ai-team/QA_TESTER_CONTEXT.md`:
```markdown
# QA Tester Context

## Your Role
Quality assurance - find bugs, validate features, ensure excellence.

## Responsibilities
- Unit testing
- UI testing
- Integration testing
- Manual testing checklist

## Always Do
- Update qa-checklist.md
- Document bugs clearly
- Log all work in DAILY_LOG.md under your section
```

---

## 🎨 Getting UI Inspiration (Critical Step!)

### Method 1: Dribbble/Behance Reference
1. Find 3-5 iOS apps with your desired aesthetic
2. Screenshot key screens
3. Upload to Claude (me) with: "This is the vibe I want"
4. I'll create a detailed design brief for the UI Designer

### Method 2: Existing App Analysis
Tell me: "I want it to look like [App Name] but for [your use case]"
I'll analyze the design patterns and create specifications

### Method 3: Mood Board Approach
Upload images/screenshots of:
- Color schemes you like
- Typography examples
- Layout patterns
- Animation styles

**Then I create a `design-brief.md` that all agents can reference**

---

## 🔄 Daily Workflow (The Magic)

### Morning (Sprint Planning with PM - Me)

**You talk to me in claude.ai:**
```
You: "Today I want to build the login screen and user profile API"

Me (PM): I'll break this down and assign tasks:
- UI Designer: Create login screen with modern iOS design
- Backend: Build auth API with JWT tokens
- QA: Write tests for auth flow
```

### Afternoon (Agents Execute)

**Open 3 Warp terminals:**

**Terminal 1 - UI Designer:**
```bash
cd my-ios-app
claude

# In Claude Code prompt:
"You are the UI Designer. Read .ai-team/UI_DESIGNER_CONTEXT.md and today's task in DAILY_LOG.md. Build the login screen following our design system. Update the log when done."
```

**Terminal 2 - Backend Engineer:**
```bash
cd my-ios-app/backend
claude

# In Claude Code prompt:
"You are the Backend Engineer. Read .ai-team/BACKEND_ENGINEER_CONTEXT.md and build the auth API as specified. Update DAILY_LOG.md with your progress."
```

**Terminal 3 - QA Tester:**
```bash
cd my-ios-app
claude

# In Claude Code prompt:
"You are the QA Tester. Read .ai-team/QA_TESTER_CONTEXT.md. Once UI and Backend are done, test the auth flow. Log results in DAILY_LOG.md."
```

### Evening (Review with PM - Me)

Come back to claude.ai:
```
You: "Here's today's DAILY_LOG.md [paste or upload]"

Me: I'll review, identify issues, and plan tomorrow's sprint.
```

---

## 🎯 Pro Tips for Success

### 1. **One DAILY_LOG.md to Rule Them All**
- Each agent appends to the same file
- Easy to track progress
- Natural changelog
- Grep-able history

### 2. **Use Git Branches Per Agent**
```bash
git checkout -b ui/login-screen
git checkout -b backend/auth-api
git checkout -b qa/auth-tests
```

### 3. **Context is King**
Each Claude Code session should start with:
```
"Read .ai-team/[YOUR_ROLE]_CONTEXT.md and .ai-team/DAILY_LOG.md first, then proceed with [task]"
```

### 4. **Share Files Between Agents**
```bash
# UI Designer creates design tokens
echo "Colors, fonts, spacing" > .ai-team/design-tokens.json

# Backend Engineer references it
# QA Tester validates against it
```

### 5. **Use Me (PM Claude) for Coordination**
- Upload the DAILY_LOG daily
- I'll spot conflicts
- I'll prioritize next tasks
- I'll update sprint-plan.md

---

## 🚀 Advanced: Multi-Agent Collaboration

### Scenario: "Build User Profile Screen"

**Step 1: Plan (with PM - me)**
```
You → Me: "Build user profile screen with edit capability"
Me → Creates task breakdown in sprint-plan.md
```

**Step 2: Design (UI Designer)**
```bash
# UI Designer Claude Code
"Build profile screen. Follow design-tokens.json. Mock API calls."
```

**Step 3: Backend (Backend Engineer)**
```bash
# Backend Claude Code
"Build /user/:id GET and PATCH endpoints. Follow backend-specs.md."
```

**Step 4: Integration (UI Designer)**
```bash
# UI Designer returns
"Replace mock API with real backend endpoints from backend-specs.md"
```

**Step 5: Test (QA)**
```bash
# QA Claude Code
"Test profile screen: happy path, error cases, edge cases. Update qa-checklist.md"
```

**Step 6: Review (PM - me)**
```
You upload DAILY_LOG.md
Me: Verifies completion, identifies improvements, plans next sprint
```

---

## 📱 iOS-Specific Considerations

### Design Inspiration Sources
1. **Apple's HIG**: https://developer.apple.com/design/human-interface-guidelines/
2. **iOS Apps to Study**:
   - Apollo (Reddit client) - information density
   - Things 3 - minimal, functional beauty
   - Notion - modern, clean
   - Superhuman - gesture-driven
   - Linear - speed and polish

### Tell UI Designer:
```
"Reference [App Name]'s approach to [feature]. 
Key elements: 
- Navigation style
- Card design
- Color usage
- Typography
- Animations"
```

---

## 🎬 Getting Started (First Day)

### Option A: Start with Design
```
Day 1:
1. You → Me: "I want to build [app description]. UI like [reference]"
2. Me → Creates design-brief.md with vision
3. UI Designer → Creates design system and first screens
4. Me → Reviews and plans backend needs
```

### Option B: Start with Backend
```
Day 1:
1. You → Me: "I need these APIs: [list]"
2. Me → Creates backend-specs.md
3. Backend Engineer → Builds API structure
4. UI Designer → Creates screens that consume APIs
```

---

## 💡 Is This Doable? ABSOLUTELY.

### What Makes This Work:

✅ **Single DAILY_LOG.md** - All agents append to one file  
✅ **Context files** - Each agent knows their role  
✅ **PM coordination** - I (Claude in claude.ai) orchestrate  
✅ **Git branches** - Agents work in parallel without conflicts  
✅ **Clear handoffs** - Backend specs → UI implementation → QA validation  

### Potential Challenges:

⚠️ **File conflicts** - Mitigated by branches and clear ownership  
⚠️ **Context limits** - Keep logs focused, archive old sprints  
⚠️ **Agent "memory"** - Must re-read context each session (which is fine!)  

---

## 🎯 Your Next Steps

1. **Define Your Vision**: Tell me about the app you want to build
2. **Share UI Inspiration**: Send screenshots/references of the design style
3. **Choose Tech Stack**: iOS (SwiftUI/UIKit) + Backend (Node/Python/etc)
4. **I'll Create**: Full design brief + initial sprint plan
5. **You Setup**: Project structure with .ai-team folder
6. **We Build**: You coordinate with me, agents execute

---

## 📦 Version Control & Backup Strategy

### Why This Matters
Before making significant architectural changes (database migrations, auth system changes, major refactors), **always create a versioned backup**. This protects your working code and allows easy rollback.

### Git Setup (Required)

**Step 1: Initialize Git Repository**
```bash
cd my-ios-app
git init
git branch -M main
```

**Step 2: Create .gitignore**
```gitignore
# Dependencies
node_modules/
Pods/
.build/

# Environment
.env
.env.local
*.local

# IDE
.idea/
*.xcworkspace
xcuserdata/

# Build outputs
build/
DerivedData/
*.ipa

# Secrets (NEVER commit these)
*.p8
*.p12
*.mobileprovision
GoogleService-Info.plist
firebase-credentials.json
```

**Step 3: First Commit**
```bash
git add -A
git commit -m "v1.0.0: Initial version - [describe current state]"
git tag -a v1.0.0 -m "Version 1.0.0: [description]"
```

**Step 4: Push to Remote**
```bash
git remote add origin https://github.com/[username]/[repo].git
git push -u origin main --tags
```

### Versioning Strategy (Semantic Versioning)

Use **MAJOR.MINOR.PATCH** format:

| Version | When to Use | Example |
|---------|-------------|---------|
| **MAJOR** (X.0.0) | Breaking changes, architecture overhauls | `v2.0.0: Migrated to Prisma + Clerk` |
| **MINOR** (1.X.0) | New features, backward compatible | `v1.1.0: Added group flows feature` |
| **PATCH** (1.0.X) | Bug fixes, small improvements | `v1.0.1: Fixed auth token refresh` |

### Pre-Major-Change Checklist

Before starting a major sprint (database migration, auth change, etc.):

1. **Create Local Backup**
   ```bash
   # Copy entire project to parent folder with version label
   cp -R /path/to/project /path/to/project-v1-pre-[change-name]
   ```

2. **Commit Current State**
   ```bash
   git add -A
   git commit -m "v[X.Y.Z]: Pre-[change] snapshot - [current state description]"
   git tag -a v[X.Y.Z] -m "Snapshot before [change]"
   ```

3. **Push to Remote**
   ```bash
   git push origin main --tags
   ```

4. **Document in DAILY_LOG.md**
   ```markdown
   ### Version Checkpoint
   - **Version**: v1.0.0
   - **Date**: [date]
   - **State**: Pre-Prisma/Clerk migration
   - **Backup Location**: /parent/folder/project-v1-pre-prisma-clerk
   - **GitHub Tag**: v1.0.0
   ```

### Branch Strategy for Major Changes

```bash
# Create feature branch for major work
git checkout -b feature/prisma-clerk-migration

# Work on the feature...
# Make commits along the way...

# When complete, merge back
git checkout main
git merge feature/prisma-clerk-migration
git tag -a v2.0.0 -m "Version 2.0.0: Prisma + Clerk Migration"
git push origin main --tags
```

### Rollback Procedure

If something goes wrong:

**Option 1: Git Rollback**
```bash
# View tags
git tag -l

# Checkout previous version
git checkout v1.0.0

# Create branch from that point if needed
git checkout -b rollback/v1.0.0
```

**Option 2: Local Backup**
```bash
# If git is corrupted or unavailable
cp -R /path/to/project-v1-pre-change /path/to/project
```

### Version History Template

Create `.ai-team/VERSION_HISTORY.md`:

```markdown
# Version History

## v2.0.0 (In Progress)
- **Status**: Sprint 5 - Prisma + Clerk Migration
- **Changes**:
  - Database: Firestore → Prisma/PlanetScale
  - Auth: iCloud → Clerk
  - Subscriptions linked to Clerk IDs

## v1.0.0 (December 29, 2024)
- **Tag**: v1.0.0
- **Backup**: litplanAI-v1-pre-prisma-clerk
- **State**: Firebase/Firestore implementation complete
- **Features**:
  - iOS app with SwiftUI
  - Firebase Cloud Functions backend
  - StoreKit 2 subscriptions
  - Sign in with Apple auth
```

### Golden Rules

1. **Never delete backups** until new version is stable in production
2. **Always tag releases** before major changes
3. **Document version state** in DAILY_LOG.md and VERSION_HISTORY.md
4. **Test rollback procedure** before starting major migrations
5. **Keep at least 2 versions** of local backups (current - 1, current - 2)

---

## 🔥 Ready to Start?

Tell me:
1. **What's the app?** (e.g., "fitness tracker", "recipe organizer")
2. **What's the vibe?** (e.g., "minimal like Things 3", "bold like Superhuman")
3. **What's the first feature?** (e.g., "user auth and onboarding")

I'll create your first sprint plan and get your AI team rolling! 🚀
