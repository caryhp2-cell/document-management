import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';
import {
  getCategories, createCategory, deleteCategory,
  getDocuments, uploadDocument, updateDocument, deleteDocument, getDownloadUrl
} from './api';
import { Category, Document } from './types';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fileIcon(mime: string): string {
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('excel') || mime.includes('sheet')) return '📊';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return '📊';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('zip') || mime.includes('rar')) return '📦';
  if (mime.includes('text')) return '📃';
  return '📁';
}

function fileIconBg(mime: string): string {
  if (mime.includes('pdf')) return '#fee2e2';
  if (mime.includes('word') || mime.includes('document')) return '#dbeafe';
  if (mime.includes('excel') || mime.includes('sheet')) return '#d1fae5';
  if (mime.includes('image')) return '#fef3c7';
  return '#f3f4f6';
}

interface Toast { message: string; type: 'success' | 'error' | 'info'; }

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // Upload form
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');

  // Category form
  const [newCategoryName, setNewCategoryName] = useState('');

  const limit = 15;
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch { showToast('載入分類失敗', 'error'); }
  }, []);

  const loadDocuments = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await getDocuments({
        search: search || undefined,
        category_id: selectedCategory || undefined,
        page: p,
        limit
      });
      setDocuments(res.documents);
      setTotal(res.total);
    } catch { showToast('載入文件失敗', 'error'); }
    setLoading(false);
  }, [page, search, selectedCategory]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      loadDocuments(1);
    }, 300);
  }, [search, selectedCategory]); // eslint-disable-line

  useEffect(() => { loadDocuments(page); }, [page]); // eslint-disable-line

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadFiles(prev => [...prev, ...acceptedFiles]);
    setShowUploadModal(true);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
    multiple: true
  });

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    let success = 0;
    for (let i = 0; i < uploadFiles.length; i++) {
      const formData = new FormData();
      formData.append('file', uploadFiles[i]);
      if (uploadCategory) formData.append('category_id', uploadCategory);
      if (uploadDescription) formData.append('description', uploadDescription);
      formData.append('tags', JSON.stringify(uploadTags.split(',').map(t => t.trim()).filter(Boolean)));
      try {
        await uploadDocument(formData);
        success++;
      } catch { showToast(`上傳 ${uploadFiles[i].name} 失敗`, 'error'); }
      setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));
    }
    setUploading(false);
    if (success > 0) {
      showToast(`成功上傳 ${success} 個文件`, 'success');
      setShowUploadModal(false);
      setUploadFiles([]);
      setUploadCategory('');
      setUploadDescription('');
      setUploadTags('');
      setUploadProgress(0);
      loadDocuments(1);
      setPage(1);
    }
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditCategory(doc.category_id?.toString() || '');
    setEditDescription(doc.description);
    setEditTags(doc.tags.join(', '));
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    try {
      await updateDocument(editingDoc.id, {
        name: editName,
        category_id: editCategory ? parseInt(editCategory) : null,
        description: editDescription,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean)
      });
      showToast('更新成功', 'success');
      setShowEditModal(false);
      loadDocuments(page);
    } catch { showToast('更新失敗', 'error'); }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`確定要刪除「${doc.name}」嗎？`)) return;
    try {
      await deleteDocument(doc.id);
      showToast('刪除成功', 'success');
      loadDocuments(page);
    } catch { showToast('刪除失敗', 'error'); }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      showToast('分類新增成功', 'success');
      setNewCategoryName('');
      loadCategories();
    } catch { showToast('新增分類失敗', 'error'); }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`確定要刪除「${cat.name}」分類嗎？`)) return;
    try {
      await deleteCategory(cat.id);
      showToast('分類刪除成功', 'success');
      loadCategories();
      if (selectedCategory === cat.id) setSelectedCategory(null);
    } catch { showToast('刪除分類失敗', 'error'); }
  };

  const totalPages = Math.ceil(total / limit);


  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          🗂️ 文件管理系統
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-title">文件分類</div>
          <button
            className={`nav-item ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => { setSelectedCategory(null); setPage(1); }}
          >
            📁 全部文件
            <span className="count">{total}</span>
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`nav-item ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
            >
              📂 {cat.name}
            </button>
          ))}
          <div style={{ height: 8 }} />
          <button className="nav-item" onClick={() => setShowCategoryModal(true)}>
            ⚙️ 管理分類
          </button>
        </nav>
        <div className="sidebar-footer">文件管理系統 v1.0</div>
      </div>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <h1>{selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || '文件' : '全部文件'}</h1>
          <div className="search-box">
            🔍
            <input
              placeholder="搜尋文件名稱、標籤..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            ⬆️ 上傳文件
          </button>
        </div>

        {/* Content */}
        <div className="content">
          {/* Dropzone zone */}
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ marginBottom: 24 }}>
            <input {...getInputProps()} />
            <div className="icon">📤</div>
            <h3>拖放文件到這裡</h3>
            <p>或點擊選擇文件（支援所有格式，最大 50MB）</p>
          </div>

          {/* Doc list */}
          <div className="doc-list-header">
            <h2>文件清單 ({total} 筆)</h2>
          </div>

          <div className="doc-table">
            {loading ? (
              <div className="empty-state"><div className="icon">⏳</div><p>載入中...</p></div>
            ) : documents.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📭</div>
                <p>{search ? '找不到符合的文件' : '尚無文件，請上傳文件'}</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>文件名稱</th>
                    <th>分類</th>
                    <th>標籤</th>
                    <th>大小</th>
                    <th>上傳日期</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id}>
                      <td>
                        <div className="doc-name">
                          <div className="file-icon" style={{ background: fileIconBg(doc.mime_type) }}>
                            {fileIcon(doc.mime_type)}
                          </div>
                          <div>
                            <div>{doc.name}</div>
                            {doc.description && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{doc.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {doc.category_name
                          ? <span className="category-badge">{doc.category_name}</span>
                          : <span style={{ color: '#ccc' }}>—</span>
                        }
                      </td>
                      <td>
                        {doc.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                      </td>
                      <td style={{ color: '#666', fontSize: 13 }}>{formatSize(doc.size)}</td>
                      <td style={{ color: '#666', fontSize: 13 }}>{formatDate(doc.created_at)}</td>
                      <td>
                        <div className="actions">
                          <a href={getDownloadUrl(doc.id)} download className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}>⬇️</a>
                          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handleEdit(doc)}>✏️</button>
                          <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handleDelete(doc)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>◀</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>▶</button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowUploadModal(false)}>
          <div className="modal">
            <h2>⬆️ 上傳文件</h2>

            {uploadFiles.length === 0 ? (
              <div {...getRootProps()} className="dropzone" style={{ marginBottom: 16 }}>
                <input {...getInputProps()} />
                <div className="icon">📂</div>
                <h3>選擇文件</h3>
                <p>拖放或點擊選擇</p>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  {uploadFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                      <span>{f.name}</span>
                      <span style={{ color: '#888' }}>{formatSize(f.size)}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setUploadFiles([])}>清除列表</button>
              </div>
            )}

            <div className="form-group">
              <label>分類</label>
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>
                <option value="">— 不分類 —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>說明</label>
              <textarea value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} placeholder="輸入文件說明..." />
            </div>
            <div className="form-group">
              <label>標籤（用逗號分隔）</label>
              <input value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder="例：重要, 2024, 合約" />
            </div>

            {uploading && (
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>上傳中... {uploadProgress}%</div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowUploadModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}>
                {uploading ? '上傳中...' : `上傳 ${uploadFiles.length} 個文件`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDoc && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <h2>✏️ 編輯文件資訊</h2>
            <div className="form-group">
              <label>文件名稱</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>分類</label>
              <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                <option value="">— 不分類 —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>說明</label>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div className="form-group">
              <label>標籤（用逗號分隔）</label>
              <input value={editTags} onChange={e => setEditTags(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCategoryModal(false)}>
          <div className="modal">
            <h2>⚙️ 管理分類</h2>
            <div style={{ marginBottom: 20 }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 14 }}>📂 {cat.name}</span>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteCategory(cat)}>刪除</button>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label>新增分類</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="輸入分類名稱"
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={handleAddCategory}>新增</button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowCategoryModal(false)}>關閉</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
