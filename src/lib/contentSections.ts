import { supabase } from './supabaseClient';

export type ContentSection = {
  id: string;
  pageSectionId: string;
  title: string;
  ownerId: string;
  ownerName: string;
  showAuthor: boolean;
  showPublishDate: boolean;
  publishDate: string | null;
  editorIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SectionHistoryEntry = {
  id: string;
  sectionId: string;
  editorId: string;
  editorName: string;
  createdAt: string;
  beforeSnapshot: string;
  afterSnapshot: string;
};

type SectionRow = {
  id: string;
  page_section_id: string;
  title: string;
  owner_id: string;
  owner_name: string;
  show_author: boolean | null;
  show_publish_date: boolean | null;
  publish_date: string | null;
  editor_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

type SectionUpdateRow = {
  title?: string;
  show_author?: boolean;
  show_publish_date?: boolean;
  publish_date?: string | null;
  editor_ids?: string[];
};

type HistoryRow = {
  id: string;
  section_id: string;
  editor_id: string;
  editor_name: string;
  created_at: string;
  before_snapshot: string;
  after_snapshot: string;
};

const mapSection = (row: SectionRow): ContentSection => ({
  id: row.id,
  pageSectionId: row.page_section_id,
  title: row.title,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  showAuthor: row.show_author ?? false,
  showPublishDate: row.show_publish_date ?? false,
  publishDate: row.publish_date ?? null,
  editorIds: row.editor_ids ?? [],
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapHistory = (row: HistoryRow): SectionHistoryEntry => ({
  id: row.id,
  sectionId: row.section_id,
  editorId: row.editor_id,
  editorName: row.editor_name,
  createdAt: row.created_at,
  beforeSnapshot: row.before_snapshot,
  afterSnapshot: row.after_snapshot
});

export const listContentSections = async (pageSectionId: string): Promise<ContentSection[]> => {
  const { data, error } = await supabase
    .from('content_sections')
    .select(
      'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
    )
    .eq('page_section_id', pageSectionId)
    .order('created_at', { ascending: true });
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapSection);
};

export const createContentSection = async (input: {
  pageSectionId: string;
  title: string;
  ownerId: string;
  ownerName: string;
  showAuthor?: boolean;
  showPublishDate?: boolean;
  publishDate?: string | null;
  editorIds?: string[];
}): Promise<ContentSection> => {
  const { data, error } = await supabase
    .from('content_sections')
    .insert({
      page_section_id: input.pageSectionId,
      title: input.title,
      owner_id: input.ownerId,
      owner_name: input.ownerName,
      show_author: input.showAuthor ?? false,
      show_publish_date: input.showPublishDate ?? false,
      publish_date: input.publishDate ?? null,
      editor_ids: input.editorIds ?? []
    })
    .select(
      'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
    )
    .single();
  if (error || !data) {
    throw error ?? new Error('Failed to create section.');
  }
  return mapSection(data);
};

export const updateContentSection = async (
  id: string,
  updates: {
    title?: string;
    showAuthor?: boolean;
    showPublishDate?: boolean;
    publishDate?: string | null;
    editorIds?: string[];
  }
): Promise<ContentSection> => {
  const updatePayload: SectionUpdateRow = {};
  if (updates.title !== undefined) {
    updatePayload.title = updates.title;
  }
  if (updates.showAuthor !== undefined) {
    updatePayload.show_author = updates.showAuthor;
  }
  if (updates.showPublishDate !== undefined) {
    updatePayload.show_publish_date = updates.showPublishDate;
  }
  if (updates.publishDate !== undefined) {
    updatePayload.publish_date = updates.publishDate;
  }
  if (updates.editorIds !== undefined) {
    updatePayload.editor_ids = updates.editorIds;
  }

  const { data, error } = await supabase
    .from('content_sections')
    .update(updatePayload)
    .eq('id', id)
    .select(
      'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
    )
    .single();
  if (error || !data) {
    throw error ?? new Error('Failed to update section.');
  }
  return mapSection(data);
};

export const updateContentSectionTitle = async (id: string, title: string): Promise<ContentSection> => {
  return updateContentSection(id, { title });
};

export const updateContentSectionEditors = async (id: string, editorIds: string[]): Promise<ContentSection> => {
  return updateContentSection(id, { editorIds });
};

export const updateContentSectionMeta = async (
  id: string,
  meta: { showAuthor?: boolean; showPublishDate?: boolean; publishDate?: string | null }
): Promise<ContentSection> => {
  return updateContentSection(id, meta);
};

export const deleteContentSection = async (id: string): Promise<void> => {
  const { error } = await supabase.from('content_sections').delete().eq('id', id);
  if (error) {
    throw error;
  }
};

export const listSectionHistory = async (sectionId: string): Promise<SectionHistoryEntry[]> => {
  const { data, error } = await supabase
    .from('content_section_history')
    .select('id, section_id, editor_id, editor_name, created_at, before_snapshot, after_snapshot')
    .eq('section_id', sectionId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapHistory);
};

export const listUserHistory = async (editorId: string): Promise<SectionHistoryEntry[]> => {
  const { data, error } = await supabase
    .from('content_section_history')
    .select('id, section_id, editor_id, editor_name, created_at, before_snapshot, after_snapshot')
    .eq('editor_id', editorId)
    .order('created_at', { ascending: false });
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapHistory);
};

export const createSectionHistory = async (input: {
  sectionId: string;
  editorId: string;
  editorName: string;
  beforeSnapshot: string;
  afterSnapshot: string;
}): Promise<void> => {
  const { error } = await supabase.from('content_section_history').insert({
    section_id: input.sectionId,
    editor_id: input.editorId,
    editor_name: input.editorName,
    before_snapshot: input.beforeSnapshot,
    after_snapshot: input.afterSnapshot
  });
  if (error) {
    throw error;
  }
};
