import { supabase } from './supabaseClient';

export type ContentSection = {
  id: string;
  pageSectionId: string;
  title: string;
  showTitle: boolean;
  orderIndex: number;
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
  order_index?: number | null;
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
  order_index?: number;
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

const sectionSchemaSupport = {
  showTitle: null as boolean | null,
  orderIndex: null as boolean | null
};

const isMissingColumnError = (
  error: { message?: string | null; details?: string | null } | null,
  columnName: 'show_title' | 'order_index'
): boolean => {
  const normalized = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase();
  return normalized.includes(columnName) && (normalized.includes('column') || normalized.includes('schema cache'));
};

const getSectionSelect = (useShowTitle: boolean, useOrderIndex: boolean): string => {
  const fields = ['id', 'page_section_id', 'title'];
  if (useShowTitle) {
    fields.push('show_title');
  }
  if (useOrderIndex) {
    fields.push('order_index');
  }
  fields.push(
    'owner_id',
    'owner_name',
    'show_author',
    'show_publish_date',
    'publish_date',
    'editor_ids',
    'created_at',
    'updated_at'
  );
  return fields.join(', ');
};

const mapSection = (row: SectionRow): ContentSection => ({
  id: row.id,
  pageSectionId: row.page_section_id,
  title: row.title,
  showTitle: row.show_title ?? true,
  orderIndex: row.order_index ?? 0,
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

const markSchemaSupport = (useShowTitle: boolean, useOrderIndex: boolean) => {
  if (sectionSchemaSupport.showTitle === null) {
    sectionSchemaSupport.showTitle = useShowTitle;
  }
  if (sectionSchemaSupport.orderIndex === null) {
    sectionSchemaSupport.orderIndex = useOrderIndex;
  }
};

const listSectionsQuery = async (
  pageSectionId: string,
  useShowTitle: boolean,
  useOrderIndex: boolean
): Promise<{ data: SectionRow[] | null; error: { message?: string | null; details?: string | null } | null }> => {
  const response = await supabase
    .from('content_sections')
    .select(getSectionSelect(useShowTitle, useOrderIndex))
    .eq('page_section_id', pageSectionId)
    .order(useOrderIndex ? 'order_index' : 'created_at', { ascending: true });
  return {
    data: response.data as SectionRow[] | null,
    error: response.error
  };
};

const getSectionQuery = async (
  id: string,
  useShowTitle: boolean,
  useOrderIndex: boolean
): Promise<{ data: SectionRow | null; error: { message?: string | null; details?: string | null } | null }> => {
  const response = await supabase.from('content_sections').select(getSectionSelect(useShowTitle, useOrderIndex)).eq('id', id).single();
  return {
    data: response.data as SectionRow | null,
    error: response.error
  };
};

const insertSectionQuery = async (
  payload: Record<string, unknown>,
  useShowTitle: boolean,
  useOrderIndex: boolean
): Promise<{ data: SectionRow | null; error: { message?: string | null; details?: string | null } | null }> => {
  const response = await supabase.from('content_sections').insert(payload).select(getSectionSelect(useShowTitle, useOrderIndex)).single();
  return {
    data: response.data as SectionRow | null,
    error: response.error
  };
};

const updateSectionQuery = async (
  id: string,
  payload: SectionUpdateRow,
  useShowTitle: boolean,
  useOrderIndex: boolean
): Promise<{ data: SectionRow | null; error: { message?: string | null; details?: string | null } | null }> => {
  const response = await supabase
    .from('content_sections')
    .update(payload)
    .eq('id', id)
    .select(getSectionSelect(useShowTitle, useOrderIndex))
    .single();
  return {
    data: response.data as SectionRow | null,
    error: response.error
  };
};

export const listContentSections = async (pageSectionId: string): Promise<ContentSection[]> => {
  let useShowTitle = sectionSchemaSupport.showTitle !== false;
  let useOrderIndex = sectionSchemaSupport.orderIndex !== false;
  let { data, error } = await listSectionsQuery(pageSectionId, useShowTitle, useOrderIndex);

  if (error && useShowTitle && isMissingColumnError(error, 'show_title')) {
    sectionSchemaSupport.showTitle = false;
    useShowTitle = false;
    ({ data, error } = await listSectionsQuery(pageSectionId, useShowTitle, useOrderIndex));
  }
  if (error && useOrderIndex && isMissingColumnError(error, 'order_index')) {
    sectionSchemaSupport.orderIndex = false;
    useOrderIndex = false;
    ({ data, error } = await listSectionsQuery(pageSectionId, useShowTitle, useOrderIndex));
  }
  if (error) {
    throw error;
  }
  markSchemaSupport(useShowTitle, useOrderIndex);
  return (data ?? []).map(mapSection);
};

const getContentSectionById = async (id: string): Promise<ContentSection> => {
  let useShowTitle = sectionSchemaSupport.showTitle !== false;
  let useOrderIndex = sectionSchemaSupport.orderIndex !== false;
  let { data, error } = await getSectionQuery(id, useShowTitle, useOrderIndex);

  if (error && useShowTitle && isMissingColumnError(error, 'show_title')) {
    sectionSchemaSupport.showTitle = false;
    useShowTitle = false;
    ({ data, error } = await getSectionQuery(id, useShowTitle, useOrderIndex));
  }
  if (error && useOrderIndex && isMissingColumnError(error, 'order_index')) {
    sectionSchemaSupport.orderIndex = false;
    useOrderIndex = false;
    ({ data, error } = await getSectionQuery(id, useShowTitle, useOrderIndex));
  }
  if (error || !data) {
    throw error ?? new Error('Failed to load section.');
  }
  markSchemaSupport(useShowTitle, useOrderIndex);
  return mapSection(data);
};

export const createContentSection = async (input: {
  pageSectionId: string;
  title: string;
  ownerId: string;
  ownerName: string;
  showTitle?: boolean;
  orderIndex?: number;
  showAuthor?: boolean;
  showPublishDate?: boolean;
  publishDate?: string | null;
  editorIds?: string[];
}): Promise<ContentSection> => {
  let useShowTitle = sectionSchemaSupport.showTitle !== false;
  let useOrderIndex = sectionSchemaSupport.orderIndex !== false;
  const insertPayload: Record<string, unknown> = {
    page_section_id: input.pageSectionId,
    title: input.title,
    show_title: input.showTitle ?? true,
    order_index: input.orderIndex ?? 0,
    owner_id: input.ownerId,
    owner_name: input.ownerName,
    show_author: input.showAuthor ?? false,
    show_publish_date: input.showPublishDate ?? false,
    publish_date: input.publishDate ?? null,
    editor_ids: input.editorIds ?? []
  };
  if (!useShowTitle) {
    delete insertPayload.show_title;
  }
  if (!useOrderIndex) {
    delete insertPayload.order_index;
  }

  let { data, error } = await insertSectionQuery(insertPayload, useShowTitle, useOrderIndex);
  if (error && useShowTitle && isMissingColumnError(error, 'show_title')) {
    sectionSchemaSupport.showTitle = false;
    useShowTitle = false;
    delete insertPayload.show_title;
    ({ data, error } = await insertSectionQuery(insertPayload, useShowTitle, useOrderIndex));
  }
  if (error && useOrderIndex && isMissingColumnError(error, 'order_index')) {
    sectionSchemaSupport.orderIndex = false;
    useOrderIndex = false;
    delete insertPayload.order_index;
    ({ data, error } = await insertSectionQuery(insertPayload, useShowTitle, useOrderIndex));
  }
  if (error || !data) {
    throw error ?? new Error('Failed to create section.');
  }
  markSchemaSupport(useShowTitle, useOrderIndex);
  return mapSection(data);
};

export const updateContentSection = async (
  id: string,
  updates: {
    title?: string;
    showTitle?: boolean;
    orderIndex?: number;
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
  if (updates.orderIndex !== undefined) {
    updatePayload.order_index = updates.orderIndex;
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

  let useShowTitle = sectionSchemaSupport.showTitle !== false;
  let useOrderIndex = sectionSchemaSupport.orderIndex !== false;
  if (!useShowTitle) {
    delete updatePayload.show_title;
  }
  if (!useOrderIndex) {
    if (updates.orderIndex !== undefined) {
      throw new Error('Section ordering is not available until the latest migration is applied.');
    }
    delete updatePayload.order_index;
  }
  if (Object.keys(updatePayload).length === 0) {
    return getContentSectionById(id);
  }

  let { data, error } = await updateSectionQuery(id, updatePayload, useShowTitle, useOrderIndex);
  if (error && useShowTitle && isMissingColumnError(error, 'show_title')) {
    sectionSchemaSupport.showTitle = false;
    useShowTitle = false;
    delete updatePayload.show_title;
    if (Object.keys(updatePayload).length === 0) {
      return getContentSectionById(id);
    }
    ({ data, error } = await updateSectionQuery(id, updatePayload, useShowTitle, useOrderIndex));
  }
  if (error && useOrderIndex && isMissingColumnError(error, 'order_index')) {
    sectionSchemaSupport.orderIndex = false;
    if (updates.orderIndex !== undefined) {
      throw new Error('Section ordering is not available until the latest migration is applied.');
    }
    useOrderIndex = false;
    delete updatePayload.order_index;
    if (Object.keys(updatePayload).length === 0) {
      return getContentSectionById(id);
    }
    ({ data, error } = await updateSectionQuery(id, updatePayload, useShowTitle, useOrderIndex));
  }
  if (error || !data) {
    throw error ?? new Error('Failed to update section.');
  }
  markSchemaSupport(useShowTitle, useOrderIndex);
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
