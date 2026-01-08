import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import ContentBlocks from './ContentBlocks';
import {
  ContentSection,
  createContentSection,
  createSectionHistory,
  deleteContentSection,
  listContentSections,
  listSectionHistory,
  SectionHistoryEntry,
  updateContentSectionTitle
} from '../lib/contentSections';
import { diffLines } from '../lib/diffLines';
import { listContentBlocks } from '../lib/contentBlocks';

type SectionPanelProps = {
  pageSectionId: string;
  titleKey: string;
  bodyKey?: string;
  placeholderBodyKey?: string;
  showPlaceholder: boolean;
  placeholderIconSrc?: string;
};

const SectionPanel: React.FC<SectionPanelProps> = ({
  pageSectionId,
  titleKey,
  bodyKey,
  placeholderBodyKey,
  showPlaceholder,
  placeholderIconSrc
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sections, setSections] = React.useState<ContentSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [addOpen, setAddOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyItems, setHistoryItems] = React.useState<SectionHistoryEntry[]>([]);
  const [historySection, setHistorySection] = React.useState<ContentSection | null>(null);
  const [editingTitleId, setEditingTitleId] = React.useState<string | null>(null);
  const [titleDraft, setTitleDraft] = React.useState('');
  const [titleSavingId, setTitleSavingId] = React.useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'leitung';

  const loadSections = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listContentSections(pageSectionId);
      setSections(data);
    } catch {
      setError('Abschnitte konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [pageSectionId]);

  React.useEffect(() => {
    loadSections();
  }, [loadSections]);

  const handleAddSection = async () => {
    if (!user || !newTitle.trim()) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await createContentSection({
        pageSectionId,
        title: newTitle.trim(),
        ownerId: user.id,
        ownerName: user.name
      });
      setSections((prev) => [...prev, created]);
      setNewTitle('');
      setAddOpen(false);
    } catch {
      setError('Abschnitt konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  };

  const buildSnapshot = React.useCallback(
    (title: string, blocks: { type: string; content: string | null; imageUrl: string | null; width: number; orderIndex: number }[]) =>
      JSON.stringify({ title, blocks }, null, 2),
    []
  );

  const handleHistoryRecord = React.useCallback(
    async (sectionId: string, beforeSnapshot: string, afterSnapshot: string) => {
      if (!user) {
        return;
      }
      try {
        await createSectionHistory({
          sectionId,
          editorId: user.id,
          editorName: user.name,
          beforeSnapshot,
          afterSnapshot
        });
      } catch {
        // Ignore history failures.
      }
    },
    [user]
  );

  const openHistory = async (section: ContentSection) => {
    try {
      const data = await listSectionHistory(section.id);
      setHistoryItems(data);
      setHistorySection(section);
      setHistoryOpen(true);
    } catch {
      setError('Historie konnte nicht geladen werden.');
    }
  };

  const buildSectionSnapshot = async (section: ContentSection) => {
    const blocks = await listContentBlocks(section.id);
    return JSON.stringify(
      {
        title: section.title,
        blocks: blocks.map((block) => ({
          type: block.type,
          content: block.content ?? null,
          imageUrl: block.imageUrl ?? null,
          width: block.width,
          orderIndex: block.orderIndex
        }))
      },
      null,
      2
    );
  };

  const handleTitleEdit = (section: ContentSection) => {
    setEditingTitleId(section.id);
    setTitleDraft(section.title);
  };

  const handleTitleSave = async (section: ContentSection) => {
    if (!titleDraft.trim()) {
      return;
    }
    setTitleSavingId(section.id);
    setError('');
    try {
      const beforeSnapshot = await buildSectionSnapshot(section);
      const updated = await updateContentSectionTitle(section.id, titleDraft.trim());
      const afterSnapshot = await buildSectionSnapshot({ ...section, title: updated.title });
      await handleHistoryRecord(section.id, beforeSnapshot, afterSnapshot);
      setSections((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingTitleId(null);
      setTitleDraft('');
    } catch {
      setError('Ueberschrift konnte nicht gespeichert werden.');
    } finally {
      setTitleSavingId(null);
    }
  };

  const handleDeleteSection = async (section: ContentSection) => {
    const confirmed = window.confirm(`Abschnitt "${section.title}" wirklich loeschen?`);
    if (!confirmed) {
      return;
    }
    setError('');
    try {
      await deleteContentSection(section.id);
      setSections((prev) => prev.filter((item) => item.id !== section.id));
    } catch {
      setError('Abschnitt konnte nicht geloescht werden.');
    }
  };

  const hasContentSections = sections.length > 0;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 2
        }}
      >
        <Typography variant="h3" sx={{ color: '#0088ff', fontWeight: 700 }}>
          {t(titleKey)}
        </Typography>
        {isStaff ? (
          <IconButton
            color="primary"
            onClick={() => setAddOpen(true)}
            aria-label="Abschnitt hinzufuegen"
          >
            <AddIcon />
          </IconButton>
        ) : null}
      </Box>

      {bodyKey ? (
        <Typography sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, mb: 2 }}>{t(bodyKey)}</Typography>
      ) : null}

      {!bodyKey && showPlaceholder && !loading && !hasContentSections && placeholderBodyKey ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#0b57d0', mb: 2 }}>
          {placeholderIconSrc ? (
            <Box
              component="img"
              src={placeholderIconSrc}
              alt="Platzhalter"
              sx={{ width: 42, height: 42, objectFit: 'contain' }}
            />
          ) : null}
          <Typography sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
            {t(placeholderBodyKey)}
          </Typography>
        </Box>
      ) : null}

      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {loading ? null : (
        <Box sx={{ display: 'grid', gap: 4 }}>
          {sections.map((section) => {
            const canEditSection = isAdmin || section.ownerId === user?.id;
            const isEditingTitle = editingTitleId === section.id;
            const isSavingTitle = titleSavingId === section.id;
            return (
              <Box key={section.id} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                    gap: 2,
                    flexWrap: 'wrap'
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    {isEditingTitle ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          value={titleDraft}
                          onChange={(event) => setTitleDraft(event.target.value)}
                          size="small"
                          fullWidth
                        />
                        <IconButton
                          color="primary"
                          onClick={() => handleTitleSave(section)}
                          disabled={isSavingTitle}
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {section.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {section.ownerName}
                        </Typography>
                      </>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {canEditSection ? (
                      <IconButton size="small" onClick={() => handleTitleEdit(section)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {canEditSection ? (
                      <IconButton size="small" onClick={() => handleDeleteSection(section)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {isAdmin ? (
                      <Button
                        size="small"
                        startIcon={<HistoryIcon />}
                        onClick={() => openHistory(section)}
                      >
                        Historie
                      </Button>
                    ) : null}
                  </Box>
                </Box>
                <ContentBlocks
                  contentSectionId={section.id}
                  buildSnapshot={(blocks) =>
                    buildSnapshot(
                      section.title,
                      blocks.map((block) => ({
                        type: block.type,
                        content: block.content ?? null,
                        imageUrl: block.imageUrl ?? null,
                        width: block.width,
                        orderIndex: block.orderIndex
                      }))
                    )
                  }
                  onHistory={(beforeSnapshot, afterSnapshot) =>
                    handleHistoryRecord(section.id, beforeSnapshot, afterSnapshot)
                  }
                  canEdit={canEditSection}
                  editing={canEditSection}
                />
              </Box>
            );
          })}
        </Box>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuen Abschnitt anlegen</DialogTitle>
        <DialogContent>
          <TextField
            label="Ueberschrift"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleAddSection} disabled={saving || !newTitle.trim()}>
            Abschnitt erstellen
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Historie {historySection ? `- ${historySection.title}` : ''}</DialogTitle>
        <DialogContent>
          {historyItems.length === 0 ? (
            <Typography color="text.secondary">Noch keine Aenderungen.</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 3 }}>
              {historyItems.map((entry) => {
                const diff = diffLines(entry.beforeSnapshot, entry.afterSnapshot);
                return (
                  <Box key={entry.id} sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.12)', p: 2 }}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Schliessen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SectionPanel;
