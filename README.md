# 文件管理系統 Document Management System

以分類管理、上傳、下載、搜尋文件的全端 Web 應用程式。

---

## 功能

- 文件上傳（拖曳或點選，單檔上限 50MB）
- 分類管理（新增 / 刪除，預設提供合約、財務、技術等分類）
- 標籤與描述編輯
- 全文搜尋（即時搜尋檔名與標籤）
- 依分類篩選、分頁瀏覽
- 文件下載（保留原始檔名）
- Toast 通知回饋

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 19 + TypeScript |
| 後端 | Express.js 5 |
| 資料庫 | SQLite3 |
| 檔案上傳 | Multer |
| HTTP Client | Axios |
| Icons | Lucide React |

## 專案結構

```
document-management/
├── backend/
│   └── src/
│       ├── index.js          # 伺服器入口
│       ├── db.js             # 資料庫初始化
│       ├── routes/
│       │   ├── documents.js  # 文件 CRUD API
│       │   └── categories.js # 分類 API
│       └── uploads/          # 上傳檔案儲存目錄
├── frontend/
│   └── src/
│       ├── App.tsx           # 主畫面
│       └── api.ts            # API 呼叫封裝
└── start.bat                 # Windows 一鍵啟動
```

## 快速開始

### Windows（一鍵啟動）

```bash
start.bat
```

會自動開啟兩個視窗：後端 `http://localhost:3001`、前端 `http://localhost:3000`。

### 手動啟動

**後端**

```bash
cd backend
npm install
npm start
# 開發模式（熱重載）：npm run dev
```

**前端**（另開終端機）

```bash
cd frontend
npm install
npm start
```

開啟瀏覽器前往 `http://localhost:3000`。

> 首次啟動會自動建立 `documents.db` 並填入預設分類。

## API

Base URL：`http://localhost:3001/api`

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/documents` | 取得文件列表（支援 `search`、`category`、`page`、`limit`） |
| GET | `/documents/:id` | 取得單一文件 |
| POST | `/documents` | 上傳文件 |
| PUT | `/documents/:id` | 更新文件資訊 |
| DELETE | `/documents/:id` | 刪除文件 |
| GET | `/documents/:id/download` | 下載文件 |
| GET | `/categories` | 取得所有分類 |
| POST | `/categories` | 新增分類 |
| DELETE | `/categories/:id` | 刪除分類 |

## 預設分類

- 合約文件
- 財務報表
- 技術文件
- 人事資料
- 其他
