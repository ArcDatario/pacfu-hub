import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// SECURITY: Restrict CORS to specific origins
const ALLOWED_ORIGINS = [
  "https://psau-portal.lovable.app",
  "https://id-preview--f6a7a86c-c73b-4722-aec2-ca6651ec8a46.lovable.app"
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  // Check if the origin is allowed
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-signature, x-request-timestamp",
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'urgent':
      return '#DC2626';
    case 'event':
      return '#059669';
    case 'memo':
      return '#6B7280';
    default:
      return '#2563EB';
  }
};

const getCategoryLabel = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1);
};

const generateEmailHtml = (announcement: AnnouncementEmailRequest['announcement'], recipientName: string): string => {
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
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ecfdf5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px -10px rgba(16, 185, 129, 0.3);">
          
          <!-- Header with Green Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); padding: 40px 40px; text-align: center;">
              <div style="background: rgba(255,255,255,0.15); display: inline-block; padding: 12px 20px; border-radius: 50px; margin-bottom: 16px;">
                <span style="font-size: 28px;">📢</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                PACFU Portal
              </h1>
              <p style="margin: 12px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 15px; font-weight: 500;">
                ✨ New Announcement
              </p>
            </td>
          </tr>
          
          <!-- Category Badge -->
          <tr>
            <td style="padding: 28px 40px 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}10 100%); border: 1px solid ${categoryColor}30; color: ${categoryColor}; font-size: 11px; font-weight: 700; padding: 8px 16px; border-radius: 25px; text-transform: uppercase; letter-spacing: 1px;">
                    ${categoryLabel}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello <strong style="color: #059669;">${safeName}</strong> 👋,
              </p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                A new announcement has been posted that may be relevant to you.
              </p>
            </td>
          </tr>
          
          <!-- Announcement Content Card -->
          <tr>
            <td style="padding: 24px 40px;">
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #a7f3d0; border-left: 5px solid #10b981; border-radius: 0 16px 16px 0; padding: 28px; position: relative;">
                <h2 style="margin: 0 0 16px 0; color: #065f46; font-size: 22px; font-weight: 700; line-height: 1.4;">
                  ${safeTitle}
                </h2>
                <div style="width: 50px; height: 3px; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 2px; margin-bottom: 16px;"></div>
                <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">
                  ${safeContent}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Author Info with Icon -->
          <tr>
            <td style="padding: 0 40px 28px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background: #f3f4f6; padding: 12px 20px; border-radius: 30px;">
                    <span style="color: #6b7280; font-size: 13px;">
                      ✍️ Posted by <strong style="color: #059669;">${safeAuthor}</strong>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button with Green Gradient -->
          <tr>
            <td style="padding: 0 40px 36px 40px; text-align: center;">
              <a href="https://psau-portal.lovable.app/announcements" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 16px 40px; border-radius: 30px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
                🔗 View in Portal
              </a>
            </td>
          </tr>
          
          <!-- Divider with Gradient -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 2px; background: linear-gradient(90deg, transparent, #a7f3d0, transparent);"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 28px 40px 36px 40px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                🔔 This is an automated notification from PACFU Portal.
              </p>
              <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px;">
                You received this email because you are a faculty member.
              </p>
              <div style="margin-top: 16px;">
                <p style="margin: 0; color: #10b981; font-size: 12px; font-weight: 600;">
                  © ${currentYear} PACFU - Pampanga State Agricultural University
                </p>
              </div>
            </td>
          </tr>
          
        </table>
        
        <!-- Footer Links -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 11px;">
                Need help? Contact your administrator.
              </p>
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
    ["sign"]
  );
  
  const signatureData = `${timestamp}.${payload}`;
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signatureData));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
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
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
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
        return new Response(
          JSON.stringify({ error: "Invalid request signature" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
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
      category: ['general', 'urgent', 'event', 'memo'].includes(announcement.category) 
        ? announcement.category 
        : 'general',
      author: announcement.author.substring(0, 100),
    };

    // Limit number of recipients to prevent abuse
    const limitedRecipients = recipients.slice(0, 100);

    console.log(`Sending announcement email to ${limitedRecipients.length} recipients using Resend`);

    // Helper function to delay execution
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send emails sequentially with delay to avoid rate limiting (Resend free plan: 2 req/sec)
    const results: { email: string; success: boolean; id?: string; error?: string }[] = [];
    
    for (const recipient of limitedRecipients) {
      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          console.error(`Invalid email format: ${recipient.email}`);
          results.push({ email: recipient.email, success: false, error: 'Invalid email format' });
          continue;
        }

        const emailResponse = await resend.emails.send({
          from: "PACFU Portal <no-reply@ccs-ojt.online>",
          to: [recipient.email],
          subject: `📢 ${sanitizedAnnouncement.category === 'urgent' ? '🚨 URGENT: ' : ''}${sanitizedAnnouncement.title}`,
          html: generateEmailHtml(sanitizedAnnouncement, recipient.name?.substring(0, 100) || 'Faculty Member'),
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
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Email sending complete: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Emails sent successfully`,
        successCount,
        failCount,
        results 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-announcement-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
