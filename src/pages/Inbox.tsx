import React from 'react';
import { Autocomplete, Avatar, Box, Button, Divider, TextField, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { listMessagesForUser, sendMessageToRecipients } from '../lib/messages';

const Inbox: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, users, loading, refreshUsers } = useAuth();
  const [messages, setMessages] = React.useState<
    Array<{
      id: string;
      senderId: string;
      recipientId: string;
      senderName: string;
      senderAvatarUrl: string | null;
      body: string;
      isBroadcast: boolean;
      createdAt: string;
    }>
  >([]);
  const [messageBody, setMessageBody] = React.useState('');
  const [sendToAll, setSendToAll] = React.useState(true);
  const [recipientSearch, setRecipientSearch] = React.useState('');
  const [selectedRecipients, setSelectedRecipients] = React.useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [replyToId, setReplyToId] = React.useState<string | null>(null);
  const [replyBody, setReplyBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [recipientsLoading, setRecipientsLoading] = React.useState(false);

  const loadMessages = React.useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const data = await listMessagesForUser(user.id);
      const mapped = data.map((item) => ({
        id: item.id,
        senderId: item.senderId,
        recipientId: item.recipientId,
        senderName: item.senderName,
        senderAvatarUrl: item.senderAvatarUrl,
        body: item.body,
        isBroadcast: item.isBroadcast,
        createdAt: item.createdAt
      }));
      setMessages(mapped);
      const latestReceived = mapped
        .filter((item) => item.recipientId === user.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]?.createdAt;
      const seenKey = `kila_inbox_seen_at_${user.id}`;
      window.localStorage.setItem(seenKey, latestReceived ?? new Date().toISOString());
      window.dispatchEvent(new Event('kila_inbox_seen'));
    } catch {
      setError('Nachrichten konnten nicht geladen werden.');
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      return;
    }
    loadMessages();
  }, [loadMessages, user]);

  React.useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'leitung')) {
      return;
    }
    setRecipientsLoading(true);
    refreshUsers()
      .catch(() => setError('Empfaenger konnten nicht geladen werden.'))
      .finally(() => setRecipientsLoading(false));
  }, [refreshUsers, user]);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography>{t('auth.loginRequired')}</Typography>
      </Box>
    );
  }

  const pageBg = theme.palette.mode === 'dark' ? 'dark' : 'light';
  const isAdmin = user.role === 'admin';
  const availableRecipients = users;

  const handleSend = async () => {
    if (!user || sending) {
      return;
    }
    const trimmed = messageBody.trim();
    if (!trimmed) {
      setError('Bitte eine Nachricht eingeben.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const recipientIds = sendToAll
        ? availableRecipients.map((item) => item.id)
        : selectedRecipients.map((item) => item.id);
      if (recipientIds.length === 0) {
        setError('Bitte mindestens einen Empfaenger auswaehlen.');
        setSending(false);
        return;
      }
      await sendMessageToRecipients({
        senderId: user.id,
        senderName: user.name,
        senderAvatarUrl: user.avatarUrl,
        recipientIds,
        body: trimmed,
        isBroadcast: sendToAll
      });
      setMessageBody('');
      setSelectedRecipients([]);
      setRecipientSearch('');
      setSuccess('Nachricht gesendet.');
      await loadMessages();
    } catch {
      setError('Nachricht konnte nicht gesendet werden.');
    } finally {
      setSending(false);
    }
  };

  const handleReplySend = async (recipientId: string) => {
    if (!user || sending) {
      return;
    }
    const trimmed = replyBody.trim();
    if (!trimmed) {
      setError('Bitte eine Nachricht eingeben.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await sendMessageToRecipients({
        senderId: user.id,
        senderName: user.name,
        senderAvatarUrl: user.avatarUrl,
        recipientIds: [recipientId],
        body: trimmed,
        isBroadcast: false
      });
      setReplyBody('');
      setReplyToId(null);
      setSuccess('Antwort gesendet.');
      await loadMessages();
    } catch {
      setError('Antwort konnte nicht gesendet werden.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 860, mx: 'auto' }} data-bg={pageBg}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 3 }}>
        {t('menu.account.inbox')}
      </Typography>

      {isAdmin ? (
        <Box
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            p: 2.5,
            mb: 4,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,136,255,0.04)'
          }}
        >
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            {sendToAll ? 'Neue Nachricht an alle' : 'Neue Nachricht an Empfaenger'}
          </Typography>
          <Autocomplete
            multiple
            options={availableRecipients}
            getOptionLabel={(option) => `${option.name} (${option.email})`}
            value={selectedRecipients}
            onChange={(_event, value) => {
              setSelectedRecipients(value);
              if (value.length > 0) {
                setSendToAll(false);
              }
            }}
            inputValue={recipientSearch}
            onInputChange={(_event, value) => setRecipientSearch(value)}
            loading={recipientsLoading}
            noOptionsText="Keine Empfaenger gefunden."
            renderInput={(params) => (
              <TextField
                {...params}
                label="Empfaenger suchen"
                placeholder={sendToAll ? 'Alle Empfaenger' : 'Name oder E-Mail'}
                sx={{ mb: 2 }}
              />
            )}
          />
          <Button
            variant={sendToAll ? 'contained' : 'outlined'}
            onClick={() =>
              setSendToAll((prev) => {
                if (!prev) {
                  setSelectedRecipients([]);
                  setRecipientSearch('');
                }
                return !prev;
              })
            }
            sx={{ mb: 2 }}
          >
            {sendToAll ? 'An alle senden' : 'Nur an Auswahl senden'}
          </Button>
          <TextField
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            placeholder="Nachricht schreiben..."
            minRows={3}
            multiline
            fullWidth
          />
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="contained" onClick={handleSend} disabled={sending}>
              Senden
            </Button>
            {error ? <Typography color="error">{error}</Typography> : null}
            {success ? <Typography color="success.main">{success}</Typography> : null}
          </Box>
        </Box>
      ) : null}

      <Box sx={{ display: 'grid', gap: 2 }}>
        {messages.length === 0 ? (
          <Typography color="text.secondary">Noch keine Nachrichten.</Typography>
        ) : null}
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              p: 2.5,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#ffffff',
              boxShadow: theme.palette.mode === 'dark' ? '0 12px 24px rgba(0,0,0,0.25)' : '0 8px 20px rgba(0,0,0,0.06)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={message.senderAvatarUrl ?? undefined}
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,136,255,0.15)',
                  color: theme.palette.text.primary
                }}
              >
                {message.senderName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {message.senderName}
                  {message.isBroadcast ? ' · An alle' : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(message.createdAt).toLocaleString('de-DE')}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography sx={{ whiteSpace: 'pre-line' }}>{message.body}</Typography>
            {!message.isBroadcast && message.senderId !== user.id ? (
              <Box sx={{ mt: 2 }}>
                {replyToId === message.id ? (
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <TextField
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder="Antwort schreiben..."
                      minRows={2}
                      multiline
                      fullWidth
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={() => handleReplySend(message.senderId)}
                        disabled={sending}
                      >
                        Antworten
                      </Button>
                      <Button
                        variant="text"
                        onClick={() => {
                          setReplyToId(null);
                          setReplyBody('');
                        }}
                      >
                        Abbrechen
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Button variant="outlined" onClick={() => setReplyToId(message.id)}>
                    Antworten
                  </Button>
                )}
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Inbox;
