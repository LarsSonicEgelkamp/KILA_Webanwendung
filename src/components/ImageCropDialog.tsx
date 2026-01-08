import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Slider,
  TextField,
  Typography
} from '@mui/material';
import Cropper, { Area } from 'react-easy-crop';

type ImageCropDialogProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void> | void;
};

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = url;
  });

const getCroppedBlob = async (
  imageSrc: string,
  crop: Area,
  mimeType: string
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas not supported');
  }
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Image conversion failed'));
        return;
      }
      resolve(blob);
    }, mimeType);
  });
};

const aspectOptions = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9 (hoch)', value: 9 / 16 }
];

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({ open, title, onClose, onConfirm }) => {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string>('image.jpg');
  const [mimeType, setMimeType] = React.useState<string>('image/jpeg');
  const [imageAspect, setImageAspect] = React.useState<number | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [aspect, setAspect] = React.useState(4 / 3);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setAspect(4 / 3);
      setCroppedAreaPixels(null);
      setFileName('image.jpg');
      setMimeType('image/jpeg');
      setImageAspect(null);
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setFileName(file.name.replace(/\s+/g, '-'));
    setMimeType(file.type || 'image/jpeg');
    createImage(url)
      .then((img) => {
        if (img.width && img.height) {
          setImageAspect(img.width / img.height);
        }
      })
      .catch(() => setImageAspect(null));
  };

  const handleCropComplete = (_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      return;
    }
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, mimeType);
    const croppedFile = new File([blob], fileName, { type: mimeType });
    await onConfirm(croppedFile);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: imageAspect ? (imageAspect > 1 ? '85vw' : '70vw') : '80vw',
          maxWidth: imageAspect ? (imageAspect > 1 ? 960 : 720) : 900
        }
      }}
    >
      <DialogTitle>{title ?? 'Bild hochladen'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {!imageSrc ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 6 }}>
            <Typography>Waehle ein Bild zum Hochladen.</Typography>
            <Button variant="outlined" onClick={() => inputRef.current?.click()}>
              Bild auswaehlen
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: imageAspect ?? 4 / 3,
                maxHeight: '70vh',
                bgcolor: '#111'
              }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
              />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
              <Box sx={{ minWidth: 180 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Zoom
                </Typography>
                <Slider min={1} max={3} step={0.1} value={zoom} onChange={(_, value) => setZoom(value as number)} />
              </Box>
              <TextField
                select
                label="Format"
                size="small"
                value={aspect}
                onChange={(event) => setAspect(Number(event.target.value))}
                sx={{ minWidth: 140 }}
              >
                {aspectOptions.map((option) => (
                  <MenuItem key={option.label} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={() => inputRef.current?.click()}>
                Bild wechseln
              </Button>
            </Box>
          </Box>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!imageSrc}>
          Zuschneiden & hochladen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropDialog;
