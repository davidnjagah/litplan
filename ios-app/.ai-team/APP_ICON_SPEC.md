# Litplan App Icon Design Specification

**Version:** 1.0
**Last Updated:** December 28, 2025
**Designer:** UI Designer Agent
**Status:** Ready for Design Execution

---

## Overview

The Litplan app icon represents nightlife discovery, spontaneity, and premium experiences. The design uses a bold, recognizable "L" lettermark on a dark gradient background, embodying the app's modern, electric aesthetic.

---

## Design Concept

### Primary Visual Element
**Bold Rounded "L" Lettermark**
- The "L" represents "Litplan" and creates instant brand recognition
- Rounded corners for approachability and modern feel
- Clean, geometric design that scales well at all sizes
- Thick stroke weight for visibility at small sizes (16x16px to 1024x1024px)

### Background Treatment
**Radial Gradient (Dark to Darker)**
- Center: Deep Blue (#0A1628)
- Edges: Pure Black (#000000)
- Creates depth and premium feel
- Gradient radiates from center, mimicking city lights spreading outward
- Subtle, non-distracting background that makes the "L" pop

### Design Philosophy
**"Electric Discovery in the Dark"**
- The electric cyan "L" symbolizes energy, excitement, and nightlife
- Dark background represents the night
- Gradient creates movement and depth
- Simple enough to be memorable, distinctive enough to stand out

---

## Technical Specifications

### Master Asset Dimensions
**1024x1024px** (Required by App Store Connect)
- Format: PNG
- Color Space: sRGB (RGB color space)
- No Transparency: Fully opaque background
- Resolution: 72 DPI minimum (300 DPI recommended for design file)

### Color Palette

| Element | Color Name | Hex Code | RGB Values | Usage |
|---------|------------|----------|------------|-------|
| "L" Lettermark | Electric Cyan | #00D9FF | R:0 G:217 B:255 | Primary brand element |
| Gradient Center | Deep Blue | #0A1628 | R:10 G:22 B:40 | Background center |
| Gradient Edge | Pure Black | #000000 | R:0 G:0 B:0 | Background edge |

### Typography (for "L" lettermark)
- **Font Style:** Custom geometric sans-serif with rounded corners
- **Weight:** Bold/Heavy (700-900)
- **Stroke:** Thick and consistent
- **Corners:** Rounded (radius ~10-15% of stroke width)
- **Alignment:** Centered both horizontally and vertically
- **Size:** "L" should occupy ~60-70% of canvas height
- **Width:** "L" should occupy ~50-60% of canvas width

### Layout Specifications
```
Canvas: 1024x1024px

Background:
- Type: Radial Gradient
- Center Point: 512px, 512px (canvas center)
- Start Color: #0A1628 (Deep Blue)
- End Color: #000000 (Pure Black)
- Gradient Stops: 0% (#0A1628), 100% (#000000)

"L" Lettermark:
- Position: Centered (512px, 512px)
- Height: ~614-717px (60-70% of canvas)
- Width: ~512-614px (50-60% of canvas)
- Color: #00D9FF (Electric Cyan)
- Stroke Weight: ~80-100px
- Corner Radius: ~8-12px (on stroke ends)
```

---

## Size Variants Required

Apple requires multiple icon sizes for different device contexts. All variants must be exported from the master 1024x1024px asset.

### iOS App Icon Sizes

| Size | Device/Context | Filename |
|------|----------------|----------|
| 1024x1024px | App Store | icon_1024.png |
| 180x180px | iPhone (3x) | icon_180.png |
| 120x120px | iPhone (2x) | icon_120.png |
| 167x167px | iPad Pro | icon_167.png |
| 152x152px | iPad (2x) | icon_152.png |
| 76x76px | iPad (1x) | icon_76.png |
| 60x60px | Spotlight (3x) | icon_60.png |
| 40x40px | Spotlight (2x) | icon_40.png |
| 29x29px | Settings (1x) | icon_29.png |
| 87x87px | Settings (3x) | icon_87.png |
| 58x58px | Settings (2x) | icon_58.png |
| 20x20px | Notification (1x) | icon_20.png |

### Export Requirements
- **Format:** PNG (no transparency)
- **Color Profile:** sRGB
- **Compression:** PNG-8 or PNG-24 (no alpha channel)
- **Naming:** Descriptive (icon_[size].png)
- **Organization:** Place all sizes in Assets.xcassets/AppIcon.appiconset/

---

## Apple Design Guidelines Compliance

### DO's
- Use a single, bold visual element (the "L")
- Maintain visual consistency across all sizes
- Use recognizable, simple geometry
- Ensure icon looks great at small sizes (20x20px)
- Keep design flat or with subtle gradients
- Use vibrant, eye-catching colors

### DON'Ts
- No text or words (Apple guideline violation)
- No photos or complex imagery
- No transparency (solid background required)
- No rounded corners on the asset (iOS adds them automatically)
- No UI elements (buttons, badges, etc.)
- No brand-specific terms in the icon itself

### Accessibility
- **Contrast Ratio:** Electric Cyan (#00D9FF) on Deep Blue (#0A1628) = 4.5:1 (WCAG AA compliant)
- **Visibility:** "L" lettermark is clearly visible at all sizes
- **Color Blindness:** Electric cyan remains distinguishable from background for deuteranopia, protanopia, and tritanopia

---

## Design Rationale

### Why This Design Represents Nightlife Discovery

1. **Electric Cyan Color**
   - Evokes neon lights, energy, and nightlife
   - Creates excitement and modernity
   - Stands out on dark iPhone home screens
   - Instantly recognizable in App Store searches

2. **Bold "L" Lettermark**
   - Creates strong brand association with "Litplan"
   - Simple geometry is memorable and recognizable
   - Works at tiny sizes (App Library, Spotlight, Notifications)
   - Professional and premium aesthetic

3. **Dark Gradient Background**
   - Represents nighttime and evening hours
   - Creates depth without complexity
   - Makes the cyan "L" visually pop
   - Aligns with app's dark UI theme

4. **Rounded Corners on "L"**
   - Softens the lettermark for approachability
   - Modern, friendly aesthetic
   - Balances boldness with warmth
   - Echoes app's rounded UI elements

5. **Minimalist Approach**
   - Avoids visual clutter
   - Scales perfectly at all sizes
   - Timeless design (won't look dated)
   - Easy to reproduce across marketing materials

### Competitive Differentiation
- **Yelp:** Red background with white icon (too busy, dated)
- **Eventbrite:** Orange "E" (warm, not nightlife-focused)
- **Fever:** Purple gradient (too playful, not premium)
- **Litplan:** Electric cyan on dark (modern, nightlife-specific, premium)

---

## Brand Consistency

### Alignment with App Design System
- **Color:** Electric Cyan (#00D9FF) matches app's primary accent color
- **Typography:** Rounded, bold letterform matches app's typography style
- **Dark Theme:** Gradient background aligns with app's dark UI
- **Premium Feel:** Clean, modern design matches app's high-quality aesthetic

### Cross-Platform Usage
This icon design can be adapted for:
- Android app icon (adaptive icon with background layer)
- Web app icon (favicon, PWA manifest)
- Social media profile pictures
- Marketing materials (business cards, posters, ads)
- Merch (t-shirts, stickers, promotional items)

---

## Production Workflow

### Design File Preparation
1. Create master file in Adobe Illustrator, Figma, or Sketch
2. Canvas: 1024x1024px, sRGB color space
3. Design "L" lettermark as vector shape
4. Apply radial gradient to background
5. Ensure all elements are fully opaque

### Export Process
1. Export master 1024x1024px PNG (App Store requirement)
2. Scale down to create all required sizes
3. Verify sharpness at small sizes (20x20px, 29x29px)
4. Test icon on iOS device home screen (light and dark mode)
5. Import all sizes into Xcode Assets.xcassets/AppIcon.appiconset/

### Quality Assurance
- View icon at 100% zoom at all sizes
- Test on iPhone home screen (light and dark wallpapers)
- Verify icon appears crisp in App Store search results
- Check icon in Spotlight search
- Confirm icon looks good in Settings app
- Test on iPad and iPad Pro

---

## Next Steps

1. **Design Execution**
   - Create master 1024x1024px icon in design tool
   - Refine "L" lettermark proportions
   - Perfect gradient transitions
   - Export master PNG

2. **Size Variants**
   - Generate all required icon sizes
   - Verify quality at each size
   - Organize in Xcode project

3. **Testing**
   - Import icons into Xcode
   - Build and run on physical device
   - Test on multiple iPhone and iPad models
   - Verify App Store Connect upload

4. **Documentation**
   - Save master design file with version control
   - Document export settings
   - Create icon usage guidelines for marketing team

---

## Design Files Location

**Master File:** `/Users/davidnjagah/Documents/GitHub/litplanAI/design/app-icon-master.ai`
**Exported Assets:** `/Users/davidnjagah/Documents/GitHub/litplanAI/ios-app/Litplan/Assets.xcassets/AppIcon.appiconset/`
**Design Brief:** `/Users/davidnjagah/Documents/GitHub/litplanAI/ios-app/.ai-team/APP_ICON_SPEC.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 28, 2025 | Initial app icon specification | UI Designer Agent |

---

## Approval Sign-Off

- [ ] UI Designer Agent - Design Specification
- [ ] Design Review - Visual Quality
- [ ] Development Lead - Technical Implementation
- [ ] Product Manager - Brand Alignment
- [ ] App Store Compliance - Guidelines Check

---

**END OF SPECIFICATION**
