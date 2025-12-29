# Litplan AI Team Coordination Folder

## Welcome to the Litplan AI Development Team!

This folder contains all the coordination documents for building Litplan using the agentic AI workflow. Think of this as Mission Control for your AI development team.

---

## Quick Start Guide

### For the Product Manager (You - Human)

1. **Read this README** to understand the workflow
2. **Review sprint-plan.md** to see the 4-week roadmap
3. **Check DAILY_LOG.md** each evening to see what your team accomplished
4. **Review design-brief.md** and **backend-specs.md** to understand the full vision

### For Each AI Agent (Claude Code in Warp)

When you start a new terminal session:
1. **Read your context file** first:
   - UI Designer → `UI_DESIGNER_CONTEXT.md`
   - Backend Engineer → `BACKEND_ENGINEER_CONTEXT.md`
   - QA Tester → `QA_TESTER_CONTEXT.md`
2. **Check sprint-plan.md** for your current day's tasks
3. **Read DAILY_LOG.md** to see what other agents have done
4. **Execute your tasks** for the day
5. **Update DAILY_LOG.md** with your progress before ending the session

---

## File Structure

```
.ai-team/
├── README.md                       # You are here
├── design-brief.md                 # Complete UI/UX specifications
├── backend-specs.md                # API contracts and data models
├── sprint-plan.md                  # 4-week development roadmap
├── DAILY_LOG.md                    # Daily progress tracking (CRITICAL!)
├── qa-checklist.md                 # Comprehensive testing checklist
├── ui-decisions.md                 # UI design decisions log
├── UI_DESIGNER_CONTEXT.md          # UI Designer agent context
├── BACKEND_ENGINEER_CONTEXT.md     # Backend Engineer agent context
└── QA_TESTER_CONTEXT.md            # QA Tester agent context
```

---

## Key Documents Explained

### 1. design-brief.md (74KB)
**Purpose**: Complete UI/UX specification for Litplan
**Audience**: UI Designer (primary), all agents (reference)
**Contains**:
- Color scheme analysis & recommendation (Electric Cyan theme)
- Screen-by-screen specifications (Home, Search, City Details, etc.)
- Component library (buttons, cards, tabs)
- Typography, spacing, animations
- Accessibility requirements
- Design inspiration (screenshots 1-4)

**When to Use**:
- UI Designer: Read before starting design work
- Backend Engineer: Reference for data structure display
- QA Tester: Validate UI against this spec

---

### 2. backend-specs.md (50KB)
**Purpose**: Complete backend architecture and API contracts
**Audience**: Backend Engineer (primary), UI Designer (for integration)
**Contains**:
- Tech stack (Firebase, Firestore, Cloud Functions)
- Data models (Users, Cities, Plans, Group Flows)
- 15+ API endpoints with request/response formats
- Authentication & subscription logic
- Scheduled Cloud Functions (weekly AI refresh)
- Security rules and performance optimization

**When to Use**:
- Backend Engineer: Your bible for implementation
- UI Designer: Reference for API data structures
- QA Tester: Test APIs against this spec

---

### 3. sprint-plan.md (60KB)
**Purpose**: 4-week development roadmap with daily tasks
**Audience**: All agents + PM
**Contains**:
- Sprint 1 (Week 1): Foundation & Core Setup
- Sprint 2 (Week 2): City Details & User Features
- Sprint 3 (Week 3): Paywall, Subscriptions & Polish
- Sprint 4 (Week 4): AI Jobs, Testing & Launch Prep
- Daily task breakdowns for each agent
- Sprint review checkpoints

**When to Use**:
- All agents: Check every morning for daily tasks
- PM: Track overall progress

---

### 4. DAILY_LOG.md (CRITICAL!)
**Purpose**: Single source of truth for team coordination
**Audience**: All agents + PM
**Contains**:
- Daily updates from each agent (UI, Backend, QA, PM)
- Tasks completed, files modified, decisions made
- Blockers and notes
- Sprint summaries

**When to Use**:
- All agents: Update at END of each work session
- PM: Review daily to coordinate team

**How It Works**:
Each agent appends to their section daily:
```markdown
### Day 1 - Monday, [DATE]

#### 🎨 UI Designer
**Tasks Completed:**
- Created design-tokens.json
- Set up Xcode project

**Files Modified:**
- Created: ios-app/Litplan.xcodeproj
- Created: .ai-team/design-tokens.json

**Decisions Made:**
- Used Electric Cyan (#00D9FF) as accent

**Blockers:**
- None
```

---

### 5. qa-checklist.md (80KB!)
**Purpose**: Comprehensive testing checklist for launch approval
**Audience**: QA Tester (primary), all agents (for self-testing)
**Contains**:
- 300+ test cases across 15 categories
- Authentication, UI, Backend APIs, Performance, Accessibility
- Subscription flow testing
- Edge cases and error handling
- Launch readiness criteria

