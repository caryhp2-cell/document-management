export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  original_name: string;
  size: number;
  mime_type: string;
  category_id: number | null;
  category_name: string | null;
  tags: string[];
  description: string;
  file_path: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
}
