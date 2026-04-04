# Supabase Auth — Email Branding & Configuration Guide

> **When to apply**: After Track 3 code changes are merged and deployed.
> **Where**: Supabase Dashboard → https://supabase.com/dashboard/project/axasujjoywqadzuisvaj
> **Time**: ~15 minutes

---

## Step 1: Set Site URL

**Dashboard path**: Authentication → URL Configuration

Set the **Site URL** to your production domain:
```
https://terrainforge-staging.netlify.app
```
(Update this to your custom domain later, e.g., `https://app.terrainforge.com`)

---

## Step 2: Add Redirect URLs

**Dashboard path**: Authentication → URL Configuration → Redirect URLs

Add ALL of these (one per line):
```
https://terrainforge-staging.netlify.app/auth/callback
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
```

---

## Step 3: Customize Email Templates

**Dashboard path**: Authentication → Email Templates

### 3a. Confirm Signup
**Subject**: `Welcome to TerrainForge — Verify your email`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F7;padding:40px 0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E7E5E4;overflow:hidden;">
      <tr><td style="background-color:#2D6A4F;padding:32px 40px;text-align:center;">
        <span style="font-size:32px;color:#D4A843;">⬡</span>
        <span style="font-size:24px;font-weight:600;color:#FFFFFF;font-family:Georgia,serif;vertical-align:middle;margin-left:8px;">TerrainForge</span>
      </td></tr>
      <tr><td style="padding:40px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">Welcome aboard!</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#57534E;">Thanks for signing up for TerrainForge. Click below to verify your email and activate your account:</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td style="background-color:#2D6A4F;border-radius:9999px;padding:14px 32px;">
            <a href="{{ .ConfirmationURL }}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">Verify Email Address</a>
          </td>
        </tr></table>
        <p style="margin:32px 0 0;font-size:13px;color:#A8A29E;">If you didn't create a TerrainForge account, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #E7E5E4;text-align:center;">
        <p style="margin:0;font-size:12px;color:#A8A29E;">TerrainForge — Project management built for landscaping professionals</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### 3b. Reset Password
**Subject**: `Reset your TerrainForge password`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F7;padding:40px 0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E7E5E4;overflow:hidden;">
      <tr><td style="background-color:#2D6A4F;padding:32px 40px;text-align:center;">
        <span style="font-size:32px;color:#D4A843;">⬡</span>
        <span style="font-size:24px;font-weight:600;color:#FFFFFF;font-family:Georgia,serif;vertical-align:middle;margin-left:8px;">TerrainForge</span>
      </td></tr>
      <tr><td style="padding:40px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">Reset your password</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#57534E;">Click the button below to choose a new password:</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td style="background-color:#2D6A4F;border-radius:9999px;padding:14px 32px;">
            <a href="{{ .ConfirmationURL }}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">Reset Password</a>
          </td>
        </tr></table>
        <p style="margin:32px 0 0;font-size:13px;color:#A8A29E;">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #E7E5E4;text-align:center;">
        <p style="margin:0;font-size:12px;color:#A8A29E;">TerrainForge — Project management built for landscaping professionals</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### 3c. Magic Link
**Subject**: `Your TerrainForge login link`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F7;padding:40px 0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E7E5E4;overflow:hidden;">
      <tr><td style="background-color:#2D6A4F;padding:32px 40px;text-align:center;">
        <span style="font-size:32px;color:#D4A843;">⬡</span>
        <span style="font-size:24px;font-weight:600;color:#FFFFFF;font-family:Georgia,serif;vertical-align:middle;margin-left:8px;">TerrainForge</span>
      </td></tr>
      <tr><td style="padding:40px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">Sign in to TerrainForge</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#57534E;">Click below to sign in. This link is valid for one use only.</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td style="background-color:#2D6A4F;border-radius:9999px;padding:14px 32px;">
            <a href="{{ .ConfirmationURL }}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">Sign In</a>
          </td>
        </tr></table>
        <p style="margin:32px 0 0;font-size:13px;color:#A8A29E;">If you didn't request this link, ignore this email.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #E7E5E4;text-align:center;">
        <p style="margin:0;font-size:12px;color:#A8A29E;">TerrainForge — Project management built for landscaping professionals</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### 3d. Invite User
**Subject**: `You've been invited to TerrainForge`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F7;padding:40px 0;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E7E5E4;overflow:hidden;">
      <tr><td style="background-color:#2D6A4F;padding:32px 40px;text-align:center;">
        <span style="font-size:32px;color:#D4A843;">⬡</span>
        <span style="font-size:24px;font-weight:600;color:#FFFFFF;font-family:Georgia,serif;vertical-align:middle;margin-left:8px;">TerrainForge</span>
      </td></tr>
      <tr><td style="padding:40px;">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">You're invited!</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#57534E;">You've been invited to join a team on TerrainForge. Click below to accept:</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td style="background-color:#2D6A4F;border-radius:9999px;padding:14px 32px;">
            <a href="{{ .ConfirmationURL }}" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">Accept Invitation</a>
          </td>
        </tr></table>
        <p style="margin:32px 0 0;font-size:13px;color:#A8A29E;">If you weren't expecting this, ignore this email.</p>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid #E7E5E4;text-align:center;">
        <p style="margin:0;font-size:12px;color:#A8A29E;">TerrainForge — Project management built for landscaping professionals</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

---

## Step 4: Custom SMTP (Recommended)

**Dashboard path**: Project Settings → Auth → SMTP Settings → Enable Custom SMTP

Supabase built-in SMTP is limited to ~3-4 emails/hour.

### Resend (simplest)
1. Sign up at https://resend.com (free: 100 emails/day)
2. Verify your domain
3. Create API key
4. SMTP settings: Host `smtp.resend.com`, Port `465`, User `resend`, Password = API key
5. Sender: `TerrainForge <noreply@terrainforge.com>`

### SendGrid (alternative)
1. Sign up at https://sendgrid.com (free: 100 emails/day)
2. Verify domain, create API key
3. SMTP settings: Host `smtp.sendgrid.net`, Port `465`, User `apikey`, Password = API key

---

## Step 5: Auth Settings Review

**Dashboard path**: Authentication → Providers → Email

| Setting | Value |
|---------|-------|
| Enable Email Signup | ON |
| Confirm Email | ON |
| Secure Email Change | ON |
| Min password length | 8 |

---

## Verification Checklist

- [ ] Site URL = `https://terrainforge-staging.netlify.app`
- [ ] Redirect URLs include production + localhost
- [ ] All 4 email templates branded
- [ ] Custom SMTP configured (if applicable)
- [ ] Test signup email arrives quickly
- [ ] Verification link → `/auth/callback` → dashboard
- [ ] Reset link → `/auth/callback` → `/reset-password`
