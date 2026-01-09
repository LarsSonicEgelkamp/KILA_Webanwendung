import { supabase } from './supabaseClient';

export type BlockType = 'heading' | 'text' | 'image' | 'link' | 'file' | 'gallery';

export type ContentBlock = {
  id: string;
  sectionId: string;
  type: BlockType;
  content: string | null;
  imageUrl: string | null;
  width: number;
  orderIndex: number;
};

type ContentBlockRow = {
  id: string;
  section_id: string;
  type: BlockType;
  content: string | null;
  image_url: string | null;
  width: number;
  order_index: number;
};

const mapRow = (row: ContentBlockRow): ContentBlock => ({
  id: row.id,
  sectionId: row.section_id,
  type: row.type,
  content: row.content,
  imageUrl: row.image_url,
  width: row.width,
  orderIndex: row.order_index
});

export const listContentBlocks = async (sectionId: string): Promise<ContentBlock[]> => {
  const { data, error } = await supabase
    .from('content_blocks')
    .select('id, section_id, type, content, image_url, width, order_index')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapRow);
};

export const createContentBlock = async (input: {
  sectionId: string;
  type: BlockType;
  content?: string | null;
  imageUrl?: string | null;
  width?: number;
  orderIndex: number;
}): Promise<ContentBlock> => {
  const { data, error } = await supabase
    .from('content_blocks')
    .insert({
      section_id: input.sectionId,
      type: input.type,
      content: input.content ?? null,
      image_url: input.imageUrl ?? null,
      width: input.width ?? 12,
      order_index: input.orderIndex
    })
    .select('id, section_id, type, content, image_url, width, order_index')
    .single();
  if (error || !data) {
    throw error ?? new Error('Failed to create block.');
  }
  return mapRow(data);
};

export const updateContentBlock = async (
  id: string,
  updates: Partial<{ content: string | null; imageUrl: string | null; width: number; orderIndex: number }>
): Promise<ContentBlock> => {
  const { data, error } = await supabase
    .from('content_blocks')
    .update({
      content: updates.content ?? undefined,
      image_url: updates.imageUrl ?? undefined,
      width: updates.width ?? undefined,
      order_index: updates.orderIndex ?? undefined
    })
    .eq('id', id)
    .select('id, section_id, type, content, image_url, width, order_index')
    .single();
  if (error || !data) {
    throw error ?? new Error('Failed to update block.');
  }
  return mapRow(data);
};

export const deleteContentBlock = async (id: string): Promise<void> => {
  const { error } = await supabase.from('content_blocks').delete().eq('id', id);
  if (error) {
    throw error;
  }
};

export const uploadContentImage = async (sectionId: string, file: File): Promise<string> => {
  const extension = file.name.split('.').pop() ?? 'png';
  const path = `${sectionId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const { error } = await supabase.storage.from('content').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from('content').getPublicUrl(path);
  return data.publicUrl;
};

export const uploadContentFile = async (sectionId: string, file: File): Promise<string> => {
  const extension = file.name.split('.').pop() ?? 'zip';
  const path = `${sectionId}/files/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const { error } = await supabase.storage.from('content').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) {
    throw error;
  }
  const { data } = supabase.storage.from('content').getPublicUrl(path);
  return data.publicUrl;
};

export const deleteContentImage = async (imageUrl: string): Promise<void> => {
  const marker = '/storage/v1/object/public/content/';
  const start = imageUrl.indexOf(marker);
  if (start === -1) {
    return;
  }
  const pathWithQuery = imageUrl.slice(start + marker.length);
  const path = pathWithQuery.split('?')[0];
  if (!path) {
    return;
  }
  const { error } = await supabase.storage.from('content').remove([path]);
  if (error) {
    throw error;
  }
};
