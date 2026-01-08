import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
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
  updateContentSection
} from '../lib/contentSections';
import { diffLines } from '../lib/diffLines';
import { BlockType } from '../lib/contentBlocks';

type SectionPanelProps = {
  pageSectionId: string;
  titleKey: string;
  bodyKey?: string;
  placeholderBodyKey?: string;
  showPlaceholder: boolean;
  placeholderIconSrc?: string;
  allowedBlockTypes?: BlockType[];
};

const SectionPanel: React.FC<SectionPanelProps> = ({
  pageSectionId,
  titleKey,
  bodyKey,
  placeholderBodyKey,
  showPlaceholder,
  placeholderIconSrc,
  allowedBlockTypes
}) => {
  const { t } = useTranslation();
  const { user, users } = useAuth();
  const [sections, setSections] = React.useState<ContentSection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [addOpen, setAddOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyItems, setHistoryItems] = React.useState<SectionHistoryEntry[]>([]);
  const [historySection, setHistorySection] = React.useState<ContentSection | null>(null);
  const [titleDrafts, setTitleDrafts] = React.useState<Record<string, string>>({});
  const [editingSections, setEditingSections] = React.useState<Record<string, boolean>>({});
  const [commitSignals, setCommitSignals] = React.useState<Record<string, number>>({});
  const [savingSections, setSavingSections] = React.useState<Record<string, boolean>>({});
  const [metaDrafts, setMetaDrafts] = React.useState<
    Record<string, { showAuthor: boolean; showPublishDate: boolean; publishDate: string }>
  >({});
  const [accessDialogOpen, setAccessDialogOpen] = React.useState(false);
  const [accessTarget, setAccessTarget] = React.useState<ContentSection | null>(null);
  const [accessSelection, setAccessSelection] = React.useState<string[]>([]);
  const [accessSaving, setAccessSaving] = React.useState(false);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'leitung';

  const formatPublishDate = React.useCallback((value?: string | null) => {
    if (!value) {
      return '';
    }
    const normalized = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }, []);

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

  const handleStartEdit = (section: ContentSection) => {
    setEditingSections((prev) => ({ ...prev, [section.id]: true }));
    setTitleDrafts((prev) => ({
      ...prev,
      [section.id]: prev[section.id] ?? section.title
    }));
    setMetaDrafts((prev) => ({
      ...prev,
      [section.id]: {
        showAuthor: section.showAuthor,
        showPublishDate: section.showPublishDate,
        publishDate: section.publishDate ?? ''
      }
    }));
  };

  const handleCommitEdit = async (section: ContentSection) => {
    setSavingSections((prev) => ({ ...prev, [section.id]: true }));
    setError('');
    const draftTitle = (titleDrafts[section.id] ?? section.title).trim();
    if (!draftTitle) {
      setError('Ueberschrift darf nicht leer sein.');
      setSavingSections((prev) => ({ ...prev, [section.id]: false }));
      return;
    }
    const metaDraft = metaDrafts[section.id] ?? {
      showAuthor: section.showAuthor,
      showPublishDate: section.showPublishDate,
      publishDate: section.publishDate ?? ''
    };
    const normalizedPublishDate = metaDraft.publishDate.trim() || null;
    const updates: {
      title?: string;
      showAuthor?: boolean;
      showPublishDate?: boolean;
      publishDate?: string | null;
    } = {};
    if (draftTitle !== section.title) {
      updates.title = draftTitle;
    }
    if (metaDraft.showAuthor !== section.showAuthor) {
      updates.showAuthor = metaDraft.showAuthor;
    }
    if (metaDraft.showPublishDate !== section.showPublishDate) {
      updates.showPublishDate = metaDraft.showPublishDate;
    }
    if ((section.publishDate ?? '') !== (normalizedPublishDate ?? '')) {
      updates.publishDate = normalizedPublishDate;
    }
    if (Object.keys(updates).length > 0) {
      try {
        const updated = await updateContentSection(section.id, updates);
        setSections((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } catch {
        setError('Abschnitt konnte nicht gespeichert werden.');
        setSavingSections((prev) => ({ ...prev, [section.id]: false }));
        return;
      }
    }
    setCommitSignals((prev) => ({ ...prev, [section.id]: (prev[section.id] ?? 0) + 1 }));
  };

  const handleCommitComplete = (sectionId: string, success: boolean) => {
    setSavingSections((prev) => ({ ...prev, [sectionId]: false }));
    if (success) {
      setEditingSections((prev) => ({ ...prev, [sectionId]: false }));
      setTitleDrafts((prev) => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
      setMetaDrafts((prev) => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
    }
  };

  const openAccessDialog = (section: ContentSection) => {
    setAccessTarget(section);
    setAccessSelection(section.editorIds ?? []);
    setAccessDialogOpen(true);
  };

  const closeAccessDialog = () => {
    setAccessDialogOpen(false);
    setAccessTarget(null);
    setAccessSelection([]);
  };

  const handleAccessSave = async () => {
    if (!accessTarget) {
      return;
    }
    setAccessSaving(true);
    setError('');
    try {
      const updated = await updateContentSection(accessTarget.id, { editorIds: accessSelection });
      setSections((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      closeAccessDialog();
    } catch {
      setError('Bearbeiter konnten nicht gespeichert werden.');
    } finally {
      setAccessSaving(false);
    }
  };

  const hasContentSections = sections.length > 0;
  const availableEditors = accessTarget
    ? users.filter((item) => item.id !== accessTarget.ownerId)
    : users;

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
            const isAssignedEditor = user?.id ? section.editorIds.includes(user.id) : false;
            const canEditSection = isAdmin || section.ownerId === user?.id || isAssignedEditor;
            const isEditingSection = Boolean(editingSections[section.id]);
            const isSavingSection = Boolean(savingSections[section.id]);
            const titleValue = titleDrafts[section.id] ?? section.title;
            const metaDraft = metaDrafts[section.id] ?? {
              showAuthor: section.showAuthor,
              showPublishDate: section.showPublishDate,
              publishDate: section.publishDate ?? ''
            };
            const publishedMeta: string[] = [];
            if (section.showAuthor) {
              publishedMeta.push(`Autor: ${section.ownerName}`);
            }
            if (section.showPublishDate) {
              publishedMeta.push(
                section.publishDate ? `Veroeffentlicht am ${formatPublishDate(section.publishDate)}` : 'Veroeffentlicht am: offen'
              );
            }
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
                    {isEditingSection ? (
                      <Box sx={{ display: 'grid', gap: 1.5 }}>
                        <TextField
                          value={titleValue}
                          onChange={(event) =>
                            setTitleDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))
                          }
                          size="small"
                          fullWidth
                        />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={metaDraft.showAuthor}
                                onChange={(event) =>
                                  setMetaDrafts((prev) => ({
                                    ...prev,
                                    [section.id]: {
                                      ...metaDraft,
                                      showAuthor: event.target.checked
                                    }
                                  }))
                                }
                              />
                            }
                            label="Autor anzeigen"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={metaDraft.showPublishDate}
                                onChange={(event) =>
                                  setMetaDrafts((prev) => ({
                                    ...prev,
                                    [section.id]: {
                                      ...metaDraft,
                                      showPublishDate: event.target.checked
                                    }
                                  }))
                                }
                              />
                            }
                            label="Veroeffentlichungsdatum anzeigen"
                          />
                          <TextField
                            label="Veroeffentlichungsdatum"
                            type="date"
                            value={metaDraft.publishDate}
                            onChange={(event) =>
                              setMetaDrafts((prev) => ({
                                ...prev,
                                [section.id]: {
                                  ...metaDraft,
                                  publishDate: event.target.value
                                }
                              }))
                            }
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            disabled={!metaDraft.showPublishDate}
                          />
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {section.title}
                        </Typography>
                        {publishedMeta.length > 0 ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {publishedMeta.join(' | ')}
                          </Typography>
                        ) : null}
                        {isStaff && !section.showAuthor ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Autor (intern): {section.ownerName}
                          </Typography>
                        ) : null}
                      </>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {canEditSection ? (
                      isEditingSection ? (
                        <IconButton
                          size="small"
                          onClick={() => handleCommitEdit(section)}
                          disabled={isSavingSection}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      ) : (
                        <IconButton size="small" onClick={() => handleStartEdit(section)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )
                    ) : null}
                    {canEditSection ? (
                      <IconButton size="small" onClick={() => handleDeleteSection(section)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    {isAdmin ? (
                      <Button size="small" onClick={() => openAccessDialog(section)}>
                        Bearbeiter
                      </Button>
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
                  editing={canEditSection && isEditingSection}
                  allowedBlockTypes={allowedBlockTypes}
                  commitSignal={commitSignals[section.id]}
                  onCommitComplete={(success) => handleCommitComplete(section.id, success)}
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
            sx={{ mt: 1.5 }}
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

      <Dialog open={accessDialogOpen} onClose={closeAccessDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Bearbeiter festlegen</DialogTitle>
        <DialogContent>
          {accessTarget ? (
            <Typography sx={{ mb: 2 }} color="text.secondary">
              Abschnitt: {accessTarget.title}
            </Typography>
          ) : null}
          {availableEditors.length === 0 ? (
            <Typography color="text.secondary">Keine weiteren Benutzer verfuegbar.</Typography>
          ) : (
            <FormControl fullWidth>
              <InputLabel id="section-editors-label">Bearbeiter</InputLabel>
              <Select
                labelId="section-editors-label"
                multiple
                value={accessSelection}
                label="Bearbeiter"
                onChange={(event) => {
                  const value = event.target.value as string[];
                  setAccessSelection(value);
                }}
                renderValue={(selected) => {
                  const selectedIds = selected as string[];
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedIds.map((id) => {
                        const editor = users.find((item) => item.id === id);
                        return <Chip key={id} label={editor ? editor.name : id} size="small" />;
                      })}
                    </Box>
                  );
                }}
              >
                {availableEditors.map((editor) => (
                  <MenuItem key={editor.id} value={editor.id}>
                    <Checkbox checked={accessSelection.includes(editor.id)} />
                    <ListItemText primary={editor.name} secondary={editor.email} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Besitzer koennen immer bearbeiten.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAccessDialog} disabled={accessSaving}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleAccessSave} disabled={accessSaving}>
            Speichern
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
