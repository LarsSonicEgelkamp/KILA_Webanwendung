import { supabase } from './supabaseClient';

const BUCKET = 'content';
const PREFIX = 'avatars';

export const uploadAvatarImage = async (userId: string, file: File): Promise<string> => {
  const extension = file.name.split('.').pop() ?? 'png';
  const path = `${PREFIX}/${userId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const deleteAvatarImage = async (imageUrl: string): Promise<void> => {
  const marker = `/storage/v1/object/public/${BUCKET}/${PREFIX}/`;
  const start = imageUrl.indexOf(marker);
  if (start === -1) {
    return;
  }
  const pathWithQuery = imageUrl.slice(start + marker.length);
  const path = pathWithQuery.split('?')[0];
  if (!path) {
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove([`${PREFIX}/${path}`]);
  if (error) {
    throw error;
  }
};
