import React from 'react';
import { Box, Button, IconButton, InputAdornment, Link, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type LoginProps = {
  embedded?: boolean;
};

const Login: React.FC<LoginProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      if (result.error === 'invalid_credentials') {
        setError(t('auth.errors.invalidCredentials'));
      } else if (result.error === 'server_error') {
        setError(t('auth.errors.server'));
      } else {
        setError(t('auth.errors.invalidCredentials'));
      }
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <Box sx={{ p: embedded ? 0 : { xs: 2, md: 4 }, maxWidth: embedded ? 520 : 420 }}>
      {!embedded ? (
        <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
          {t('auth.login')}
        </Typography>
      ) : null}
      {user ? (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>
            {t('auth.loggedInAs', { name: user.name, role: t(`auth.roles.${user.role}`) })}
          </Typography>
          <Button variant="outlined" onClick={logout}>
            {t('auth.logout')}
          </Button>
        </Box>
      ) : null}
      {!user ? (
        <>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
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
            <Button type="submit" variant="contained" disabled={submitting}>
              {t('auth.login')}
            </Button>
          </Box>
          <Typography sx={{ mt: 2, fontSize: embedded ? '0.95rem' : '1rem' }}>
            Noch kein Konto? Dann registriere dich{' '}
            <Link component={RouterLink} to="/anmeldung/signup" underline="hover">
              hier
            </Link>
            .
          </Typography>
        </>
      ) : null}
    </Box>
  );
};

export default Login;
