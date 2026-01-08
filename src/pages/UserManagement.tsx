import React from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from 'react-i18next';
import { Role, useAuth } from '../auth/AuthContext';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user, users, updateRole, deleteUser, loading } = useAuth();
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = React.useState<Record<string, Role>>({});
  const [updateError, setUpdateError] = React.useState<string>('');

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

  if (user.role === 'user') {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography>{t('auth.noAccess')}</Typography>
      </Box>
    );
  }

  const canEdit = user.role === 'admin' || user.role === 'leitung';

  const roleOptions: Role[] = ['leitung', 'user'];

  const handleRoleChange = async (id: string, role: Role) => {
    if (updatingId === id) {
      return;
    }
    setUpdatingId(id);
    setUpdateError('');
    setPendingRoles((prev) => ({ ...prev, [id]: role }));
    const result = await updateRole(id, role);
    setPendingRoles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (!result.ok) {
      setUpdateError('Rolle konnte nicht aktualisiert werden.');
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Soll ${name} wirklich geloescht werden?`);
    if (!confirmed) {
      return;
    }
    setDeletingId(id);
    await deleteUser(id);
    setDeletingId(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 640 }}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 2 }}>
        {t('menu.registration.userManagement')}
      </Typography>
      {updateError ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {updateError}
        </Typography>
      ) : null}
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {users.map((item) => {
          const isAdmin = item.role === 'admin';
          const disableEdit = !canEdit || isAdmin;
          const isUpdating = updatingId === item.id;
          const displayRole = pendingRoles[item.id] ?? item.role;
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isAdmin ? (
                  <Typography sx={{ fontWeight: 600, minWidth: 160 }}>{t('auth.roles.admin')}</Typography>
                ) : (
                  <Select
                    size="small"
                    value={displayRole}
                    onChange={(event) => handleRoleChange(item.id, event.target.value as Role)}
                    disabled={disableEdit || isUpdating}
                    sx={{ minWidth: 160 }}
                    IconComponent={(iconProps) =>
                      isUpdating ? (
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                      ) : (
                        <KeyboardArrowDownIcon {...iconProps} />
                      )
                    }
                  >
                    {roleOptions.map((role) => (
                      <MenuItem key={role} value={role}>
                        {t(`auth.roles.${role}`)}
                      </MenuItem>
                    ))}
                  </Select>
                )}
                {!isAdmin ? (
                  <Tooltip title="User loeschen">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={!canEdit || deletingId === item.id}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default UserManagement;
