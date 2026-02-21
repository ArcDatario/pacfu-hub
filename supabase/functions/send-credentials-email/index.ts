import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, password } = await req.json();

    if (!email || !name || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const resend = new Resend(resendApiKey);
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f0fdf4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0fdf4;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%);padding:40px 48px;border-radius:16px 16px 0 0;">
          <span style="display:inline-block;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:1px;">🎉 Welcome to PACFU</span>
          <h1 style="margin:16px 0 0;color:#fff;font-size:28px;font-weight:700;">Your Account is Ready!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Pampanga State Agricultural University</p>
        </td></tr>
        <tr><td style="background-color:#fff;padding:48px;">
          <p style="margin:0 0 24px;color:#374151;font-size:16px;">Dear <strong style="color:#059669;">${name}</strong>,</p>
          <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">Your PACFU Portal account has been created and approved. Below are your login credentials:</p>
          <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:12px;padding:24px;margin-bottom:32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;">Email</td></tr>
              <tr><td style="padding:0 0 16px;color:#111827;font-size:16px;font-weight:600;">${email}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;">Password</td></tr>
              <tr><td style="padding:0;color:#111827;font-size:16px;font-weight:600;font-family:monospace;background:#ecfdf5;padding:8px 12px;border-radius:6px;">${password}</td></tr>
            </table>
          </div>
          <p style="margin:0 0 32px;color:#dc2626;font-size:13px;">⚠️ Please change your password after your first login for security purposes.</p>
          <table role="presentation" width="100%"><tr><td align="center">
            <a href="https://psau-portal.lovable.app/login" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:16px 40px;border-radius:8px;box-shadow:0 4px 14px rgba(16,185,129,0.35);">Login to PACFU Portal →</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background-color:#065f46;padding:32px 48px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 8px;color:rgba(255,255,255,0.9);font-size:13px;font-weight:500;text-align:center;">PACFU Portal — Faculty Communication Hub</p>
          <p style="margin:0 0 16px;color:rgba(255,255,255,0.6);font-size:12px;text-align:center;">This is an automated notification. Please do not reply to this email.</p>
          <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;text-align:center;">© ${currentYear} Pampanga State Agricultural University. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const emailResponse = await resend.emails.send({
      from: 'PACFU Portal <no-reply@ccs-ojt.online>',
      to: [email],
      subject: '🎉 Your PACFU Portal Account Credentials',
      html,
    });

    console.log('Credentials email sent:', emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error sending credentials email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
