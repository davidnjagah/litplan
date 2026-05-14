# LitPlanz App Store Submission Checklist — v1.4

## Version Info
- Marketing version: 1.4
- Build number: 2
- Bundle ID: com.litplanz.app

---

## Steps

1. **Clean build folder**
   Xcode → Product → Clean Build Folder (⇧⌘K)

2. **Set scheme to Release**
   Scheme selector (top bar) → set device to "Any iOS Device (arm64)" → confirm configuration is Release

3. **Archive**
   Product → Archive
   Wait 3–5 minutes for the build to complete

4. **Distribute via Organizer**
   Window → Organizer → select the new archive → Distribute App
   → App Store Connect → Upload → proceed through all screens → Upload

5. **Wait for processing**
   Apple takes 15–30 minutes. You'll receive an email when the build is ready.

6. **Create new version in App Store Connect**
   Apps → LitPlanz → press + next to the version list → enter 1.4

7. **Paste "What's New" text**
   Use the text in `whats-new.md`

8. **Select the processed build**
   Scroll down to the Build section → + → select build 2

9. **Update app description**
   Use the text in `description.md`

10. **Check all metadata**
    - Screenshots still accurate
    - Age rating unchanged
    - Pricing unchanged
    - Keywords up to date

11. **Submit for Review**
    Click "Submit for App Review" → confirm
