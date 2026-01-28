import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// SECURITY: Restrict CORS to specific origins
const ALLOWED_ORIGINS = [
  "https://psau-portal.lovable.app",
  "https://id-preview--f6a7a86c-c73b-4722-aec2-ca6651ec8a46.lovable.app",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  // Check if the origin is allowed
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.endsWith(".lovable.app"))
      ? origin
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-request-signature, x-request-timestamp",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

interface AnnouncementEmailRequest {
  recipients: { email: string; name: string }[];
  announcement: {
    title: string;
    content: string;
    category: string;
    author: string;
  };
  signature?: string;
  timestamp?: number;
}

// SECURITY: HTML escape function to prevent XSS
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case "urgent":
      return "#DC2626";
    case "event":
      return "#059669";
    case "memo":
      return "#6B7280";
    default:
      return "#2563EB";
  }
};

const getCategoryLabel = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const generateEmailHtml = (announcement: AnnouncementEmailRequest["announcement"], recipientName: string): string => {
  const categoryColor = getCategoryColor(announcement.category);
  const categoryLabel = getCategoryLabel(announcement.category);
  const currentYear = new Date().getFullYear();

  // SECURITY: Escape all user-provided content to prevent XSS
  const safeTitle = escapeHtml(announcement.title);
  const safeContent = escapeHtml(announcement.content).replace(/\n/g, '<br>');
  const safeName = escapeHtml(recipientName);
  const safeAuthor = escapeHtml(announcement.author);
  const formattedDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f0fdf4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); padding: 40px 48px; border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                      📢 New Announcement
                    </span>
                    <h1 style="margin: 16px 0 0 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3; letter-spacing: -0.5px;">
                      PACFU Portal
                    </h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 400;">
                      Pampanga State Agricultural University
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 48px;">
              
              <!-- Category Badge & Date -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td>
                    <span style="display: inline-block; background: ${categoryColor}12; border: 1px solid ${categoryColor}30; color: ${categoryColor}; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.8px;">
                      ${categoryLabel}
                    </span>
                    <span style="display: inline-block; margin-left: 12px; color: #6b7280; font-size: 13px;">
                      ${formattedDate}
                    </span>
                  </td>
                </tr>
              </table>
              
              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Dear <strong style="color: #059669;">${safeName}</strong>,
              </p>
              
              <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                A new announcement has been posted to the PACFU Portal. Please review the details below.
              </p>
              
              <!-- Divider -->
              <div style="width: 100%; height: 1px; background: linear-gradient(90deg, #10b981 0%, #d1fae5 100%); margin-bottom: 32px;"></div>
              
              <!-- Title -->
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 22px; font-weight: 700; line-height: 1.4;">
                ${safeTitle}
              </h2>
              
              <!-- Content -->
              <div style="color: #374151; font-size: 15px; line-height: 1.8; margin-bottom: 32px;">
                ${safeContent}
              </div>
              
              <!-- Author -->
              <p style="margin: 0 0 40px 0; color: #6b7280; font-size: 14px; font-style: italic;">
                — ${safeAuthor}
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://psau-portal.lovable.app/announcements" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 16px 40px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); letter-spacing: 0.3px;">
                      View Full Announcement →
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #065f46; padding: 32px 48px; border-radius: 0 0 16px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 500;">
                      PACFU Portal — Faculty Communication Hub
                    </p>
                    <p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.5;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                    <div style="width: 40px; height: 2px; background: rgba(255,255,255,0.3); margin: 0 auto 16px auto;"></div>
                    <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 11px;">
                      © ${currentYear} Pampanga State Agricultural University. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// SECURITY: Simple HMAC verification using Web Crypto API
const verifySignature = async (payload: string, signature: string, timestamp: number): Promise<boolean> => {
  const signingSecret = Deno.env.get("EMAIL_SIGNING_SECRET");

  // If no secret is configured, log warning but allow (for backwards compatibility during transition)
  if (!signingSecret) {
    console.warn("EMAIL_SIGNING_SECRET not configured - signature verification skipped");
    return true;
  }

  // Check timestamp is within 5 minutes to prevent replay attacks
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  if (Math.abs(now - timestamp) > fiveMinutes) {
    console.error("Request timestamp too old or in future");
    return false;
  }

  // Create HMAC signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureData = `${timestamp}.${payload}`;
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signatureData));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignature;
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
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

    const resend = new Resend(resendApiKey);

    // Get request body as text first for signature verification
    const bodyText = await req.text();
    const requestData: AnnouncementEmailRequest = JSON.parse(bodyText);

    // SECURITY: Verify request signature if present
    const signatureHeader = req.headers.get("x-request-signature");
    const timestampHeader = req.headers.get("x-request-timestamp");

    if (signatureHeader && timestampHeader) {
      const isValid = await verifySignature(bodyText, signatureHeader, parseInt(timestampHeader));
      if (!isValid) {
        console.error("Invalid request signature");
        return new Response(JSON.stringify({ error: "Invalid request signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else {
      // Log when signature is missing (will be required in future)
      console.warn("Request missing signature headers - allowing for backwards compatibility");
    }

    const { recipients, announcement } = requestData;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("No recipients provided");
    }

    if (!announcement || !announcement.title || !announcement.content) {
      throw new Error("Invalid announcement data");
    }

    // Input validation - sanitize announcement content
    const sanitizedAnnouncement = {
      title: announcement.title.substring(0, 200),
      content: announcement.content.substring(0, 5000),
      category: ["general", "urgent", "event", "memo"].includes(announcement.category)
        ? announcement.category
        : "general",
      author: announcement.author.substring(0, 100),
    };

    // Limit number of recipients to prevent abuse
    const limitedRecipients = recipients.slice(0, 100);

    console.log(`Sending announcement email to ${limitedRecipients.length} recipients using Resend`);

    // Helper function to delay execution
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Send emails sequentially with delay to avoid rate limiting (Resend free plan: 2 req/sec)
    const results: { email: string; success: boolean; id?: string; error?: string }[] = [];

    for (const recipient of limitedRecipients) {
      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          console.error(`Invalid email format: ${recipient.email}`);
          results.push({ email: recipient.email, success: false, error: "Invalid email format" });
          continue;
        }

        const emailResponse = await resend.emails.send({
          from: "PACFU Portal <no-reply@ccs-ojt.online>",
          to: [recipient.email],
          subject: `📢 ${sanitizedAnnouncement.category === "urgent" ? "🚨 URGENT: " : ""}${sanitizedAnnouncement.title}`,
          html: generateEmailHtml(sanitizedAnnouncement, recipient.name?.substring(0, 100) || "Faculty Member"),
        });

        console.log(`Email sent to ${recipient.email}:`, emailResponse);
        results.push({ email: recipient.email, success: true, id: emailResponse.data?.id });

        // Wait 600ms between emails to stay under rate limit (2 req/sec)
        await delay(600);
      } catch (error: any) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        results.push({ email: recipient.email, success: false, error: error.message });
        // Still wait even on error to avoid rate limiting
        await delay(600);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`Email sending complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        message: `Emails sent successfully`,
        successCount,
        failCount,
        results,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    console.error("Error in send-announcement-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
