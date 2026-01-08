import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TitleIcon from '@mui/icons-material/Title';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ImageCropDialog from './ImageCropDialog';
import {
  ContentBlock,
  BlockType,
  createContentBlock,
  deleteContentBlock,
  deleteContentImage,
  listContentBlocks,
  updateContentBlock,
  uploadContentImage
} from '../lib/contentBlocks';

type ContentBlocksProps = {
  contentSectionId: string;
  buildSnapshot?: (blocks: ContentBlock[]) => string;
  onHistory?: (beforeSnapshot: string, afterSnapshot: string) => void;
  canEdit: boolean;
  editing: boolean;
  onHasBlocksChange?: (hasBlocks: boolean) => void;
};

type ResizeState = {
  id: string;
  startX: number;
  startWidth: number;
};

const clampWidth = (value: number) => Math.min(12, Math.max(3, value));

const ContentBlocks: React.FC<ContentBlocksProps> = ({
  contentSectionId,
  buildSnapshot,
  onHistory,
  canEdit,
  editing,
  onHasBlocksChange
}) => {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [menuContext, setMenuContext] = React.useState<{
    anchorEl: HTMLElement | null;
    insertIndex: number;
    preferredWidth?: number;
    allowedTypes?: BlockType[];
  }>({
    anchorEl: null,
    insertIndex: 0,
    preferredWidth: undefined,
    allowedTypes: undefined
  });
  const [uploading, setUploading] = React.useState(false);
  const [resizeState, setResizeState] = React.useState<ResizeState | null>(null);
  const [replaceTargetId, setReplaceTargetId] = React.useState<string | null>(null);
  const [pendingInsertIndex, setPendingInsertIndex] = React.useState<number | null>(null);
  const [pendingInsertWidth, setPendingInsertWidth] = React.useState<number | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const saveTimers = React.useRef<Record<string, number>>({});
  const latestContent = React.useRef<Record<string, string>>({});
  const blocksRef = React.useRef<ContentBlock[]>([]);
  const wasEditing = React.useRef(editing);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  React.useEffect(
    () => () => {
      Object.values(saveTimers.current).forEach((timerId) => window.clearTimeout(timerId));
      saveTimers.current = {};
    },
    []
  );

  const loadBlocks = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listContentBlocks(contentSectionId);
      setBlocks(data);
    } catch (err) {
      setError('Fehler beim Laden der Inhalte.');
    } finally {
      setLoading(false);
    }
  }, [contentSectionId]);

  React.useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  React.useEffect(() => {
    onHasBlocksChange?.(blocks.length > 0);
  }, [blocks.length, onHasBlocksChange]);

  React.useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const recordHistory = (beforeBlocks: ContentBlock[], afterBlocks: ContentBlock[]) => {
    if (!buildSnapshot || !onHistory) {
      return;
    }
    const beforeSnapshot = buildSnapshot(beforeBlocks);
    const afterSnapshot = buildSnapshot(afterBlocks);
    if (beforeSnapshot === afterSnapshot) {
      return;
    }
    onHistory(beforeSnapshot, afterSnapshot);
  };

  const isBlockEmpty = (block: ContentBlock) => {
    if (block.type === 'image') {
      return !block.imageUrl;
    }
    const content = (block.content ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    return content.length === 0;
  };

  const cleanupEmptyBlocks = async () => {
    const emptyBlocks = blocks.filter(isBlockEmpty);
    if (emptyBlocks.length === 0) {
      return;
    }
    try {
      await Promise.all(
        emptyBlocks.map(async (block) => {
          await deleteContentBlock(block.id);
          if (block.imageUrl) {
            await deleteContentImage(block.imageUrl);
          }
        })
      );
      const remaining = blocks.filter((block) => !emptyBlocks.some((empty) => empty.id === block.id));
      setBlocks(remaining);
      onHasBlocksChange?.(remaining.length > 0);
    } catch {
      setError('Leere Bloecke konnten nicht entfernt werden.');
    }
  };

  React.useEffect(() => {
    if (wasEditing.current && !editing) {
      cleanupEmptyBlocks();
    }
    wasEditing.current = editing;
  }, [editing, blocks]);

  const openMenu = (
    event: React.MouseEvent<HTMLElement>,
    insertIndex: number,
    preferredWidth?: number,
    allowedTypes?: BlockType[]
  ) => {
    setMenuContext({ anchorEl: event.currentTarget, insertIndex, preferredWidth, allowedTypes });
  };

  const closeMenu = () => {
    setMenuContext({ anchorEl: null, insertIndex: blocks.length, preferredWidth: undefined, allowedTypes: undefined });
  };

  const persistOrder = async (nextBlocks: ContentBlock[], originalMap: Map<string, number>) => {
    const normalized = nextBlocks.map((block, index) => ({ ...block, orderIndex: index + 1 }));
    const changed = normalized.filter((block) => originalMap.get(block.id) !== block.orderIndex);
    if (changed.length === 0) {
      return normalized;
    }
    try {
      const updatedBlocks = await Promise.all(
        changed.map((block) => updateContentBlock(block.id, { orderIndex: block.orderIndex }))
      );
      const updatedMap = new Map(updatedBlocks.map((block) => [block.id, block]));
      return normalized.map((block) => updatedMap.get(block.id) ?? block);
    } catch {
      setError('Reihenfolge konnte nicht gespeichert werden.');
      return normalized;
    }
  };

  const insertBlockAt = async (
    type: BlockType,
    insertIndex: number,
    imageUrl?: string,
    preferredWidth?: number
  ) => {
    try {
      const beforeBlocks = blocks;
      const width = clampWidth(preferredWidth ?? (type === 'image' ? 6 : 12));
      const newBlock = await createContentBlock({
        sectionId: contentSectionId,
        type,
        content: type === 'image' ? null : '',
        imageUrl: type === 'image' ? imageUrl ?? null : null,
        width,
        orderIndex: insertIndex + 1
      });
      const nextBlocks = [...blocks];
      nextBlocks.splice(insertIndex, 0, newBlock);
      const originalMap = new Map(blocks.map((block) => [block.id, block.orderIndex]));
      originalMap.set(newBlock.id, newBlock.orderIndex);
      const ordered = await persistOrder(nextBlocks, originalMap);
      setBlocks(ordered);
      recordHistory(beforeBlocks, ordered);
    } catch {
      setError('Konnte Block nicht anlegen.');
    }
  };

  const handleCreateBlock = async (type: BlockType) => {
    closeMenu();
    if (type === 'image') {
      setReplaceTargetId(null);
      setPendingInsertIndex(menuContext.insertIndex);
      setPendingInsertWidth(menuContext.preferredWidth ?? null);
      setCropDialogOpen(true);
      return;
    }
    await insertBlockAt(type, menuContext.insertIndex, undefined, menuContext.preferredWidth);
  };

  const handleCroppedImage = async (file: File) => {
    try {
      setUploading(true);
      const imageUrl = await uploadContentImage(contentSectionId, file);
      if (replaceTargetId) {
        const beforeBlocks = blocks;
        const target = blocks.find((block) => block.id === replaceTargetId);
        const updated = await updateContentBlock(replaceTargetId, { imageUrl });
        const nextBlocks = blocks.map((block) => (block.id === updated.id ? updated : block));
        setBlocks(nextBlocks);
        recordHistory(beforeBlocks, nextBlocks);
        if (target?.imageUrl) {
          await deleteContentImage(target.imageUrl);
        }
      } else if (pendingInsertIndex !== null) {
        await insertBlockAt('image', pendingInsertIndex, imageUrl, pendingInsertWidth ?? undefined);
      }
      setCropDialogOpen(false);
    } catch {
      setError('Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
      setReplaceTargetId(null);
      setPendingInsertIndex(null);
      setPendingInsertWidth(null);
    }
  };

  const handleContentChange = (id: string, value: string) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, content: value } : block)));
  };

  const handleContentSave = async (id: string) => {
    const block = blocks.find((item) => item.id === id);
    if (!block) {
      return;
    }
    try {
      const beforeBlocks = blocks;
      const updated = await updateContentBlock(id, { content: block.content ?? '' });
      const nextBlocks = blocks.map((item) => (item.id === updated.id ? updated : item));
      setBlocks(nextBlocks);
      recordHistory(beforeBlocks, nextBlocks);
    } catch {
      setError('Aenderung konnte nicht gespeichert werden.');
    }
  };

  const scheduleContentSave = (id: string, value: string) => {
    if (saveTimers.current[id]) {
      window.clearTimeout(saveTimers.current[id]);
    }
    latestContent.current[id] = value;
    handleContentChange(id, value);
    saveTimers.current[id] = window.setTimeout(async () => {
      const payload = latestContent.current[id] ?? '';
      try {
        const updated = await updateContentBlock(id, { content: payload });
        setBlocks((prev) => {
          const nextBlocks = prev.map((item) => (item.id === updated.id ? updated : item));
          recordHistory(prev, nextBlocks);
          return nextBlocks;
        });
      } catch {
        setError('Aenderung konnte nicht gespeichert werden.');
      }
    }, 600);
  };

  const isHtmlContent = (value?: string | null) => {
    if (!value) {
      return false;
    }
    return /<\/?[a-z][\s\S]*>/i.test(value);
  };

  const formatPlainText = (value?: string | null) => {
    if (!value) {
      return '';
    }
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const paragraphs = escaped.split(/\n{2,}/).map((para) => para.replace(/\n/g, '<br/>'));
    return paragraphs.map((para) => `<p>${para}</p>`).join('');
  };

  const quillModules = React.useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean']
      ]
    }),
    []
  );

  const handleDelete = async (id: string) => {
    try {
      const beforeBlocks = blocks;
      const target = blocks.find((block) => block.id === id);
      await deleteContentBlock(id);
      if (target?.imageUrl) {
        await deleteContentImage(target.imageUrl);
      }
      const nextBlocks = blocks.filter((block) => block.id !== id);
      setBlocks(nextBlocks);
      recordHistory(beforeBlocks, nextBlocks);
      onHasBlocksChange?.(nextBlocks.length > 0);
    } catch {
      setError('Block konnte nicht entfernt werden.');
    }
  };

  const handleResizeStart = (event: React.PointerEvent, block: ContentBlock) => {
    event.preventDefault();
    setResizeState({ id: block.id, startX: event.clientX, startWidth: block.width });
  };

  React.useEffect(() => {
    if (!resizeState) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      const gridWidth = gridRef.current?.getBoundingClientRect().width ?? 0;
      if (!gridWidth) {
        return;
      }
      const columnWidth = gridWidth / 12;
      const delta = event.clientX - resizeState.startX;
      const nextWidth = clampWidth(Math.round(resizeState.startWidth + delta / columnWidth));
      setBlocks((prev) =>
        prev.map((block) => (block.id === resizeState.id ? { ...block, width: nextWidth } : block))
      );
    };

    const handleUp = async () => {
      const target = blocks.find((block) => block.id === resizeState.id);
      setResizeState(null);
      if (!target) {
        return;
      }
      try {
        const beforeBlocks = blocksRef.current;
        const updated = await updateContentBlock(target.id, { width: target.width });
        setBlocks((prev) => {
          const nextBlocks = prev.map((block) => (block.id === updated.id ? updated : block));
          recordHistory(beforeBlocks, nextBlocks);
          return nextBlocks;
        });
      } catch {
        setError('Breite konnte nicht gespeichert werden.');
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [blocks, resizeState]);

  const handleDragStart = (event: React.DragEvent, id: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropIndex(null);
  };

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    setDropIndex(index);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
  };

  const handleDrop = async (event: React.DragEvent, index: number) => {
    event.preventDefault();
    const id = draggingId ?? event.dataTransfer.getData('text/plain');
    setDropIndex(null);
    setDraggingId(null);
    if (!id) {
      return;
    }
    const fromIndex = blocks.findIndex((block) => block.id === id);
    if (fromIndex === -1) {
      return;
    }
    if (fromIndex === index || fromIndex + 1 === index) {
      return;
    }
    const nextBlocks = blocks.filter((block) => block.id !== id);
    const insertIndex = index > fromIndex ? index - 1 : index;
    nextBlocks.splice(insertIndex, 0, blocks[fromIndex]);
    const originalMap = new Map(blocks.map((block) => [block.id, block.orderIndex]));
    const ordered = await persistOrder(nextBlocks, originalMap);
    setBlocks(ordered);
    recordHistory(blocks, ordered);
  };

  if (loading && blocks.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {canEdit && editing && blocks.length > 0 ? (
        <Box
          sx={{ mb: 2 }}
          onDragOver={(event) => handleDragOver(event, 0)}
          onDrop={(event) => handleDrop(event, 0)}
          onDragLeave={handleDragLeave}
        >
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={(event) => openMenu(event, 0)}
            disabled={uploading}
            sx={{ borderStyle: 'dashed', width: { xs: '100%', sm: 'auto' } }}
          >
            Block oben einfuegen
          </Button>
        </Box>
      ) : null}

      <Box
        ref={gridRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', md: 'repeat(12, minmax(0, 1fr))' },
          gap: { xs: 1.5, md: 2 },
          alignItems: 'stretch'
        }}
      >
        {blocks.map((block, index) => {
          let rowWidth = 0;
          let rowHasImage = false;
          for (let i = 0; i <= index; i += 1) {
            const current = blocks[i];
            if (rowWidth + current.width > 12) {
              rowWidth = 0;
              rowHasImage = false;
            }
            rowWidth += current.width;
            rowHasImage = rowHasImage || current.type === 'image';
          }
          const nextBlock = blocks[index + 1];
          const isRowEnd = !nextBlock || rowWidth + nextBlock.width > 12;
          const remainingWidth = 12 - rowWidth;
          const showInlineAdd = !isMobile && editing && isRowEnd && remainingWidth >= 3;
          const allowedInlineTypes = rowHasImage ? (['heading', 'text'] as BlockType[]) : undefined;
          return (
            <React.Fragment key={block.id}>
              <Box
                sx={{
                  gridColumn: { xs: '1 / -1', md: `span ${block.width}` },
                  position: 'relative',
                  p: editing ? { xs: 1.5, md: 2 } : 0,
                  pr: editing ? { xs: 3, md: 4 } : 0,
                  borderRadius: 2,
                  border: editing
                    ? dropIndex === index
                      ? '1px dashed #0088ff'
                      : '1px solid rgba(0,0,0,0.08)'
                    : 'none',
                  bgcolor: editing ? 'rgba(255,255,255,0.6)' : 'transparent',
                  opacity: draggingId === block.id ? 0.6 : 1
                }}
                onDragOver={editing ? (event) => handleDragOver(event, index) : undefined}
                onDrop={editing ? (event) => handleDrop(event, index) : undefined}
                onDragLeave={editing ? handleDragLeave : undefined}
              >
                {editing ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mb: 1
                    }}
                  >
                    <IconButton
                      size="small"
                      draggable
                      onDragStart={(event) => handleDragStart(event, block.id)}
                      onDragEnd={handleDragEnd}
                      sx={{ cursor: 'grab' }}
                    >
                      <DragIndicatorIcon fontSize="small" />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleDelete(block.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ) : null}

            {block.type === 'heading' ? (
              editing ? (
                <TextField
                  value={block.content ?? ''}
                  onChange={(event) => handleContentChange(block.id, event.target.value)}
                  onBlur={() => handleContentSave(block.id)}
                  placeholder="Ueberschrift"
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: (theme) => theme.typography.h5.fontSize,
                      fontWeight: (theme) => theme.typography.h5.fontWeight,
                      lineHeight: (theme) => theme.typography.h5.lineHeight
                    }
                  }}
                />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {block.content}
                </Typography>
              )
            ) : null}

            {block.type === 'text' ? (
              editing ? (
                <Box sx={{ '& .ql-toolbar': { borderRadius: '12px 12px 0 0' }, '& .ql-container': { borderRadius: '0 0 12px 12px' } }}>
                  <ReactQuill
                    theme="snow"
                    value={block.content ?? ''}
                    onChange={(value) => scheduleContentSave(block.id, value)}
                    modules={quillModules}
                    placeholder="Text"
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    fontSize: '1rem',
                    '& p': { margin: 0, marginBottom: 1.5 },
                    '& p:last-of-type': { marginBottom: 0 }
                  }}
                  dangerouslySetInnerHTML={{
                    __html: isHtmlContent(block.content) ? (block.content ?? '') : formatPlainText(block.content)
                  }}
                />
              )
            ) : null}

            {block.type === 'image' ? (
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: editing ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  bgcolor: 'rgba(0,0,0,0.04)'
                }}
              >
                {block.imageUrl ? (
                  <Box
                    component="img"
                    src={block.imageUrl}
                    alt=""
                    sx={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <Box
                    sx={{
                      minHeight: 160,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary'
                    }}
                  >
                    Noch kein Bild
                  </Box>
                )}
                {editing ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
                      <Button
                        size="small"
                        startIcon={<ImageIcon />}
                        onClick={() => {
                          setReplaceTargetId(block.id);
                          setCropDialogOpen(true);
                        }}
                      >
                        Bild tauschen
                      </Button>
                    </Box>
                ) : null}
              </Box>
            ) : null}

                {editing ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'ew-resize',
                      color: 'rgba(0,0,0,0.35)',
                      zIndex: 1,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      borderRadius: 999,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                    }}
                    onPointerDown={(event) => handleResizeStart(event, block)}
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </Box>
                ) : null}
              </Box>

                {showInlineAdd ? (
                  <Box
                    sx={{
                      gridColumn: `span ${remainingWidth}`,
                      borderRadius: 2,
                      border: dropIndex === index + 1 ? '1px dashed #0088ff' : '1px dashed rgba(0,0,0,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: { xs: 120, md: 160 },
                      height: '100%',
                      alignSelf: 'stretch',
                      px: 2
                    }}
                  onDragOver={(event) => handleDragOver(event, index + 1)}
                  onDrop={(event) => handleDrop(event, index + 1)}
                  onDragLeave={handleDragLeave}
                >
                  <Button
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={(event) => openMenu(event, index + 1, remainingWidth, allowedInlineTypes)}
                  >
                    Block hinzufuegen
                  </Button>
                </Box>
              ) : null}
            </React.Fragment>
          );
        })}
      </Box>

      {canEdit && editing ? (
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            border: dropIndex === blocks.length ? '1px dashed #0088ff' : '1px dashed rgba(0,0,0,0.3)',
            borderRadius: 2,
            p: 2,
            flexWrap: 'wrap'
          }}
          onDragOver={(event) => handleDragOver(event, blocks.length)}
          onDrop={(event) => handleDrop(event, blocks.length)}
          onDragLeave={handleDragLeave}
        >
          <Button
            variant="text"
            startIcon={<AddIcon />}
            onClick={(event) => openMenu(event, blocks.length)}
            disabled={uploading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Block hinzufuegen
          </Button>
          {uploading ? <Typography variant="body2">Upload laeuft...</Typography> : null}
        </Box>
      ) : null}

      <Menu anchorEl={menuContext.anchorEl} open={Boolean(menuContext.anchorEl)} onClose={closeMenu}>
        {!menuContext.allowedTypes || menuContext.allowedTypes.includes('heading') ? (
          <MenuItem onClick={() => handleCreateBlock('heading')}>
            <TitleIcon sx={{ mr: 1 }} /> Ueberschrift (einzeilig)
          </MenuItem>
        ) : null}
        {!menuContext.allowedTypes || menuContext.allowedTypes.includes('text') ? (
          <MenuItem onClick={() => handleCreateBlock('text')}>
            <TextFieldsIcon sx={{ mr: 1 }} /> Textfeld gross
          </MenuItem>
        ) : null}
        {!menuContext.allowedTypes || menuContext.allowedTypes.includes('image') ? (
          <MenuItem onClick={() => handleCreateBlock('image')}>
            <ImageIcon sx={{ mr: 1 }} /> Bild hochladen
          </MenuItem>
        ) : null}
      </Menu>

      <ImageCropDialog
        open={cropDialogOpen}
        onClose={() => {
          setCropDialogOpen(false);
          setPendingInsertIndex(null);
          setReplaceTargetId(null);
          setPendingInsertWidth(null);
        }}
        onConfirm={handleCroppedImage}
      />
    </Box>
  );
};

export default ContentBlocks;
