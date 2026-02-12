import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateEmailHtml = (code: string, name: string): string => {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f0fdf4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); padding: 40px 48px; border-radius: 16px 16px 0 0;">
              <span style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                🔐 Login Verification
              </span>
              <h1 style="margin: 16px 0 0 0; color: #ffffff; font-size: 28px; font-weight: 700;">PACFU Portal</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Pampanga State Agricultural University</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 48px;">
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px;">
                Dear <strong style="color: #059669;">${name}</strong>,
              </p>
              <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                Your login verification code is:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 20px 0 32px 0;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 20px 48px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                      <span style="font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: monospace;">${code}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-align: center;">
                This code will expire in <strong>5 minutes</strong>.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px; text-align: center;">
                If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #065f46; padding: 32px 48px; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 500; text-align: center;">
                PACFU Portal — Faculty Communication Hub
              </p>
              <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 11px; text-align: center;">
                © ${currentYear} Pampanga State Agricultural University. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, name, code: submittedCode } = await req.json();

    if (action === "send") {
      // Delete any existing codes for this email first
      await supabase
        .from("verification_codes")
        .delete()
        .eq("email", email);

      // Generate and store new code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from("verification_codes")
        .insert({ email, code, expires_at: expiresAt });

      if (insertError) {
        console.error("Error storing verification code:", insertError);
        throw new Error("Failed to store verification code");
      }

      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: "PACFU Portal <no-reply@ccs-ojt.online>",
        to: [email],
        subject: "🔐 PACFU Portal - Login Verification Code",
        html: generateEmailHtml(code, name || "User"),
      });

      console.log(`Verification code sent to ${email}:`, emailResponse);

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else if (action === "verify") {
      // Look up the code from the database
      const { data: stored, error: fetchError } = await supabase
        .from("verification_codes")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !stored) {
        return new Response(
          JSON.stringify({ success: false, error: "No verification code found. Please request a new one." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (new Date() > new Date(stored.expires_at)) {
        // Clean up expired code
        await supabase.from("verification_codes").delete().eq("id", stored.id);
        return new Response(
          JSON.stringify({ success: false, error: "Verification code has expired. Please request a new one." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (stored.code !== submittedCode) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid verification code." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Code is valid - clean up
      await supabase.from("verification_codes").delete().eq("id", stored.id);

      return new Response(
        JSON.stringify({ success: true, message: "Code verified successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in send-login-code function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
