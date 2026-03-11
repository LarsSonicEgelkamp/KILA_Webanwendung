import { supabase } from './supabaseClient';

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  body: string;
  isBroadcast: boolean;
  createdAt: string;
};

type InboxEmailNotificationPayload = {
  messageIds: string[];
};

type InboxEmailNotificationResponse = {
  sent: number;
  skipped: number;
  failed: number;
};

export type SendMessageResult = {
  savedCount: number;
  emailSent: number;
  emailSkipped: number;
  emailFailed: number;
  emailError?: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  sender_avatar_url: string | null;
  body: string;
  is_broadcast: boolean | null;
  created_at: string;
};

const mapRow = (row: MessageRow): Message => ({
  id: row.id,
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  senderName: row.sender_name,
  senderAvatarUrl: row.sender_avatar_url,
  body: row.body,
  isBroadcast: row.is_broadcast ?? false,
  createdAt: row.created_at
});

const triggerInboxEmailNotifications = async (
  payload: InboxEmailNotificationPayload
): Promise<InboxEmailNotificationResponse> => {
  const { data, error } = await supabase.functions.invoke<InboxEmailNotificationResponse>('send-inbox-email', {
    body: payload
  });
  if (error) {
    throw error;
  }
  if (!data || typeof data.sent !== 'number' || typeof data.skipped !== 'number' || typeof data.failed !== 'number') {
    throw new Error('Invalid email notification response.');
  }
  return data;
};

export const listMessagesForUser = async (userId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, sender_name, sender_avatar_url, body, is_broadcast, created_at')
    .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapRow);
};

export const getLatestInboxMessageTimestamp = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('messages')
    .select('created_at')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data?.created_at ?? null;
};

export const sendMessageToRecipients = async (input: {
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  recipientIds: string[];
  body: string;
  isBroadcast?: boolean;
}): Promise<SendMessageResult> => {
  const uniqueRecipientIds = Array.from(new Set(input.recipientIds.filter(Boolean)));
  const rows = uniqueRecipientIds.map((recipientId) => ({
    sender_id: input.senderId,
    recipient_id: recipientId,
    sender_name: input.senderName,
    sender_avatar_url: input.senderAvatarUrl,
    body: input.body,
    is_broadcast: input.isBroadcast ?? false
  }));
  const { data, error } = await supabase.from('messages').insert(rows).select('id');
  if (error || !data) {
    throw error;
  }

  const messageIds = data.map((item) => item.id).filter(Boolean);
  if (messageIds.length === 0) {
    return {
      savedCount: 0,
      emailSent: 0,
      emailSkipped: 0,
      emailFailed: 0
    };
  }

  try {
    const delivery = await triggerInboxEmailNotifications({
      messageIds
    });
    return {
      savedCount: messageIds.length,
      emailSent: delivery.sent,
      emailSkipped: delivery.skipped,
      emailFailed: delivery.failed
    };
  } catch (notificationError) {
    const message =
      notificationError instanceof Error
        ? notificationError.message
        : 'Unknown email notification error.';
    console.error('Inbox email notification failed', notificationError);
    return {
      savedCount: messageIds.length,
      emailSent: 0,
      emailSkipped: 0,
      emailFailed: messageIds.length,
      emailError: message
    };
  }
};
