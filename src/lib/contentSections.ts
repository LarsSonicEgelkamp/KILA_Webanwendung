import { supabase } from './supabaseClient';

export type ContentSection = {
  id: string;
  pageSectionId: string;
  title: string;
  ownerId: string;
  ownerName: string;
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
  created_at: string;
  updated_at: string;
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
    .select('id, page_section_id, title, owner_id, owner_name, created_at, updated_at')
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
}): Promise<ContentSection> => {
  const { data, error } = await supabase
    .from('content_sections')
    .insert({
      page_section_id: input.pageSectionId,
      title: input.title,
      owner_id: input.ownerId,
      owner_name: input.ownerName
    })
    .select('id, page_section_id, title, owner_id, owner_name, created_at, updated_at')
    .single();
  if (error || !data) {
    throw error ?? new Error('Failed to create section.');
  }
  return mapSection(data);
};

export const updateContentSectionTitle = async (id: string, title: string): Promise<ContentSection> => {
  const { data, error } = await supabase
    .from('content_sections')
    .update({ title })
    .eq('id', id)
    .select('id, page_section_id, title, owner_id, owner_name, created_at, updated_at')
    .single();
  if (error || !data) {
    throw error ?? new Error('Failed to update section title.');
  }
  return mapSection(data);
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
