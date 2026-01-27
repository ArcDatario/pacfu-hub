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
  const safeContent = escapeHtml(announcement.content);
  const safeName = escapeHtml(recipientName);
  const safeAuthor = escapeHtml(announcement.author);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background: linear-gradient(180deg, #f0fdf9 0%, #e6fcf2 100%);">
    <tr>
      <td align="center" style="padding: 30px 20px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.1);">
          
          <!-- Compact Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 32px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px;">
                <div style="background: rgba(255,255,255,0.2); padding: 10px 14px; border-radius: 12px;">
                  <span style="font-size: 20px;">📢</span>
                </div>
                <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">
                  PACFU Portal Announcement
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Content Area -->
          <tr>
            <td style="padding: 32px;">
              
              <!-- Category & Greeting -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <span style="display: inline-block; background: linear-gradient(135deg, ${categoryColor}15 0%, ${categoryColor}08 100%); border: 1px solid ${categoryColor}25; color: ${categoryColor}; font-size: 10px; font-weight: 700; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px;">
                      ${categoryLabel}
                    </span>
                    <p style="margin: 16px 0 0 0; color: #374151; font-size: 15px; line-height: 1.5;">
                      Hello <strong style="color: #059669;">${safeName}</strong>, a new announcement has been posted.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Announcement Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background: #f9fafb; border-radius: 12px; border-left: 4px solid #10b981; padding: 24px;">
                    <h2 style="margin: 0 0 12px 0; color: #065f46; font-size: 20px; font-weight: 700; line-height: 1.4;">
                      ${safeTitle}
                    </h2>
                    <div style="width: 40px; height: 2px; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 1px; margin-bottom: 16px;"></div>
                    <div style="color: #4b5563; font-size: 14px; line-height: 1.7; max-height: 200px; overflow-y: auto; padding-right: 8px;">
                      ${safeContent}
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Author & Button Row -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom: 24px;">
                    <div style="display: inline-block; background: #f3f4f6; padding: 8px 16px; border-radius: 20px;">
                      <span style="color: #6b7280; font-size: 12px;">
                        ✍️ Posted by <strong style="color: #059669;">${safeAuthor}</strong>
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="https://psau-portal.lovable.app/announcements" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 36px; border-radius: 25px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s ease; letter-spacing: 0.3px;">
                      🔗 View Full Announcement
                    </a>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(180deg, #f8fdfb 0%, #f0faf6 100%); padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                      🔔 Automated notification from PACFU Portal
                    </p>
                    <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 11px; max-width: 400px; line-height: 1.5;">
                      You received this email as a faculty member of Pampanga State Agricultural University.
                    </p>
                    <div style="padding-top: 16px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0; color: #10b981; font-size: 11px; font-weight: 600;">
                        © ${currentYear} PACFU - Pampanga State Agricultural University
                      </p>
                      <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 10px;">
                        Need assistance? Contact your administrator.
                      </p>
                    </div>
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
