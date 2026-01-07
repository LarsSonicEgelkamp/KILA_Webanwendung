import React from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TitleIcon from '@mui/icons-material/Title';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  ContentBlock,
  BlockType,
  createContentBlock,
  deleteContentBlock,
  listContentBlocks,
  updateContentBlock,
  uploadContentImage
} from '../lib/contentBlocks';

type ContentBlocksProps = {
  sectionId: string;
  canEdit: boolean;
  editing: boolean;
};

type ResizeState = {
  id: string;
  startX: number;
  startWidth: number;
};

const clampWidth = (value: number) => Math.min(12, Math.max(3, value));

const ContentBlocks: React.FC<ContentBlocksProps> = ({ sectionId, canEdit, editing }) => {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [resizeState, setResizeState] = React.useState<ResizeState | null>(null);
  const [replaceTargetId, setReplaceTargetId] = React.useState<string | null>(null);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const loadBlocks = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listContentBlocks(sectionId);
      setBlocks(data);
    } catch (err) {
      setError('Fehler beim Laden der Inhalte.');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  React.useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
  };

  const getNextOrderIndex = () =>
    blocks.length === 0 ? 1 : Math.max(...blocks.map((block) => block.orderIndex)) + 1;

  const handleCreateBlock = async (type: BlockType) => {
    closeMenu();
    if (type === 'image') {
      setReplaceTargetId(null);
      fileInputRef.current?.click();
      return;
    }
    try {
      const newBlock = await createContentBlock({
        sectionId,
        type,
        content: '',
        width: 12,
        orderIndex: getNextOrderIndex()
      });
      setBlocks((prev) => [...prev, newBlock]);
    } catch {
      setError('Konnte Block nicht anlegen.');
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      setUploading(true);
      const imageUrl = await uploadContentImage(sectionId, file);
      if (replaceTargetId) {
        const updated = await updateContentBlock(replaceTargetId, { imageUrl });
        setBlocks((prev) => prev.map((block) => (block.id === updated.id ? updated : block)));
      } else {
        const newBlock = await createContentBlock({
          sectionId,
          type: 'image',
          imageUrl,
          width: 6,
          orderIndex: getNextOrderIndex()
        });
        setBlocks((prev) => [...prev, newBlock]);
      }
    } catch {
      setError('Bild konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
      setReplaceTargetId(null);
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
      const updated = await updateContentBlock(id, { content: block.content ?? '' });
      setBlocks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError('Aenderung konnte nicht gespeichert werden.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContentBlock(id);
      setBlocks((prev) => prev.filter((block) => block.id !== id));
    } catch {
      setError('Block konnte nicht entfernt werden.');
    }
  };

  const handleResizeStart = (event: React.MouseEvent, block: ContentBlock) => {
    event.preventDefault();
    setResizeState({ id: block.id, startX: event.clientX, startWidth: block.width });
  };

  React.useEffect(() => {
    if (!resizeState) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
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
        const updated = await updateContentBlock(target.id, { width: target.width });
        setBlocks((prev) => prev.map((block) => (block.id === updated.id ? updated : block)));
      } catch {
        setError('Breite konnte nicht gespeichert werden.');
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [blocks, resizeState]);

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

      <Box
        ref={gridRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: 2
        }}
      >
        {blocks.map((block) => (
          <Box
            key={block.id}
            sx={{
              gridColumn: `span ${block.width}`,
              position: 'relative',
              p: editing ? 2 : 0,
              borderRadius: 2,
              border: editing ? '1px solid rgba(0,0,0,0.08)' : 'none',
              bgcolor: editing ? 'rgba(255,255,255,0.6)' : 'transparent'
            }}
          >
            {block.type === 'heading' ? (
              editing ? (
                <TextField
                  value={block.content ?? ''}
                  onChange={(event) => handleContentChange(block.id, event.target.value)}
                  onBlur={() => handleContentSave(block.id)}
                  placeholder="Ueberschrift"
                  fullWidth
                  size="small"
                />
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {block.content}
                </Typography>
              )
            ) : null}

            {block.type === 'text' ? (
              editing ? (
                <TextField
                  value={block.content ?? ''}
                  onChange={(event) => handleContentChange(block.id, event.target.value)}
                  onBlur={() => handleContentSave(block.id)}
                  placeholder="Text"
                  fullWidth
                  multiline
                  minRows={3}
                  inputProps={{ maxLength: 1000 }}
                  helperText={`${(block.content ?? '').length}/1000`}
                />
              ) : (
                <Typography sx={{ fontSize: '1rem' }}>{block.content}</Typography>
              )
            ) : null}

            {block.type === 'image' ? (
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: editing ? '1px solid rgba(0,0,0,0.08)' : 'none'
                }}
              >
                {block.imageUrl ? (
                  <Box component="img" src={block.imageUrl} alt="" sx={{ width: '100%', height: 'auto' }} />
                ) : (
                  <Box
                    sx={{
                      minHeight: 120,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.secondary'
                    }}
                  >
                    Kein Bild
                  </Box>
                )}
                {editing ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
                    <Button
                      size="small"
                      startIcon={<ImageIcon />}
                      onClick={() => {
                        setReplaceTargetId(block.id);
                        fileInputRef.current?.click();
                      }}
                    >
                      Bild tauschen
                    </Button>
                  </Box>
                ) : null}
              </Box>
            ) : null}

            {editing ? (
              <Box sx={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 0.5 }}>
                <IconButton size="small" onClick={() => handleDelete(block.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : null}

            {editing ? (
              <Box
                sx={{
                  position: 'absolute',
                  right: -6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'ew-resize',
                  color: 'rgba(0,0,0,0.35)'
                }}
                onMouseDown={(event) => handleResizeStart(event, block)}
              >
                <DragIndicatorIcon fontSize="small" />
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>

      {canEdit && editing ? (
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openMenu}
            disabled={uploading}
          >
            Block hinzufuegen
          </Button>
          {uploading ? <Typography variant="body2">Upload laeuft...</Typography> : null}
        </Box>
      ) : null}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => handleCreateBlock('heading')}>
          <TitleIcon sx={{ mr: 1 }} /> Ueberschrift (einzeilig)
        </MenuItem>
        <MenuItem onClick={() => handleCreateBlock('text')}>
          <TextFieldsIcon sx={{ mr: 1 }} /> Textfeld gross
        </MenuItem>
        <MenuItem onClick={() => handleCreateBlock('image')}>
          <ImageIcon sx={{ mr: 1 }} /> Bild hochladen
        </MenuItem>
      </Menu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageSelect}
      />
    </Box>
  );
};

export default ContentBlocks;
