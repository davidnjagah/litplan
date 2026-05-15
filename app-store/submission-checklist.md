# LitPlanz App Store Submission Checklist — v1.9

## Version Info
- Marketing version: 1.9
- Build number: 5
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
   Apps → LitPlanz → press + next to the version list → enter 1.9

7. **Paste "What's New" text**
   Use the text in `whats-new.md`

8. **Select the processed build**
   Scroll down to the Build section → + → select build 5

9. **Update app description**
   Use the text in `description.md` (no changes needed for this release)

10. **Upload screenshots**
    - Required size: 1284 × 2778 px (6.5") or 1290 × 2796 px (6.7")
    - Current screenshots in `new screenshots/` are 1320 × 2868 — resize to 1284 × 2778 before uploading if App Store Connect rejects them
    - Format: PNG, no alpha channel (convert to JPEG via `sips -s format jpeg` if rejected for transparency)

11. **Check all metadata**
    - Screenshots accurate
    - Age rating unchanged
    - Pricing unchanged
    - Keywords up to date

12. **Submit for Review**
    Click "Submit for App Review" → confirm
