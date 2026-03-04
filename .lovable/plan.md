

## Registration System for PACFU Portal

This plan adds a public registration form on the login page, a new admin page to manage registrations, and automated credential emailing upon approval.

---

### What Gets Built

**1. Registration Form (on the Login page)**
- A "Register" tab/button alongside the existing login form
- Fields: Full Name, Department, Address, Purpose of Joining
- Payment section displaying:
  - Registration fee: 500 pesos
  - GCash: 09123456789
  - PayMaya: 09123456789
  - GrabPay: 09123456789
  - Message: "Please transfer to this account"
- File input to upload payment receipt (image)
- Submit button stores the registration in Firestore collection `registrations`
- Receipt file stored in a new Lovable Cloud storage bucket `registrations`

**2. Admin Registration Management Page (`/registrations`)**
- New sidebar link (admin-only): "Registrations"
- Table listing all pending/approved/rejected registrations
- Each row shows: name, email, department, address, purpose, receipt preview, status
- Admin actions:
  - "Approve" button -- marks registration as approved
  - "Create Account" button (appears after approval) -- opens a dialog similar to the existing Create Faculty dialog where the admin sets email and password
  - "Reject" button
- When admin creates the account, the system:
  - Creates a Firebase Auth account (same flow as existing faculty creation)
  - Creates the Firestore user document
  - Updates the registration status to "completed"

**3. Email Credentials to New User**
- After account creation, a new edge function `send-credentials-email` sends the user their login credentials (email + password) via Resend
- Uses the same email styling as existing PACFU emails

**4. Build Error Fixes**
- Fix `send-login-code/index.ts`: Add a `deno.json` file with `resend` import mapping (same as `send-announcement-email`)
- Fix `delete-firebase-user/index.ts`: Cast `error` to `any` on line 117 to resolve the `TS18046` type error

---

### Technical Details

**New Files:**
- `src/pages/Registrations.tsx` -- Admin page for managing registrations
- `src/services/registrationService.ts` -- Firestore CRUD for registrations collection
- `src/types/registration.ts` -- TypeScript types
- `src/components/registrations/CreateAccountDialog.tsx` -- Dialog for admin to create account from approved registration
- `supabase/functions/send-credentials-email/index.ts` -- Edge function to email credentials
- `supabase/functions/send-login-code/deno.json` -- Fix the Resend import

**Modified Files:**
- `src/pages/Login.tsx` -- Add registration form tab
- `src/components/layout/Sidebar.tsx` -- Add "Registrations" nav item (admin-only)
- `src/App.tsx` -- Add `/registrations` route
- `supabase/config.toml` -- Register `send-credentials-email` function
- `supabase/functions/delete-firebase-user/index.ts` -- Fix TypeScript error on line 117

**Firestore Collection: `registrations`**
```text
{
  id: string (auto)
  fullName: string
  department: string
  address: string
  purpose: string
  receiptUrl: string (storage URL)
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  createdAt: timestamp
  approvedAt?: timestamp
  approvedBy?: string
  accountEmail?: string (set after account creation)
}
```

**Storage:** Receipt files uploaded to Lovable Cloud `registrations` bucket (public, for admin preview).

**Edge Function `send-credentials-email`:** Uses the existing `RESEND_API_KEY` secret to send a styled email containing the new user's email and password.

