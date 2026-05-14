# 3D Parallax Card Configuration

Reference for tuning the gyroscope-based parallax effect on the Bolt card.
Lives in `ios-app/Litplan/Utilities/MotionManager.swift`.

| Parameter | Value | Effect |
|-----------|-------|--------|
| `maxRotation` | `12.0°` | Max tilt angle of the card |
| `referencePitch` | `0.0 rad` (0°) | "Neutral" holding angle — card appears flat when phone is on a flat surface |
| `sensitivity` | `4.0` | How reactive the tilt is to movement |
| `deadzone` | `0.08 rad` (~4.5°) | Small movements ignored to prevent jitter |
| `smoothingFactor` | `0.15` | Higher = smoother but slower response |
| `invertRotation` | `true` | Left/right roll inverted; pitch follows phone direction |
| `perspective` | `0.5` | Depth of the 3D perspective distortion |

## Common Adjustments

- **Less tilt**: lower `maxRotation` (e.g., `8.0`)
- **More dramatic**: raise `maxRotation` (e.g., `20.0`)
- **Different neutral angle**: change `referencePitch` (e.g., `0.698` = 40°, `0.785` = 45°, `0.873` = 50°)
- **More/less reactive**: adjust `sensitivity`
- **Smoother**: raise `smoothingFactor` toward `1.0`; more immediate: lower it toward `0.0`
