import React from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Role, useAuth } from '../auth/AuthContext';

type SignUpProps = {
  embedded?: boolean;
};

const SignUp: React.FC<SignUpProps> = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, users, register } = useAuth();
  const isFirstUser = users.length === 0;
  const canAssignRole = user?.role === 'admin';
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<Role>(isFirstUser ? 'admin' : 'user');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const effectiveRole = canAssignRole ? role : isFirstUser ? 'admin' : 'user';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const result = register({
      name,
      email,
      password,
      role: effectiveRole,
      autoLogin: !user
    });
    if (!result.ok) {
      if (result.error === 'email_in_use') {
        setError(t('auth.errors.emailInUse'));
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
    setRole(isFirstUser ? 'admin' : 'user');
  };

  return (
    <Box sx={{ p: embedded ? 0 : { xs: 2, md: 4 }, maxWidth: embedded ? 560 : 480 }}>
      {!embedded ? (
        <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
          {t('auth.signup')}
        </Typography>
      ) : null}
      {isFirstUser ? <Typography sx={{ mb: 2 }}>{t('auth.firstAdminNote')}</Typography> : null}
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
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          fullWidth
        />
        {canAssignRole ? (
          <TextField
            select
            label={t('auth.role')}
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            fullWidth
          >
            <MenuItem value="admin">{t('auth.roles.admin')}</MenuItem>
            <MenuItem value="leitung">{t('auth.roles.leitung')}</MenuItem>
            <MenuItem value="user">{t('auth.roles.user')}</MenuItem>
          </TextField>
        ) : null}
        {error ? <Typography color="error">{error}</Typography> : null}
        {success ? <Typography color="success.main">{success}</Typography> : null}
        <Button type="submit" variant="contained">
          {t('auth.signup')}
        </Button>
      </Box>
    </Box>
  );
};

export default SignUp;
