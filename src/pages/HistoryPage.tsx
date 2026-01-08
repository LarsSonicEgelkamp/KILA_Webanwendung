import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { listUserHistory } from '../lib/contentSections';
import { diffLines } from '../lib/diffLines';

const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [entries, setEntries] = React.useState<
    Array<{
      id: string;
      editorName: string;
      createdAt: string;
      beforeSnapshot: string;
      afterSnapshot: string;
    }>
  >([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!user) {
      return;
    }
    const load = async () => {
      try {
        const data = await listUserHistory(user.id);
        setEntries(
          data.map((item) => ({
            id: item.id,
            editorName: item.editorName,
            createdAt: item.createdAt,
            beforeSnapshot: item.beforeSnapshot,
            afterSnapshot: item.afterSnapshot
          }))
        );
      } catch {
        setError('Historie konnte nicht geladen werden.');
      }
    };
    load();
  }, [user]);

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

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h4" sx={{ color: '#0088ff', fontWeight: 700, mb: 3 }}>
        {t('menu.account.history')}
      </Typography>
      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}
      {entries.length === 0 ? (
        <Typography color="text.secondary">Noch keine Aenderungen.</Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {entries.map((entry) => {
            const diff = diffLines(entry.beforeSnapshot, entry.afterSnapshot);
            return (
              <Box
                key={entry.id}
                sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.12)', p: 2 }}
              >
                <Typography sx={{ fontWeight: 700, mb: 1 }}>
                  {entry.editorName} - {new Date(entry.createdAt).toLocaleString('de-DE')}
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    fontSize: '0.85rem',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Consolas, Menlo, Monaco, monospace'
                  }}
                >
                  {diff.map((line, index) => (
                    <Box
                      key={`${entry.id}-${index}`}
                      component="span"
                      sx={{
                        display: 'block',
                        color:
                          line.type === 'add'
                            ? '#1b5e20'
                            : line.type === 'remove'
                              ? '#b71c1c'
                              : 'inherit',
                        bgcolor:
                          line.type === 'add'
                            ? 'rgba(46, 204, 113, 0.15)'
                            : line.type === 'remove'
                              ? 'rgba(231, 76, 60, 0.12)'
                              : 'transparent'
                      }}
                    >
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} {line.text}
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default HistoryPage;
