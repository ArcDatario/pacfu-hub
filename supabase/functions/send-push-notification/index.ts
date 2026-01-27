import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    
    if (!FCM_SERVER_KEY) {
      console.error('FCM_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'FCM not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tokens, title, body, data } = await req.json() as PushNotificationRequest;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to ${tokens.length} devices`);

    const successCount = { value: 0 };
    const failedTokens: string[] = [];

    // Send to each token
    for (const token of tokens) {
      try {
        const message = {
          to: token,
          notification: {
            title,
            body,
            icon: '/psau-logo.png',
            click_action: '/announcements',
          },
          data: data || {},
        };

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const result = await response.json();
        
        if (result.success === 1) {
          successCount.value++;
        } else {
          failedTokens.push(token);
          console.error('FCM send failed for token:', token, result);
        }
      } catch (error) {
        failedTokens.push(token);
        console.error('Error sending to token:', token, error);
      }
    }

    console.log(`Push notification sent: ${successCount.value} success, ${failedTokens.length} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        successCount: successCount.value,
        failedCount: failedTokens.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
