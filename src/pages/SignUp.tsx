import React from 'react';
import { Box, Button, Checkbox, FormControlLabel, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { sendMessageToRecipients } from '../lib/messages';

type SignUpProps = {
  embedded?: boolean;
};

const SignUp: React.FC<SignUpProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, register, logout } = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [wantsLeadership, setWantsLeadership] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError('');
    setSuccess('');
    setSubmitting(true);
    const result = await register({
      name,
      email,
      password
    });
    setSubmitting(false);
    if (!result.ok) {
      if (result.error === 'email_in_use') {
        setError(t('auth.errors.emailInUse'));
      } else if (result.error === 'weak_password') {
        setError(t('auth.errors.weakPassword'));
      } else if (result.error === 'invalid_email') {
        setError(t('auth.errors.invalidEmail'));
      } else if (result.error === 'server_error') {
        setError(t('auth.errors.server'));
      } else {
        setError(t('auth.errors.missingFields'));
      }
      return;
    }
    if (wantsLeadership) {
      try {
        const { data } = await supabase.auth.getUser();
        const currentUser = data.user;
        if (currentUser) {
          const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
          const recipientIds = (admins ?? []).map((admin) => admin.id);
          if (recipientIds.length > 0) {
            await sendMessageToRecipients({
              senderId: currentUser.id,
              senderName: name.trim() || 'User',
              senderAvatarUrl: null,
              recipientIds,
              body: `User ${name.trim()} (${email.trim()}) moechte sich als Leitung registrieren.`,
              isBroadcast: false
            });
          }
        }
      } catch {
        // Ignore notification errors to avoid blocking registration flow.
      }
    }
    setSuccess(t('auth.success.created'));
    navigate('/', { replace: true });
    setName('');
    setEmail('');
    setPassword('');
    setWantsLeadership(false);
  };

  return (
    <Box sx={{ p: embedded ? 0 : { xs: 2, md: 4 }, maxWidth: embedded ? 560 : 480 }}>
      {!embedded ? (
        <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
          {t('auth.signup')}
        </Typography>
      ) : null}
      {user ? (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Typography>
            {t('auth.loggedInAs', { name: user.name, role: t(`auth.roles.${user.role}`) })}
          </Typography>
          <Button variant="outlined" onClick={logout}>
            {t('auth.logout')}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label={t('auth.name')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            fullWidth
          />
        <TextField
          label={t('auth.password')}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Passwort anzeigen"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    edge="end"
                  >
                    {showPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
            )
          }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={wantsLeadership}
              onChange={(event) => setWantsLeadership(event.target.checked)}
            />
          }
          label="Ich bin Mitglied des Leiterteams."
        />
        {error ? <Typography color="error">{error}</Typography> : null}
        {success ? <Typography color="success.main">{success}</Typography> : null}
        <Button type="submit" variant="contained" disabled={submitting}>
          {t('auth.signup')}
        </Button>
        </Box>
      )}
    </Box>
  );
};

export default SignUp;
