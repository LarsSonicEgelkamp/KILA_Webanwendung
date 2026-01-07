import React from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  const [error, setError] = React.useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const result = login(email, password);
    if (!result.ok) {
      setError(t('auth.errors.invalidCredentials'));
      return;
    }
    navigate('/');
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
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
        />
        {error ? <Typography color="error">{error}</Typography> : null}
        <Button type="submit" variant="contained">
          {t('auth.login')}
        </Button>
      </Box>
    </Box>
  );
};

export default Login;
