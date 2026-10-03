-- =====================================================================
-- Migration 0004:
--  1. Update the welcome popup copy to be about studying abroad (not a
--     generic "free demo class") — content now matches DEFAULT_SETTINGS
--     in src/lib/settings.ts. The popup itself now shows only ONCE EVER
--     per browser (localStorage-gated in public/static/js/app.js).
--  2. Add the Student Portal: once an enquiry is enrolled, admin creates
--     a `students` record with a unique access token. The student gets
--     a private link (/portal/:token) where they can see their
--     application status/timeline and upload documents. Admin has a
--     matching "Students" manager to track everything and upload/request
--     documents on the student's behalf.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Popup copy — study-abroad themed, matches new DEFAULT_SETTINGS
-- ---------------------------------------------------------------------
INSERT INTO site_settings (key, value, updated_at) VALUES
  ('popup_title', 'Thinking of Studying Abroad?', datetime('now')),
  ('popup_text', 'Get a FREE, honest assessment of your study-abroad chances — best-fit country, course & visa pathway — from our counsellors in Bagha Purana. No strings attached.', datetime('now')),
  ('popup_cta_text', 'Get My Free Assessment', datetime('now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------
-- 2. students: one row per enrolled student, with a unique access_token
--    used to build their private portal URL (/portal/:token). Optionally
--    linked back to the enquiry they originated from.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_id INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
  access_token TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  country TEXT,                  -- target destination, e.g. "Canada"
  course TEXT,                   -- e.g. "MBA", "Diploma in IT"
  university TEXT,
  status TEXT NOT NULL DEFAULT 'Registered'
    CHECK (status IN ('Registered','Documents Pending','Application Submitted','Visa Filed','Visa Approved','Visa Rejected','Enrolled','On Hold')),
  required_documents TEXT,       -- JSON array of strings — the checklist shown to the student
  assigned_to INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  notes TEXT,                    -- internal-only notes, never shown to the student
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_students_token ON students(access_token);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_enquiry ON students(enquiry_id);

-- ---------------------------------------------------------------------
-- 3. student_documents: files uploaded either by the student (via their
--    private portal) or by admin staff (on the student's behalf), stored
--    in the UPLOADS R2 bucket under students/<token>/...
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_name TEXT NOT NULL,        -- e.g. "Passport", "IELTS Score Card"
  file_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT 'student' CHECK (uploaded_by IN ('student','admin')),
  uploaded_by_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_student_docs_student ON student_documents(student_id);

-- ---------------------------------------------------------------------
-- 4. student_updates: a simple timeline/notes feed. Admin posts updates
--    about the application (visible to the student on their portal);
--    `is_visible_to_student` lets admin keep some notes internal-only.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  is_visible_to_student INTEGER NOT NULL DEFAULT 1,
  created_by_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_student_updates_student ON student_updates(student_id);
