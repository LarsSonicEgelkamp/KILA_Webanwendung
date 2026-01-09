import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
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
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import LinkIcon from '@mui/icons-material/Link';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TitleIcon from '@mui/icons-material/Title';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
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
  uploadContentFile,
  uploadContentImage
} from '../lib/contentBlocks';

type ContentBlocksProps = {
  contentSectionId: string;
  buildSnapshot?: (blocks: ContentBlock[]) => string;
  onHistory?: (beforeSnapshot: string, afterSnapshot: string) => void;
  canEdit: boolean;
  editing: boolean;
  onHasBlocksChange?: (hasBlocks: boolean) => void;
  allowedBlockTypes?: BlockType[];
  commitSignal?: number;
  onCommitComplete?: (success: boolean) => void;
};

type ResizeState = {
  id: string;
  startX: number;
  startWidth: number;
};

const clampWidth = (value: number) => Math.min(12, Math.max(3, value));

const parseGalleryContent = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }
  } catch {
    // Ignore malformed gallery payloads.
  }
  return [];
};

const serializeGalleryContent = (images: string[]): string => JSON.stringify(images);

const ContentBlocks: React.FC<ContentBlocksProps> = ({
  contentSectionId,
  buildSnapshot,
  onHistory,
  canEdit,
  editing,
  onHasBlocksChange,
  allowedBlockTypes,
  commitSignal,
  onCommitComplete
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
  const [draftBlocks, setDraftBlocks] = React.useState<ContentBlock[]>([]);
  const [draftDirty, setDraftDirty] = React.useState(false);
  const [commitInFlight, setCommitInFlight] = React.useState(false);
  const [galleryUploadContext, setGalleryUploadContext] = React.useState<{
    mode: 'new' | 'append';
    insertIndex?: number;
    preferredWidth?: number;
    targetId?: string;
  } | null>(null);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerImages, setViewerImages] = React.useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const gridRef = React.useRef<HTMLDivElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);
  const blocksRef = React.useRef<ContentBlock[]>([]);
  const lastCommitSignal = React.useRef<number | undefined>(undefined);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const baseAllowedTypes = React.useMemo<BlockType[]>(
    () => allowedBlockTypes ?? ['heading', 'text', 'image'],
    [allowedBlockTypes]
  );

  const updateDraftBlocks = React.useCallback(
    (next: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => {
      setDraftBlocks((prev) => (typeof next === 'function' ? next(prev) : next));
      setDraftDirty(true);
    },
    []
  );

  const displayBlocks = editing ? draftBlocks : blocks;

  const loadBlocks = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listContentBlocks(contentSectionId);
      setBlocks(data);
      if (!editing) {
        setDraftBlocks(data);
        setDraftDirty(false);
      }
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
    if (editing) {
      setDraftBlocks(blocks);
      setDraftDirty(false);
    }
  }, [editing, blocks]);

  React.useEffect(() => {
    onHasBlocksChange?.(displayBlocks.length > 0);
  }, [displayBlocks.length, onHasBlocksChange]);

  React.useEffect(() => {
    blocksRef.current = displayBlocks;
  }, [displayBlocks]);

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
    if (block.type === 'gallery') {
      return parseGalleryContent(block.content).length === 0;
    }
    if (block.type === 'link' || block.type === 'file') {
      const label = (block.content ?? '').trim();
      const url = (block.imageUrl ?? '').trim();
      return !label && !url;
    }
    const content = (block.content ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    return content.length === 0;
  };

  const openMenu = (
    event: React.MouseEvent<HTMLElement>,
    insertIndex: number,
    preferredWidth?: number,
    allowedTypes?: BlockType[]
  ) => {
    setMenuContext({
      anchorEl: event.currentTarget,
      insertIndex,
      preferredWidth,
      allowedTypes: allowedTypes ?? baseAllowedTypes
    });
  };

  const closeMenu = () => {
    setMenuContext({
      anchorEl: null,
      insertIndex: displayBlocks.length,
      preferredWidth: undefined,
      allowedTypes: menuContext.allowedTypes ?? baseAllowedTypes
    });
  };

  const openGalleryPicker = (context: {
    mode: 'new' | 'append';
    insertIndex?: number;
    preferredWidth?: number;
    targetId?: string;
  }) => {
    setGalleryUploadContext(context);
    window.requestAnimationFrame(() => {
      galleryInputRef.current?.click();
    });
  };

  const openViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerImages([]);
    setViewerIndex(0);
  };

  const handleViewerPrev = () => {
    setViewerIndex((prev) => {
      if (viewerImages.length === 0) {
        return prev;
      }
      return (prev - 1 + viewerImages.length) % viewerImages.length;
    });
  };

  const handleViewerNext = () => {
    setViewerIndex((prev) => {
      if (viewerImages.length === 0) {
        return prev;
      }
      return (prev + 1) % viewerImages.length;
    });
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

  const updateGalleryImages = async (blockId: string, nextImages: string[]) => {
    const nextContent = serializeGalleryContent(nextImages);
    if (editing) {
      updateDraftBlocks((prev) =>
        prev.map((block) => (block.id === blockId ? { ...block, content: nextContent } : block))
      );
      return;
    }
    try {
      const beforeBlocks = blocks;
      const updated = await updateContentBlock(blockId, { content: nextContent });
      const nextBlocks = blocks.map((block) => (block.id === updated.id ? updated : block));
      setBlocks(nextBlocks);
      recordHistory(beforeBlocks, nextBlocks);
    } catch {
      setError('Galerie konnte nicht aktualisiert werden.');
    }
  };

  const createGalleryBlockAt = async (
    insertIndex: number,
    images: string[],
    preferredWidth?: number
  ) => {
    const content = serializeGalleryContent(images);
    const width = clampWidth(preferredWidth ?? 12);
    if (editing) {
      const newBlock: ContentBlock = {
        id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sectionId: contentSectionId,
        type: 'gallery',
        content,
        imageUrl: null,
        width,
        orderIndex: insertIndex + 1
      };
      updateDraftBlocks((prev) => {
        const nextBlocks = [...prev];
        nextBlocks.splice(insertIndex, 0, newBlock);
        return nextBlocks.map((block, index) => ({ ...block, orderIndex: index + 1 }));
      });
      return;
    }
    try {
      const beforeBlocks = blocks;
      const newBlock = await createContentBlock({
        sectionId: contentSectionId,
        type: 'gallery',
        content,
        imageUrl: null,
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
      setError('Konnte Galerie nicht anlegen.');
    }
  };

  const handleGalleryRemove = (blockId: string, index: number, images: string[]) => {
    const nextImages = images.filter((_, itemIndex) => itemIndex !== index);
    updateGalleryImages(blockId, nextImages);
  };

  const insertBlockAt = async (
    type: BlockType,
    insertIndex: number,
    imageUrl?: string,
    preferredWidth?: number
  ) => {
    if (editing) {
      const width = clampWidth(preferredWidth ?? (type === 'image' ? 6 : 12));
      const newBlock: ContentBlock = {
        id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sectionId: contentSectionId,
        type,
        content: type === 'image' ? null : '',
        imageUrl: type === 'image' ? imageUrl ?? null : null,
        width,
        orderIndex: insertIndex + 1
      };
      updateDraftBlocks((prev) => {
        const nextBlocks = [...prev];
        nextBlocks.splice(insertIndex, 0, newBlock);
        return nextBlocks.map((block, index) => ({ ...block, orderIndex: index + 1 }));
      });
      return;
    }
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
    if (type === 'gallery') {
      openGalleryPicker({
        mode: 'new',
        insertIndex: menuContext.insertIndex,
        preferredWidth: menuContext.preferredWidth
      });
      return;
    }
    if (type === 'image') {
      setReplaceTargetId(null);
      setPendingInsertIndex(menuContext.insertIndex);
      setPendingInsertWidth(menuContext.preferredWidth ?? null);
      setCropDialogOpen(true);
      return;
    }
    await insertBlockAt(type, menuContext.insertIndex, undefined, menuContext.preferredWidth);
  };

  const handleGalleryFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      setGalleryUploadContext(null);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadContentImage(contentSectionId, file);
        uploadedUrls.push(url);
      }
      if (galleryUploadContext?.mode === 'append' && galleryUploadContext.targetId) {
        const targetBlock = displayBlocks.find((block) => block.id === galleryUploadContext.targetId);
        const existingImages = targetBlock ? parseGalleryContent(targetBlock.content) : [];
        await updateGalleryImages(galleryUploadContext.targetId, [...existingImages, ...uploadedUrls]);
      } else {
        const insertIndex = galleryUploadContext?.insertIndex ?? displayBlocks.length;
        await createGalleryBlockAt(insertIndex, uploadedUrls, galleryUploadContext?.preferredWidth);
      }
    } catch {
      setError('Bilder konnten nicht hochgeladen werden.');
    } finally {
      setUploading(false);
      setGalleryUploadContext(null);
      event.target.value = '';
    }
  };

  const handleCroppedImage = async (file: File) => {
    try {
      setUploading(true);
      const imageUrl = await uploadContentImage(contentSectionId, file);
      if (replaceTargetId) {
        if (editing) {
          updateDraftBlocks((prev) =>
            prev.map((block) => (block.id === replaceTargetId ? { ...block, imageUrl } : block))
          );
        } else {
          const beforeBlocks = blocks;
          const target = blocks.find((block) => block.id === replaceTargetId);
          const updated = await updateContentBlock(replaceTargetId, { imageUrl });
          const nextBlocks = blocks.map((block) => (block.id === updated.id ? updated : block));
          setBlocks(nextBlocks);
          recordHistory(beforeBlocks, nextBlocks);
          if (target?.imageUrl) {
            await deleteContentImage(target.imageUrl);
          }
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
    if (editing) {
      updateDraftBlocks((prev) =>
        prev.map((block) => (block.id === id ? { ...block, content: value } : block))
      );
      return;
    }
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, content: value } : block)));
  };

  const handleContentSave = async (id: string) => {
    if (editing) {
      return;
    }
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
    handleContentChange(id, value);
  };

  const handleLinkFieldChange = (id: string, field: 'content' | 'imageUrl', value: string) => {
    if (editing) {
      updateDraftBlocks((prev) =>
        prev.map((block) => (block.id === id ? { ...block, [field]: value } : block))
      );
      return;
    }
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, [field]: value } : block))
    );
  };

  const handleLinkSave = async (id: string) => {
    if (editing) {
      return;
    }
    const block = blocks.find((item) => item.id === id);
    if (!block) {
      return;
    }
    try {
      const beforeBlocks = blocks;
      const updated = await updateContentBlock(id, {
        content: block.content ?? '',
        imageUrl: block.imageUrl ?? ''
      });
      const nextBlocks = blocks.map((item) => (item.id === updated.id ? updated : item));
      setBlocks(nextBlocks);
      recordHistory(beforeBlocks, nextBlocks);
    } catch {
      setError('Link konnte nicht gespeichert werden.');
    }
  };

  const handleFileUpload = async (id: string, file: File) => {
    try {
      setUploading(true);
      const fileUrl = await uploadContentFile(contentSectionId, file);
      if (editing) {
        updateDraftBlocks((prev) =>
          prev.map((block) => (block.id === id ? { ...block, imageUrl: fileUrl } : block))
        );
      } else {
        const beforeBlocks = blocks;
        const target = blocks.find((block) => block.id === id);
        const updated = await updateContentBlock(id, { imageUrl: fileUrl });
        const nextBlocks = blocks.map((block) => (block.id === updated.id ? updated : block));
        setBlocks(nextBlocks);
        recordHistory(beforeBlocks, nextBlocks);
        if (target?.imageUrl) {
          await deleteContentImage(target.imageUrl);
        }
      }
    } catch {
      setError('Datei konnte nicht hochgeladen werden.');
    } finally {
      setUploading(false);
    }
  };

  const handleFilePick = (id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        handleFileUpload(id, file);
      }
    };
    input.click();
  };

  const isHtmlContent = (value?: string | null) => {
    if (!value) {
      return false;
    }
    return /<\/?[a-z][\s\S]*>/i.test(value);
  };

  const getFileNameFromUrl = (url?: string | null) => {
    if (!url) {
      return '';
    }
    const clean = url.split('?')[0];
    const parts = clean.split('/');
    return decodeURIComponent(parts[parts.length - 1] ?? '');
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
    if (editing) {
      updateDraftBlocks((prev) => {
        const next = prev
          .filter((block) => block.id !== id)
          .map((block, index) => ({ ...block, orderIndex: index + 1 }));
        onHasBlocksChange?.(next.length > 0);
        return next;
      });
      return;
    }
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
      if (editing) {
        updateDraftBlocks((prev) =>
          prev.map((block) => (block.id === resizeState.id ? { ...block, width: nextWidth } : block))
        );
      } else {
        setBlocks((prev) =>
          prev.map((block) => (block.id === resizeState.id ? { ...block, width: nextWidth } : block))
        );
      }
    };

    const handleUp = async () => {
      setResizeState(null);
      if (editing) {
        return;
      }
      const target = blocks.find((block) => block.id === resizeState.id);
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
  }, [blocks, draftBlocks, editing, resizeState, updateDraftBlocks]);

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
    const workingBlocks = editing ? draftBlocks : blocks;
    const fromIndex = workingBlocks.findIndex((block) => block.id === id);
    if (fromIndex === -1) {
      return;
    }
    if (fromIndex === index || fromIndex + 1 === index) {
      return;
    }
    const nextBlocks = workingBlocks.filter((block) => block.id !== id);
    const insertIndex = index > fromIndex ? index - 1 : index;
    nextBlocks.splice(insertIndex, 0, workingBlocks[fromIndex]);
    if (editing) {
      updateDraftBlocks(
        nextBlocks.map((block, orderIndex) => ({ ...block, orderIndex: orderIndex + 1 }))
      );
      return;
    }
    const originalMap = new Map(blocks.map((block) => [block.id, block.orderIndex]));
    const ordered = await persistOrder(nextBlocks, originalMap);
    setBlocks(ordered);
    recordHistory(blocks, ordered);
  };

  const commitChanges = React.useCallback(async (): Promise<boolean> => {
    if (commitInFlight) {
      return false;
    }
    const draftClean = draftBlocks.filter((block) => !isBlockEmpty(block));
    const normalizedDraft = draftClean.map((block, index) => ({
      ...block,
      orderIndex: index + 1
    }));
    if (!draftDirty) {
      setDraftBlocks(normalizedDraft);
      return true;
    }

    setCommitInFlight(true);
    setError('');
    try {
      const beforeBlocks = blocks;
      const persistedMap = new Map(beforeBlocks.map((block) => [block.id, block]));
      const draftIds = new Set(normalizedDraft.map((block) => block.id));
      const removedBlocks = beforeBlocks.filter((block) => !draftIds.has(block.id));
      const removeUrls = new Set<string>();

      removedBlocks.forEach((block) => {
        if (block.imageUrl) {
          removeUrls.add(block.imageUrl);
        }
        if (block.type === 'gallery') {
          parseGalleryContent(block.content).forEach((url) => removeUrls.add(url));
        }
      });

      for (const block of normalizedDraft) {
        if (block.id.startsWith('draft-')) {
          await createContentBlock({
            sectionId: contentSectionId,
            type: block.type,
            content: block.content ?? null,
            imageUrl: block.imageUrl ?? null,
            width: block.width,
            orderIndex: block.orderIndex
          });
          continue;
        }

        const original = persistedMap.get(block.id);
        if (!original) {
          continue;
        }
        const updates: Partial<{
          content: string | null;
          imageUrl: string | null;
          width: number;
          orderIndex: number;
        }> = {};
        if ((original.content ?? '') !== (block.content ?? '')) {
          updates.content = block.content ?? null;
          if (block.type === 'gallery') {
            const previousImages = parseGalleryContent(original.content);
            const nextImages = parseGalleryContent(block.content);
            previousImages
              .filter((url) => !nextImages.includes(url))
              .forEach((url) => removeUrls.add(url));
          }
        }
        if ((original.imageUrl ?? '') !== (block.imageUrl ?? '')) {
          updates.imageUrl = block.imageUrl ?? null;
          if (original.imageUrl) {
            removeUrls.add(original.imageUrl);
          }
        }
        if (original.width !== block.width) {
          updates.width = block.width;
        }
        if (original.orderIndex !== block.orderIndex) {
          updates.orderIndex = block.orderIndex;
        }
        if (Object.keys(updates).length > 0) {
          await updateContentBlock(block.id, updates);
        }
      }

      for (const block of removedBlocks) {
        await deleteContentBlock(block.id);
      }

      if (removeUrls.size > 0) {
        await Promise.all(Array.from(removeUrls).map((url) => deleteContentImage(url)));
      }

      const refreshed = await listContentBlocks(contentSectionId);
      setBlocks(refreshed);
      setDraftBlocks(refreshed);
      setDraftDirty(false);
      onHasBlocksChange?.(refreshed.length > 0);
      recordHistory(beforeBlocks, refreshed);
      return true;
    } catch {
      setError('Speichern fehlgeschlagen.');
      return false;
    } finally {
      setCommitInFlight(false);
    }
  }, [
    blocks,
    commitInFlight,
    contentSectionId,
    draftBlocks,
    draftDirty,
    onHasBlocksChange,
    recordHistory
  ]);

  React.useEffect(() => {
    if (commitSignal === undefined) {
      return;
    }
    if (commitSignal === lastCommitSignal.current) {
      return;
    }
    lastCommitSignal.current = commitSignal;
    if (!editing) {
      onCommitComplete?.(true);
      return;
    }
    commitChanges().then((success) => {
      onCommitComplete?.(success);
    });
  }, [commitChanges, commitSignal, editing, onCommitComplete]);

  if (loading && displayBlocks.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      {error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {canEdit && editing && displayBlocks.length > 0 ? (
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
        {displayBlocks.map((block, index) => {
          let rowWidth = 0;
          let rowHasImage = false;
          for (let i = 0; i <= index; i += 1) {
            const current = displayBlocks[i];
            if (rowWidth + current.width > 12) {
              rowWidth = 0;
              rowHasImage = false;
            }
            rowWidth += current.width;
            rowHasImage = rowHasImage || current.type === 'image' || current.type === 'gallery';
          }
          const nextBlock = displayBlocks[index + 1];
          const isRowEnd = !nextBlock || rowWidth + nextBlock.width > 12;
          const remainingWidth = 12 - rowWidth;
          const allowedInlineTypes = rowHasImage
            ? baseAllowedTypes.filter((type) => type === 'heading' || type === 'text')
            : baseAllowedTypes;
          const showInlineAdd =
            !isMobile && editing && isRowEnd && remainingWidth >= 3 && allowedInlineTypes.length > 0;
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

            {block.type === 'link' ? (
              editing ? (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <TextField
                    label="Beschreibung"
                    value={block.content ?? ''}
                    onChange={(event) => handleLinkFieldChange(block.id, 'content', event.target.value)}
                    onBlur={() => handleLinkSave(block.id)}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Link"
                    value={block.imageUrl ?? ''}
                    onChange={(event) => handleLinkFieldChange(block.id, 'imageUrl', event.target.value)}
                    onBlur={() => handleLinkSave(block.id)}
                    fullWidth
                    size="small"
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    borderRadius: 2,
                    border: '1px solid rgba(0,0,0,0.08)',
                    p: 2
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontWeight: 600 }}>{block.content || 'Link'}</Typography>
                    {block.imageUrl ? (
                      <Typography variant="body2" color="text.secondary">
                        {block.imageUrl}
                      </Typography>
                    ) : null}
                  </Box>
                  {block.imageUrl ? (
                    <Button
                      variant="contained"
                      size="small"
                      href={block.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Oeffnen
                    </Button>
                  ) : null}
                </Box>
              )
            ) : null}

            {block.type === 'file' ? (
              editing ? (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <TextField
                    label="Beschreibung"
                    value={block.content ?? ''}
                    onChange={(event) => handleLinkFieldChange(block.id, 'content', event.target.value)}
                    onBlur={() => handleLinkSave(block.id)}
                    fullWidth
                    size="small"
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      startIcon={<AttachFileIcon />}
                      onClick={() => handleFilePick(block.id)}
                      disabled={uploading}
                    >
                      ZIP hochladen
                    </Button>
                    {block.imageUrl ? (
                      <Typography variant="body2" color="text.secondary">
                        {getFileNameFromUrl(block.imageUrl)}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    borderRadius: 2,
                    border: '1px solid rgba(0,0,0,0.08)',
                    p: 2
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontWeight: 600 }}>{block.content || 'Download'}</Typography>
                    {block.imageUrl ? (
                      <Typography variant="body2" color="text.secondary">
                        {getFileNameFromUrl(block.imageUrl)}
                      </Typography>
                    ) : null}
                  </Box>
                  {block.imageUrl ? (
                    <Button
                      variant="contained"
                      size="small"
                      href={block.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </Button>
                  ) : null}
                </Box>
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

            {block.type === 'gallery' ? (() => {
              const galleryImages = parseGalleryContent(block.content);
              return (
                <Box>
                  {galleryImages.length === 0 ? (
                    <Box
                      sx={{
                        minHeight: 160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                        borderRadius: 2,
                        border: editing ? '1px dashed rgba(0,0,0,0.2)' : '1px solid rgba(0,0,0,0.08)'
                      }}
                    >
                      Keine Bilder in der Galerie
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                        gridAutoRows: { xs: 120, sm: 140, md: 160 },
                        gap: 1.5,
                        '& .gallery-item': {
                          position: 'relative',
                          borderRadius: 2,
                          overflow: 'hidden',
                          bgcolor: 'rgba(0,0,0,0.06)',
                          cursor: editing ? 'default' : 'pointer'
                        },
                        '& .gallery-item:nth-of-type(6n+1)': {
                          gridColumn: { xs: 'span 2', sm: 'span 2', md: 'span 2' },
                          gridRow: 'span 2'
                        },
                        '& .gallery-item:nth-of-type(6n+4)': {
                          gridRow: 'span 2'
                        }
                      }}
                    >
                      {galleryImages.map((url, index) => (
                        <Box
                          key={`${block.id}-${index}`}
                          className="gallery-item"
                          onClick={
                            editing
                              ? undefined
                              : () => openViewer(galleryImages, index)
                          }
                        >
                          <Box
                            component="img"
                            src={url}
                            alt=""
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          {editing ? (
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleGalleryRemove(block.id, index, galleryImages);
                              }}
                              sx={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                bgcolor: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Box>
                      ))}
                    </Box>
                  )}
                  {editing ? (
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        startIcon={<PhotoLibraryIcon />}
                        onClick={() =>
                          openGalleryPicker({
                            mode: 'append',
                            targetId: block.id
                          })
                        }
                        disabled={uploading}
                      >
                        Bilder hinzufuegen
                      </Button>
                    </Box>
                  ) : null}
                </Box>
              );
            })() : null}

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
            border:
              dropIndex === displayBlocks.length ? '1px dashed #0088ff' : '1px dashed rgba(0,0,0,0.3)',
            borderRadius: 2,
            p: 2,
            flexWrap: 'wrap'
          }}
          onDragOver={(event) => handleDragOver(event, displayBlocks.length)}
          onDrop={(event) => handleDrop(event, displayBlocks.length)}
          onDragLeave={handleDragLeave}
        >
          <Button
            variant="text"
            startIcon={<AddIcon />}
            onClick={(event) => openMenu(event, displayBlocks.length)}
            disabled={uploading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Block hinzufuegen
          </Button>
          {uploading ? <Typography variant="body2">Upload laeuft...</Typography> : null}
        </Box>
      ) : null}

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleGalleryFilesSelected}
      />

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
        {!menuContext.allowedTypes || menuContext.allowedTypes.includes('gallery') ? (
          <MenuItem onClick={() => handleCreateBlock('gallery')}>
            <PhotoLibraryIcon sx={{ mr: 1 }} /> Bilder hochladen
          </MenuItem>
        ) : null}
        {!menuContext.allowedTypes || menuContext.allowedTypes.includes('link') ? (
          <MenuItem onClick={() => handleCreateBlock('link')}>
            <LinkIcon sx={{ mr: 1 }} /> Link mit Beschreibung
          </MenuItem>
        ) : null}
        {!menuContext.allowedTypes || menuContext.allowedTypes.includes('file') ? (
          <MenuItem onClick={() => handleCreateBlock('file')}>
            <AttachFileIcon sx={{ mr: 1 }} /> ZIP hochladen
          </MenuItem>
        ) : null}
      </Menu>

      <Dialog open={viewerOpen} onClose={closeViewer} maxWidth="lg" fullWidth>
        <DialogContent
          sx={{
            p: 0,
            bgcolor: '#0b0b0b',
            color: '#fff'
          }}
        >
          <Box
            sx={{
              position: 'relative',
              minHeight: { xs: '60vh', md: '70vh' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {viewerImages.length > 0 ? (
              <Box
                component="img"
                src={viewerImages[viewerIndex]}
                alt=""
                sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
              />
            ) : null}
            <IconButton
              onClick={closeViewer}
              sx={{ position: 'absolute', top: 8, right: 8, color: '#fff' }}
              aria-label="Schliessen"
            >
              <CloseIcon />
            </IconButton>
            {viewerImages.length > 1 ? (
              <>
                <IconButton
                  onClick={handleViewerPrev}
                  sx={{
                    position: 'absolute',
                    left: 12,
                    color: '#fff',
                    bgcolor: 'rgba(0,0,0,0.35)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
                  }}
                  aria-label="Vorheriges Bild"
                >
                  <ChevronLeftIcon />
                </IconButton>
                <IconButton
                  onClick={handleViewerNext}
                  sx={{
                    position: 'absolute',
                    right: 12,
                    color: '#fff',
                    bgcolor: 'rgba(0,0,0,0.35)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' }
                  }}
                  aria-label="Naechstes Bild"
                >
                  <ChevronRightIcon />
                </IconButton>
              </>
            ) : null}
            {viewerImages.length > 1 ? (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 12,
                  right: 16,
                  fontSize: '0.9rem',
                  opacity: 0.8
                }}
              >
                {viewerIndex + 1} / {viewerImages.length}
              </Box>
            ) : null}
          </Box>
        </DialogContent>
      </Dialog>

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
