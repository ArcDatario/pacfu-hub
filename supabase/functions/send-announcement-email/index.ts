import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementEmailRequest {
  recipients: { email: string; name: string }[];
  announcement: {
    title: string;
    content: string;
    category: string;
    author: string;
  };
}

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
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${announcement.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                📢 PACFU Portal
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 14px;">
                New Announcement
              </p>
            </td>
          </tr>
          
          <!-- Category Badge -->
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <span style="display: inline-block; background-color: ${categoryColor}15; color: ${categoryColor}; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${categoryLabel}
              </span>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 40px 0 40px;">
              <p style="margin: 0; color: #374151; font-size: 16px;">
                Hello <strong>${recipientName}</strong>,
              </p>
            </td>
          </tr>
          
          <!-- Announcement Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background-color: #f9fafb; border-left: 4px solid ${categoryColor}; border-radius: 0 8px 8px 0; padding: 24px;">
                <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600; line-height: 1.4;">
                  ${announcement.title}
                </h2>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">
                  ${announcement.content}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Author Info -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Posted by <strong style="color: #374151;">${announcement.author}</strong>
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <a href="https://psau-portal.lovable.app/announcements" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(30, 58, 95, 0.3);">
                View in Portal
              </a>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                This is an automated notification from PACFU Portal.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${currentYear} PACFU - Pampanga State Agricultural University
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);

    const { recipients, announcement }: AnnouncementEmailRequest = await req.json();

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

    // Send emails to all recipients
    const emailPromises = limitedRecipients.map(async (recipient) => {
      try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          console.error(`Invalid email format: ${recipient.email}`);
          return { email: recipient.email, success: false, error: 'Invalid email format' };
        }

        const emailResponse = await resend.emails.send({
          from: "PACFU Portal <no-reply@ccs-ojt.online>",
          to: [recipient.email],
          subject: `📢 ${sanitizedAnnouncement.category === 'urgent' ? '🚨 URGENT: ' : ''}${sanitizedAnnouncement.title}`,
          html: generateEmailHtml(sanitizedAnnouncement, recipient.name?.substring(0, 100) || 'Faculty Member'),
        });

        console.log(`Email sent to ${recipient.email}:`, emailResponse);
        return { email: recipient.email, success: true, id: emailResponse.data?.id };
      } catch (error: any) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        return { email: recipient.email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    
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
