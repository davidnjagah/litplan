# LitPlanz Email Templates

## Supabase Auth Templates

These are triggered automatically by Supabase Auth. Templates live in `backend/supabase/supabase/templates/` and are configured in `backend/supabase/supabase/config.toml`.

| Template file | Subject | Trigger |
|---|---|---|
| `confirmation.html` | "Verify your LitPlanz account" | New user signs up |
| `recovery.html` | "Reset your LitPlanz password" | Forgot password request |
| `invite.html` | "You're invited to LitPlanz" | Admin invites a user |
| `magic_link.html` | "Your LitPlanz login link" | Passwordless sign-in |
| `email_change.html` | "Confirm your new email address" | User changes their email |

> `confirm_signup.html` exists in the templates folder but is not wired up in `config.toml` — it is unused.

**Sent from:** `noreply@litplanz.com`
**Provider:** Resend SMTP (`smtp.resend.com`)
**SMTP config:** Supabase Dashboard → Authentication → SMTP Settings

---

## Transactional Templates (send-notification Edge Function)

These are triggered by app logic and sent via the `send-notification` Supabase Edge Function, which calls the Resend API directly.

| Template key | Subject | Trigger |
|---|---|---|
| `password_reset_success` | "Your LitPlanz password has been updated" | User successfully resets their password (web or iOS) |

**Sent from:** `noreply@litplanz.com`
**Edge function:** `backend/supabase/supabase/functions/send-notification/index.ts`
**Deploy command:**
```bash
npx supabase functions deploy send-notification --project-ref clktdigankjszupvrsqt
```

---

## Password Reset Flow

1. User taps "Forgot Password?" in the app → Supabase sends `recovery.html` email
2. User clicks the link → lands on `https://litplanz.com/auth/confirm`
   - **iOS**: deep-links into the app → resets password in `PasswordResetView`
   - **Desktop/browser**: redirects to `https://litplanz.com/auth/reset-password`
3. User submits new password → password updated
4. `send-notification` edge function fires the `password_reset_success` email

---

## Secrets

| Secret | Location | Used by |
|---|---|---|
| `RESEND_API_KEY` | Supabase Dashboard → Settings → Edge Functions | `send-notification` edge function |
| SMTP password | Supabase Dashboard → Authentication → SMTP Settings | Supabase Auth email sending |

> Both must use the **same Resend API key**. If you rotate the key, update it in both places.
