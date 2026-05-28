-- ════════════════════════════════════════════════════════════════════════════
-- AppVersionConfig — drives the in-app "Update Available" prompt
-- ════════════════════════════════════════════════════════════════════════════
-- Single-row config table read by the /health edge function and consumed by the
-- iOS AppUpdateManager on launch. Lets us bump the prompt-target version (or
-- mark a release critical / publish release notes) without redeploying any code.
-- Applied live via the Management API per the project sync rule.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public."AppVersionConfig" (
  id                  text         PRIMARY KEY DEFAULT 'app',
  "latestAppVersion"  text         NOT NULL,                  -- newest version users should be on (drives the soft prompt)
  "minimumAppVersion" text         NOT NULL,                  -- below this, the app hard-blocks the user to update
  "criticalUpdate"    boolean      NOT NULL DEFAULT false,    -- if true, the soft prompt is upgraded to non-dismissible
  "releaseNotes"      text,                                   -- short "What's new" copy shown in the dialog
  "updatedAt"         timestamptz  NOT NULL DEFAULT now()
);

INSERT INTO public."AppVersionConfig" (id, "latestAppVersion", "minimumAppVersion", "criticalUpdate", "releaseNotes")
VALUES ('app', '2.1', '1.0', false, NULL)
ON CONFLICT (id) DO NOTHING;
