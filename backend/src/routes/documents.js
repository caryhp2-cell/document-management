const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// GET all documents with optional filters
router.get('/', (req, res) => {
  const { search, category_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT d.*, c.name as category_name
    FROM documents d
    LEFT JOIN categories c ON d.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (d.name LIKE ? OR d.description LIKE ? OR d.tags LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category_id) {
    query += ` AND d.category_id = ?`;
    params.push(category_id);
  }

  query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM documents d WHERE 1=1`;
    const countParams = [];
    if (search) {
      countQuery += ` AND (d.name LIKE ? OR d.description LIKE ? OR d.tags LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category_id) {
      countQuery += ` AND d.category_id = ?`;
      countParams.push(category_id);
    }

    db.get(countQuery, countParams, (err2, countRow) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({
        documents: rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })),
        total: countRow.total,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    });
  });
});

// GET single document
router.get('/:id', (req, res) => {
  db.get(
    `SELECT d.*, c.name as category_name FROM documents d LEFT JOIN categories c ON d.category_id = c.id WHERE d.id = ?`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: '文件不存在' });
      res.json({ ...row, tags: JSON.parse(row.tags || '[]') });
    }
  );
});

// POST upload document
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '請上傳文件' });

  const id = path.basename(req.file.filename, path.extname(req.file.filename));
  const { category_id, description = '', tags = '[]' } = req.body;

  db.run(
    `INSERT INTO documents (id, name, original_name, size, mime_type, category_id, tags, description, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      req.file.originalname,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      category_id || null,
      tags,
      description,
      req.file.filename
    ],
    function(err) {
      if (err) {
        fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: err.message });
      }
      db.get(
        `SELECT d.*, c.name as category_name FROM documents d LEFT JOIN categories c ON d.category_id = c.id WHERE d.id = ?`,
        [id],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(201).json({ ...row, tags: JSON.parse(row.tags || '[]') });
        }
      );
    }
  );
});

// PUT update document metadata
router.put('/:id', (req, res) => {
  const { name, category_id, description, tags } = req.body;
  db.run(
    `UPDATE documents SET name = ?, category_id = ?, description = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, category_id || null, description, JSON.stringify(tags || []), req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: '文件不存在' });
      db.get(
        `SELECT d.*, c.name as category_name FROM documents d LEFT JOIN categories c ON d.category_id = c.id WHERE d.id = ?`,
        [req.params.id],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ ...row, tags: JSON.parse(row.tags || '[]') });
        }
      );
    }
  );
});

// DELETE document
router.delete('/:id', (req, res) => {
  db.get('SELECT file_path FROM documents WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '文件不存在' });

    db.run('DELETE FROM documents WHERE id = ?', [req.params.id], function(delErr) {
      if (delErr) return res.status(500).json({ error: delErr.message });

      const filePath = path.join(UPLOAD_DIR, row.file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      res.json({ message: '刪除成功' });
    });
  });
});

// GET download document
router.get('/:id/download', (req, res) => {
  db.get('SELECT * FROM documents WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: '文件不存在' });

    const filePath = path.join(UPLOAD_DIR, row.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件已遺失' });

    res.download(filePath, row.original_name);
  });
});

module.exports = router;
