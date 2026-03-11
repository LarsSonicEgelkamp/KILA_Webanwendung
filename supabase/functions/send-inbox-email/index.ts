import { createClient } from 'npm:@supabase/supabase-js@2';

type NotificationRequest = {
  messageIds: string[];
};

type Recipient = {
  id: string;
  email: string | null;
  name: string | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id: string;
  body: string;
  is_broadcast: boolean | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildHtmlBody = (senderName: string, messageBody: string, isBroadcast: boolean): string => {
  const sender = escapeHtml(senderName);
  const body = escapeHtml(messageBody).replaceAll('\n', '<br />');
  const typeLabel = isBroadcast ? 'Rundnachricht' : 'Neue Nachricht';
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h2 style="margin:0 0 12px 0;">${typeLabel} im KILA-Postfach</h2>
      <p style="margin:0 0 10px 0;"><strong>Von:</strong> ${sender}</p>
      <p style="margin:0 0 10px 0;"><strong>Nachricht:</strong></p>
      <div style="padding:12px;border-radius:8px;background:#f3f4f6;">${body}</div>
      <p style="margin:16px 0 0 0;color:#4b5563;">Bitte antworte direkt im Postfach der KILA-Webanwendung.</p>
    </div>
  `;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !resendApiKey || !emailFrom) {
    return new Response(JSON.stringify({ error: 'Missing required environment variables.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let payload: NotificationRequest;
  try {
    payload = (await request.json()) as NotificationRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const messageIds = Array.from(new Set((payload.messageIds ?? []).filter(Boolean)));
  if (messageIds.length === 0) {
    return new Response(JSON.stringify({ error: 'No message IDs provided.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const {
    data: { user },
    error: userError
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid user session.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: messages, error: messagesError } = await serviceClient
    .from('messages')
    .select('id, sender_id, sender_name, recipient_id, body, is_broadcast')
    .in('id', messageIds);

  if (messagesError || !messages) {
    return new Response(JSON.stringify({ error: 'Could not load messages.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const normalizedMessages = messages as MessageRow[];
  const foreignMessages = normalizedMessages.filter((message) => message.sender_id !== user.id);
  if (foreignMessages.length > 0) {
    return new Response(JSON.stringify({ error: 'Some messages are not owned by the caller.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (normalizedMessages.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0, failed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const recipientIds = Array.from(new Set(normalizedMessages.map((message) => message.recipient_id)));
  const { data: recipients, error: recipientsError } = await serviceClient
    .from('profiles')
    .select('id, email, name')
    .in('id', recipientIds);

  if (recipientsError) {
    return new Response(JSON.stringify({ error: 'Could not load recipient profiles.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const validRecipients = ((recipients ?? []) as Recipient[]).filter((item) => item.email);
  if (validRecipients.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: normalizedMessages.length, failed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const recipientById = new Map(validRecipients.map((recipient) => [recipient.id, recipient]));
  const deliverableMessages = normalizedMessages.filter((message) => {
    const recipient = recipientById.get(message.recipient_id);
    return Boolean(recipient?.email);
  });
  const skippedCount = normalizedMessages.length - deliverableMessages.length;

  const sendPromises = deliverableMessages.map(async (message) => {
    const recipient = recipientById.get(message.recipient_id) as Recipient;
    const subject = message.is_broadcast
      ? `KILA Postfach: Rundnachricht von ${message.sender_name}`
      : `KILA Postfach: Neue Nachricht von ${message.sender_name}`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [recipient.email],
        subject,
        html: buildHtmlBody(message.sender_name, message.body, Boolean(message.is_broadcast)),
        text: `Neue Nachricht im KILA-Postfach\n\nVon: ${message.sender_name}\n\n${message.body}\n\nBitte antworte direkt im Postfach der KILA-Webanwendung.`
      })
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Email send failed (${message.id}): ${response.status} ${responseText}`);
    }
  });

  const results = await Promise.allSettled(sendPromises);
  const failed = results.filter((result) => result.status === 'rejected');
  if (failed.length > 0) {
    console.error('Some inbox emails failed', failed);
  }

  return new Response(
    JSON.stringify({
      sent: deliverableMessages.length - failed.length,
      skipped: skippedCount,
      failed: failed.length
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
});
