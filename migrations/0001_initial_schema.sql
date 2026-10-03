-- =====================================================================
-- 1st Choice IELTS & Immigration — Initial D1 Schema
-- =====================================================================

-- ---------------------------------------------------------------------
-- admin_users: staff & owner accounts for /admin
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- ---------------------------------------------------------------------
-- sessions: server-side session store for admin auth (cookie = session id)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,                -- random 256-bit token (hex)
  admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ---------------------------------------------------------------------
-- enquiries: lead-capture form submissions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  service TEXT NOT NULL CHECK (service IN ('Coaching','Study Abroad','Loan','Visa','Other')),
  preferred_country TEXT,
  last_qualification TEXT,
  message TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  source_page TEXT,
  extra_json TEXT,                    -- e.g. loan calculator result attached
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New','Contacted','Follow-up','Converted','Closed')),
  assigned_to INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  notes TEXT,                         -- JSON array of {by, at, text}
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_service ON enquiries(service);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned ON enquiries(assigned_to);

-- ---------------------------------------------------------------------
-- visa_results: approved visa poster gallery
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visa_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  country TEXT NOT NULL,              -- Canada, UK, Australia, USA, Germany, etc.
  visa_type TEXT NOT NULL,            -- Study Visa, PR, Visitor, SOWP, etc.
  image_url TEXT NOT NULL,
  visa_date TEXT,                     -- date of approval (free text/date)
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_visa_country ON visa_results(country);
CREATE INDEX IF NOT EXISTS idx_visa_type ON visa_results(visa_type);
CREATE INDEX IF NOT EXISTS idx_visa_published ON visa_results(is_published);

-- ---------------------------------------------------------------------
-- coaching_results: IELTS/PTE band-score achievers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaching_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  photo_url TEXT,
  exam_type TEXT NOT NULL DEFAULT 'IELTS', -- IELTS / PTE / CELPIP / etc.
  listening REAL,
  reading REAL,
  writing REAL,
  speaking REAL,
  overall_band REAL NOT NULL,
  batch TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coaching_published ON coaching_results(is_published);
CREATE INDEX IF NOT EXISTS idx_coaching_exam ON coaching_results(exam_type);

-- ---------------------------------------------------------------------
-- news_posts: blog / immigration updates
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('Canada','UK','Australia','USA','General')),
  cover_image_url TEXT,
  excerpt TEXT,
  content_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled')),
  published_at TEXT,
  author_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news_posts(slug);
CREATE INDEX IF NOT EXISTS idx_news_status ON news_posts(status);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_posts(category);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_posts(published_at);

-- ---------------------------------------------------------------------
-- countries: Study Abroad country pages (editable content)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS countries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  flag_emoji TEXT,
  hero_image_url TEXT,
  intro TEXT,
  universities_json TEXT,       -- JSON array of {name, location, ranking}
  intakes TEXT,                 -- e.g. "Jan, May, Sep"
  avg_fees TEXT,
  eligibility TEXT,
  work_rights TEXT,
  pr_pathway TEXT,
  documents_json TEXT,          -- JSON array of strings
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_countries_slug ON countries(slug);
-- NOTE: `region` column (e.g. "Europe" groups Germany/Ireland/France/Poland)
-- is added later via migration 0003 (ALTER TABLE) — kept out of this file
-- since it was already applied to existing databases before region existed.

-- ---------------------------------------------------------------------
-- reviews: manual reviews + toggles for Google/Instagram embeds
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','google','instagram')),
  author_name TEXT NOT NULL,
  author_photo_url TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  review_date TEXT,
  is_visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_visible ON reviews(is_visible);

-- ---------------------------------------------------------------------
-- site_settings: single-row key/value style settings (JSON blobs allowed)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- activity_logs: audit trail for every admin mutation
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_name TEXT,
  action TEXT NOT NULL,              -- e.g. "enquiry.update_status"
  entity TEXT,                       -- e.g. "enquiries"
  entity_id TEXT,
  details TEXT,                      -- JSON string of what changed
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_logs_admin ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);

-- ---------------------------------------------------------------------
-- rate_limits: simple IP-based rate limiting for public form endpoints
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  route TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_route ON rate_limits(ip_address, route, created_at);
