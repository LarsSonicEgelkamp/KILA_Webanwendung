import React from 'react';
import { Avatar, Box, Button, TextField, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { deleteAvatarImage, uploadAvatarImage } from '../lib/profileImages';

const AccountPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, loading, updateAvatar } = useAuth();
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(user?.avatarUrl ?? null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }
    setUploading(true);
    setError('');
    try {
      const newUrl = await uploadAvatarImage(user.id, file);
      const result = await updateAvatar(newUrl);
      if (!result.ok) {
        await deleteAvatarImage(newUrl);
        throw new Error('update_failed');
      }
      setAvatarUrl(newUrl);
      if (avatarUrl) {
        try {
          await deleteAvatarImage(avatarUrl);
        } catch {
          // Ignore cleanup errors for old avatars.
        }
      }
    } catch {
      setError('Profilbild konnte nicht gespeichert werden.');
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

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

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 720 }} data-bg={pageBg}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 3 }}>
        {t('menu.account.manage')}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Avatar
          src={avatarUrl ?? undefined}
          sx={{
            width: 96,
            height: 96,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,136,255,0.15)',
            color: theme.palette.text.primary,
            fontSize: '2rem'
          }}
        >
          {user.name?.slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {avatarUrl ? 'Profilbild wechseln' : 'Profilbild hochladen'}
          </Button>
          {error ? <Typography color="error">{error}</Typography> : null}
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileSelect}
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 2 }}>
        <TextField label="Name" value={user.name} fullWidth disabled />
        <TextField label="E-Mail" value={user.email} fullWidth disabled />
        <TextField label="Rolle" value={t(`auth.roles.${user.role}`)} fullWidth disabled />
      </Box>
    </Box>
  );
};

export default AccountPage;
