import { supabase } from './supabaseClient';

export type ContentSection = {
  id: string;
  pageSectionId: string;
  title: string;
  showTitle: boolean;
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
  show_title?: boolean | null;
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
  show_title?: boolean;
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

let supportsShowTitleColumn: boolean | null = null;

const isMissingShowTitleError = (error: { message?: string | null; details?: string | null } | null): boolean => {
  const normalized = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return normalized.includes('show_title') && (normalized.includes('column') || normalized.includes('schema cache'));
};

const markShowTitleSupport = (usedShowTitle: boolean) => {
  if (supportsShowTitleColumn === null) {
    supportsShowTitleColumn = usedShowTitle;
  }
};

const mapSection = (row: SectionRow): ContentSection => ({
  id: row.id,
  pageSectionId: row.page_section_id,
  title: row.title,
  showTitle: row.show_title ?? true,
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
  let usedShowTitle = supportsShowTitleColumn !== false;
  let data: SectionRow[] | null = null;
  let error: { message?: string | null; details?: string | null } | null = null;
  {
    const response = await supabase
      .from('content_sections')
      .select(
        usedShowTitle
          ? 'id, page_section_id, title, show_title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
          : 'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .eq('page_section_id', pageSectionId)
      .order('created_at', { ascending: true });
    data = response.data as SectionRow[] | null;
    error = response.error;
  }
  if (error && usedShowTitle && isMissingShowTitleError(error)) {
    supportsShowTitleColumn = false;
    usedShowTitle = false;
    const response = await supabase
      .from('content_sections')
      .select(
        'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .eq('page_section_id', pageSectionId)
      .order('created_at', { ascending: true });
    data = response.data as SectionRow[] | null;
    error = response.error;
  }
  if (error) {
    throw error;
  }
  markShowTitleSupport(usedShowTitle);
  return (data ?? []).map(mapSection);
};

const getContentSectionById = async (id: string): Promise<ContentSection> => {
  let usedShowTitle = supportsShowTitleColumn !== false;
  let data: SectionRow | null = null;
  let error: { message?: string | null; details?: string | null } | null = null;
  {
    const response = await supabase
      .from('content_sections')
      .select(
        usedShowTitle
          ? 'id, page_section_id, title, show_title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
          : 'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .eq('id', id)
      .single();
    data = response.data as SectionRow | null;
    error = response.error;
  }
  if (error && usedShowTitle && isMissingShowTitleError(error)) {
    supportsShowTitleColumn = false;
    usedShowTitle = false;
    const response = await supabase
      .from('content_sections')
      .select(
        'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .eq('id', id)
      .single();
    data = response.data as SectionRow | null;
    error = response.error;
  }
  if (error || !data) {
    throw error ?? new Error('Failed to load section.');
  }
  markShowTitleSupport(usedShowTitle);
  return mapSection(data);
};

export const createContentSection = async (input: {
  pageSectionId: string;
  title: string;
  ownerId: string;
  ownerName: string;
  showTitle?: boolean;
  showAuthor?: boolean;
  showPublishDate?: boolean;
  publishDate?: string | null;
  editorIds?: string[];
}): Promise<ContentSection> => {
  let usedShowTitle = supportsShowTitleColumn !== false;
  const insertPayload: Record<string, unknown> = {
    page_section_id: input.pageSectionId,
    title: input.title,
    show_title: input.showTitle ?? true,
    owner_id: input.ownerId,
    owner_name: input.ownerName,
    show_author: input.showAuthor ?? false,
    show_publish_date: input.showPublishDate ?? false,
    publish_date: input.publishDate ?? null,
    editor_ids: input.editorIds ?? []
  };
  if (!usedShowTitle) {
    delete insertPayload.show_title;
  }

  let data: SectionRow | null = null;
  let error: { message?: string | null; details?: string | null } | null = null;
  {
    const response = await supabase
      .from('content_sections')
      .insert(insertPayload)
      .select(
        usedShowTitle
          ? 'id, page_section_id, title, show_title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
          : 'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .single();
    data = response.data as SectionRow | null;
    error = response.error;
  }
  if (error && usedShowTitle && isMissingShowTitleError(error)) {
    supportsShowTitleColumn = false;
    usedShowTitle = false;
    delete insertPayload.show_title;
    const response = await supabase
      .from('content_sections')
      .insert(insertPayload)
      .select(
        'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .single();
    data = response.data as SectionRow | null;
    error = response.error;
  }
  if (error || !data) {
    throw error ?? new Error('Failed to create section.');
  }
  markShowTitleSupport(usedShowTitle);
  return mapSection(data);
};

export const updateContentSection = async (
  id: string,
  updates: {
    title?: string;
    showTitle?: boolean;
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
  if (updates.showTitle !== undefined) {
    updatePayload.show_title = updates.showTitle;
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

  let usedShowTitle = supportsShowTitleColumn !== false;
  if (!usedShowTitle) {
    delete updatePayload.show_title;
  }
  if (Object.keys(updatePayload).length === 0) {
    return getContentSectionById(id);
  }

  let data: SectionRow | null = null;
  let error: { message?: string | null; details?: string | null } | null = null;
  {
    const response = await supabase
      .from('content_sections')
      .update(updatePayload)
      .eq('id', id)
      .select(
        usedShowTitle
          ? 'id, page_section_id, title, show_title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
          : 'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .single();
    data = response.data as SectionRow | null;
    error = response.error;
  }
  if (error && usedShowTitle && isMissingShowTitleError(error)) {
    supportsShowTitleColumn = false;
    usedShowTitle = false;
    delete updatePayload.show_title;
    if (Object.keys(updatePayload).length === 0) {
      return getContentSectionById(id);
    }
    const response = await supabase
      .from('content_sections')
      .update(updatePayload)
      .eq('id', id)
      .select(
        'id, page_section_id, title, owner_id, owner_name, show_author, show_publish_date, publish_date, editor_ids, created_at, updated_at'
      )
      .single();
    data = response.data as SectionRow | null;
    error = response.error;
  }
  if (error || !data) {
    throw error ?? new Error('Failed to update section.');
  }
  markShowTitleSupport(usedShowTitle);
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