**When to Use**:
- QA Tester: Your master testing plan
- All agents: Self-test your work before marking complete
- PM: Final approval checklist

---

### 6. ui-decisions.md
**Purpose**: Log of all UI/UX design decisions and patterns
**Audience**: UI Designer (primary), PM (for review)
**Contains**:
- Design decisions with rationale
- Component patterns
- Deviations from design brief
- Design tech debt

**When to Use**:
- UI Designer: Update when making design choices
- PM: Review to ensure consistency

---

### 7. Context Files (3 files)
**Purpose**: Role-specific instructions for each agent
**Audience**: Each respective agent

**UI_DESIGNER_CONTEXT.md**:
- Your role as iOS UI designer
- Design philosophy and color scheme
- Key screens to build
- Always do / Never do lists

**BACKEND_ENGINEER_CONTEXT.md**:
- Your role as backend engineer
- Tech stack and architecture
- API endpoints to implement
- Security and performance best practices

**QA_TESTER_CONTEXT.md**:
- Your role as QA tester
- Testing philosophy
- Feature testing checklists
- Bug reporting template

---

## The Agentic Workflow Explained

### Roles

1. **You (Human) - Product Manager**
   - Vision holder & final decision maker
   - Coordinate in claude.ai (PM Claude)
   - Review DAILY_LOG.md daily
   - Approve sprint plans

2. **UI Designer - Claude Code (Warp Terminal 1)**
   - Build iOS app UI in SwiftUI
   - Create design system and components
   - Implement animations and interactions

3. **Backend Engineer - Claude Code (Warp Terminal 2)**
   - Build Firebase backend
   - Implement APIs and Cloud Functions
   - Set up authentication and subscriptions

4. **QA Tester - Claude Code (Warp Terminal 3)**
   - Test features as they're built
   - Find bugs and validate quality
   - Ensure launch readiness

---

## Daily Workflow

### Morning (You + PM Claude in claude.ai)
1. You review yesterday's DAILY_LOG.md
2. PM Claude identifies any issues or conflicts
3. PM Claude confirms today's priorities

### Afternoon (3 AI Agents Working)
Each agent in their Warp terminal:
1. Reads their context file
2. Checks sprint-plan.md for today's tasks
3. Reads DAILY_LOG.md to see what others did
4. Executes tasks
5. Updates DAILY_LOG.md with progress

### Evening (You + PM Claude)
1. You upload/paste DAILY_LOG.md to claude.ai
2. PM Claude reviews progress
3. PM Claude identifies blockers
4. PM Claude plans next day

---

## Sprint Cadence

### Week 1 - Foundation
- Day 1: Project setup
- Day 2: Design system & data models
- Day 3: Home screen & Cities API
- Day 4: Card expansion interaction
- Day 5: Search tab & Sprint Review

### Week 2 - City Details
- Day 6: City Details view
- Day 7: Individual Plans list
- Day 8: Group Plans tab
- Day 9: Viewed Cities tab
- Day 10: Profile tab & Sprint Review

### Week 3 - Paywall & Polish
- Day 11: Paywall UI
- Day 12: StoreKit integration
- Day 13: Paywall triggers
- Day 14: Animations & polish
- Day 15: Accessibility & Sprint Review

### Week 4 - Testing & Launch
- Day 16: Weekly AI refresh job
- Day 17: Error handling
- Day 18-19: Full QA & bug fixes
- Day 20: Launch prep & Final Review

---

## Communication Protocol

### Between Agents (via DAILY_LOG.md)
- **UI Designer** logs UI work → Backend Engineer sees what data structures are needed
- **Backend Engineer** logs API changes → UI Designer integrates them
- **QA Tester** logs bugs → Respective agent fixes and re-logs

### Agent to PM (via DAILY_LOG.md)
- Log blockers in your section
- PM reviews daily and provides guidance

### PM to Agents (via sprint-plan.md updates or direct instruction)
- PM updates sprint plan if priorities change
- PM provides decisions in DAILY_LOG.md PM section

---

## Best Practices

### For All Agents
1. ✅ **Read before you code**: Context file + DAILY_LOG.md + sprint-plan.md
2. ✅ **One task at a time**: Focus on today's sprint tasks
3. ✅ **Update the log**: DAILY_LOG.md is sacred - always update it
4. ✅ **Communicate blockers**: Don't stay stuck silently
5. ✅ **Test your work**: Self-test before marking complete
6. ✅ **Follow the specs**: design-brief.md and backend-specs.md are the source of truth

### For UI Designer
- Reference design-brief.md constantly
- Document design decisions in ui-decisions.md
- Create reusable components
- Test on multiple device sizes

### For Backend Engineer
- Follow backend-specs.md API contracts exactly
- Write clean, documented code
- Test endpoints before marking complete
- Update backend-specs.md if you change anything

