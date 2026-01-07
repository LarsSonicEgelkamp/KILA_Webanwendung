import React from 'react';
import { Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type SignUpProps = {
  embedded?: boolean;
};

const SignUp: React.FC<SignUpProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, register } = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
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
    setSuccess(t('auth.success.created'));
    if (!user) {
      navigate('/');
    }
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <Box sx={{ p: embedded ? 0 : { xs: 2, md: 4 }, maxWidth: embedded ? 560 : 480 }}>
      {!embedded ? (
        <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
          {t('auth.signup')}
        </Typography>
      ) : null}
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
        {error ? <Typography color="error">{error}</Typography> : null}
        {success ? <Typography color="success.main">{success}</Typography> : null}
        <Button type="submit" variant="contained" disabled={submitting}>
          {t('auth.signup')}
        </Button>
      </Box>
    </Box>
  );
};

export default SignUp;
