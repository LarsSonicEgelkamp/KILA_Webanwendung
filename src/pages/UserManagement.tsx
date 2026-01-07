import React from 'react';
import { Box, MenuItem, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Role, useAuth } from '../auth/AuthContext';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user, users, updateRole } = useAuth();

  if (!user) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography>{t('auth.loginRequired')}</Typography>
      </Box>
    );
  }

  if (user.role === 'user') {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography>{t('auth.noAccess')}</Typography>
      </Box>
    );
  }

  const canAssignAdmin = user.role === 'admin';
  const canEdit = user.role === 'admin' || user.role === 'leitung';

  const roleOptions: Role[] = canAssignAdmin ? ['admin', 'leitung', 'user'] : ['leitung', 'user'];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 640 }}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
        {t('menu.registration.userManagement')}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {users.map((item) => {
          const isAdmin = item.role === 'admin';
          const disableEdit = !canEdit || (user.role === 'leitung' && isAdmin);
          return (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(0, 136, 255, 0.06)'
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.email}
                </Typography>
              </Box>
              <Select
                size="small"
                value={item.role}
                onChange={(event) => updateRole(item.id, event.target.value as Role)}
                disabled={disableEdit}
                sx={{ minWidth: 160 }}
              >
                {roleOptions.map((role) => (
                  <MenuItem key={role} value={role} disabled={!canAssignAdmin && role === 'admin'}>
                    {t(`auth.roles.${role}`)}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default UserManagement;