### For QA Tester
- Use qa-checklist.md as your guide
- Document bugs clearly with repro steps
- Verify fixes before closing bugs
- Advocate for quality

---

## File Ownership

### UI Designer Owns
- ui-decisions.md (update with design choices)
- design-tokens.json (create in Sprint 1)
- All iOS app code

### Backend Engineer Owns
- backend-specs.md (update if APIs change)
- All backend code
- Firestore security rules

### QA Tester Owns
- qa-checklist.md (update with test results)
- Bug tracking sections in DAILY_LOG.md

### All Agents Own
- DAILY_LOG.md (each updates their section)

### PM Owns
- sprint-plan.md (can update if priorities change)
- Final decisions on conflicts

---

## Git Workflow (Recommended)

### Branch Strategy
- `main` branch: Stable code
- `ui/feature-name` branches: UI Designer work
- `backend/feature-name` branches: Backend Engineer work
- `qa/testing` branch: QA testing

### Workflow
1. Each agent works in their branch
2. Commit frequently with clear messages
3. Merge to `main` when feature complete + tested
4. DAILY_LOG.md stays in `main` (all agents update directly)

---

## Troubleshooting

### "I don't know what to work on"
→ Check sprint-plan.md for today's tasks

### "I'm blocked by another agent's work"
→ Log blocker in DAILY_LOG.md, PM will coordinate

### "The spec is unclear"
→ Log question in DAILY_LOG.md, PM will clarify

### "I found a bug in someone else's work"
→ QA Tester logs in qa-checklist.md + DAILY_LOG.md

### "I need to change the API/design"
→ Log proposed change in DAILY_LOG.md, wait for PM approval

---

## Success Metrics

### Sprint Success
- ✅ All planned features completed
- ✅ No critical bugs
- ✅ All agents updated DAILY_LOG.md
- ✅ PM approves sprint in review

### Launch Success
- ✅ All qa-checklist.md tests passing
- ✅ Performance targets met (< 2s launch, 60fps)
- ✅ Subscription flow working end-to-end
- ✅ All agents sign off
- ✅ PM approves for App Store submission

---

## FAQ

**Q: What if an agent finishes their tasks early?**
A: Check sprint-plan.md for next day's tasks or help other agents (test, review code, etc.)

**Q: What if we fall behind schedule?**
A: Log in DAILY_LOG.md, PM will adjust sprint-plan.md priorities

**Q: Can we change the design/backend specs?**
A: Yes, but log the change and get PM approval first

**Q: How do agents communicate in real-time?**
A: They don't - DAILY_LOG.md is async. This is by design to keep context clear.

**Q: What if two agents conflict (e.g., UI built, but API not ready)?**
A: Use mock data/endpoints temporarily, note in DAILY_LOG.md

---

## Quick Command Reference

### Starting a Work Session (Any Agent)
```bash
# In Warp terminal
cd /path/to/litplanAI
claude

# First message to Claude Code:
"You are the [UI Designer / Backend Engineer / QA Tester].
Read .ai-team/[YOUR_ROLE]_CONTEXT.md and .ai-team/DAILY_LOG.md.
Today is Sprint [X], Day [Y]. Check .ai-team/sprint-plan.md for today's tasks.
Let's get started."
```

### Ending a Work Session
```
"Update .ai-team/DAILY_LOG.md with my completed tasks, files modified, and any blockers under the [UI Designer / Backend Engineer / QA Tester] section for today."
```

### PM Review (claude.ai)
```
Upload DAILY_LOG.md and say:
"Review today's progress from all agents. Identify any blockers, conflicts, or issues. What should we prioritize tomorrow?"
```

---

## Launch Checklist

When Sprint 4 completes:
- [ ] All qa-checklist.md tests passing
- [ ] All agents have updated DAILY_LOG.md
- [ ] Backend deployed to production
- [ ] iOS app submitted to App Store
- [ ] Privacy policy and terms live
- [ ] Monitoring and alerts configured
- [ ] Celebration!

---

## Support & Feedback

- **Issues**: Document in DAILY_LOG.md
- **Bugs**: QA Tester logs in qa-checklist.md
- **Questions**: PM (claude.ai) provides guidance
- **Ideas**: Log in ui-decisions.md or DAILY_LOG.md notes

---

**Ready to build something amazing?**

1. UI Designer → Read `UI_DESIGNER_CONTEXT.md`
2. Backend Engineer → Read `BACKEND_ENGINEER_CONTEXT.md`
3. QA Tester → Read `QA_TESTER_CONTEXT.md`
4. Everyone → Check `sprint-plan.md` for Day 1 tasks
5. GO BUILD! 🚀

---

**Last Updated**: January 2025
**Team**: UI Designer, Backend Engineer, QA Tester, Product Manager (You!)
**Project**: Litplan - Premium Nightlife Discovery App
**Timeline**: 4 Weeks (20 Working Days)
**Status**: Ready to Start Sprint 1 🟢
