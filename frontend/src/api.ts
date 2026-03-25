import axios from 'axios';
import { Category, Document, DocumentsResponse } from './types';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

export const getCategories = () => api.get<Category[]>('/categories').then(r => r.data);
export const createCategory = (name: string) => api.post<Category>('/categories', { name }).then(r => r.data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`);

export const getDocuments = (params: {
  search?: string;
  category_id?: number;
  page?: number;
  limit?: number;
}) => api.get<DocumentsResponse>('/documents', { params }).then(r => r.data);

export const getDocument = (id: string) => api.get<Document>(`/documents/${id}`).then(r => r.data);

export const uploadDocument = (formData: FormData) =>
  api.post<Document>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);

export const updateDocument = (id: string, data: {
  name: string;
  category_id: number | null;
  description: string;
  tags: string[];
}) => api.put<Document>(`/documents/${id}`, data).then(r => r.data);

export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

export const getDownloadUrl = (id: string) => `http://localhost:3001/api/documents/${id}/download`;
