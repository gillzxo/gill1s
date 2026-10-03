-- =====================================================================
-- Migration 0003: Correct business address (Bagha Purana, not Ludhiana),
-- add "Since 2018" + Managing Director + popup settings, add a `region`
-- column to countries (for the Europe grouping), and add New Zealand +
-- Ireland + France + Poland country entries.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Fix wrong address + related settings (overwrite, not INSERT OR IGNORE)
-- ---------------------------------------------------------------------
INSERT INTO site_settings (key, value, updated_at) VALUES
  ('address', 'Opp. Bus Stand, Kotkapura Road, Bagha Purana, Moga, Punjab 142038', datetime('now')),
  ('google_maps_embed', 'https://www.google.com/maps?q=Opp.+Bus+Stand,+Kotkapura+Road,+Bagha+Purana,+Moga,+Punjab+142038&output=embed', datetime('now')),
  ('branch_name', '1st Choice IELTS & Immigration (Bagha Purana)', datetime('now')),
  ('founded_year', '2018', datetime('now')),
  ('stat_years_experience', '8', datetime('now')),
  ('md_name', 'Gurpiar Singh Gill', datetime('now')),
  ('md_title', 'Managing Director', datetime('now')),
  ('md_photo_url', '/static/images/director-gurpiar-singh-gill.jpg', datetime('now')),
  ('md_bio', 'Gurpiar Singh Gill founded 1st Choice IELTS & Immigration in Bagha Purana in 2018 with one simple goal — give students in Moga and the surrounding villages honest, affordable access to world-class IELTS/PTE coaching and transparent immigration advice, without having to travel to a big city. Since then he has personally guided thousands of students through their IELTS/PTE preparation and visa journeys to Canada, UK, Australia, USA and Europe. Known locally for his straight-talking, no-false-promises approach, Gurpiar believes every student deserves a genuine assessment of their chances — not just a sale.', datetime('now')),
  ('popup_enabled', '1', datetime('now')),
  ('popup_title', 'Free IELTS/PTE Demo Class!', datetime('now')),
  ('popup_text', 'Get a FREE demo class and a honest assessment of your study abroad / visa chances — no strings attached. Limited seats every week.', datetime('now')),
  ('popup_cta_text', 'Claim My Free Spot', datetime('now')),
  ('popup_cta_link', '/register', datetime('now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------
-- 2. Add `region` column to countries (nullable) for Europe grouping
-- ---------------------------------------------------------------------
ALTER TABLE countries ADD COLUMN region TEXT;

-- Germany is part of the new "Europe" grouping
UPDATE countries SET region = 'Europe' WHERE slug = 'germany';

-- ---------------------------------------------------------------------
-- 3. New Zealand (standalone destination)
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO countries
 (name, slug, flag_emoji, intro, universities_json, intakes, avg_fees, eligibility, work_rights, pr_pathway, documents_json, region, sort_order)
VALUES
('New Zealand','new-zealand','🇳🇿',
 'New Zealand offers high-quality, globally recognised education in a safe, friendly environment, with generous post-study work rights and a straightforward pathway to residency for skilled graduates.',
 '[{"name":"University of Auckland","location":"Auckland","ranking":"#1 in New Zealand"},{"name":"Auckland University of Technology (AUT)","location":"Auckland","ranking":"Popular with Indian Students"},{"name":"Victoria University of Wellington","location":"Wellington","ranking":"Top for Law & Humanities"},{"name":"University of Waikato","location":"Hamilton","ranking":"Strong Scholarships"}]',
 'February, July',
 'NZD 18,000 - 32,000 / year',
 'IELTS 6.0-6.5 overall, 12th pass or Bachelor''s degree, SOP, genuine intent to study',
 '20 hrs/week during study, full-time during scheduled breaks',
 'Post Study Work Visa (up to 3 years) → Skilled Migrant Category (SMC) → Residence',
 '["Valid Passport","Academic Transcripts (10th, 12th, Bachelor''s)","IELTS/PTE Score Card","Statement of Purpose (SOP)","Offer of Place from Institution","Proof of Funds","Medical & Chest X-Ray Certificate","Passport size photographs"]',
 NULL,
 6),

('Ireland','ireland','🇮🇪',
 'Ireland is fast becoming a favourite European destination for Indian students, offering English-taught degrees, a 2-year post-study Stay Back visa, and a thriving tech & pharma job market.',
 '[{"name":"Trinity College Dublin","location":"Dublin","ranking":"#1 in Ireland"},{"name":"University College Dublin (UCD)","location":"Dublin","ranking":"Top for Business & Tech"},{"name":"Dublin City University (DCU)","location":"Dublin","ranking":"Strong Industry Links"},{"name":"National University of Ireland, Galway","location":"Galway","ranking":"Popular with Indian Students"}]',
 'September, January',
 'EUR 10,000 - 20,000 / year',
 'IELTS 6.0-6.5 overall, relevant Bachelor''s degree for Master''s programmes',
 '20 hrs/week during term-time, full-time during holidays',
 'Third Level Graduate Scheme / Stay Back visa (1-2 years) → Critical Skills Employment Permit → Stamp 4 (long-term residency)',
 '["Valid Passport","Academic Transcripts & Degree Certificates","IELTS/PTE Score Card","Letter of Offer from Institution","Statement of Purpose","Proof of Funds (EUR 10,000+ maintained)","Private Medical Insurance","Passport size photographs"]',
 'Europe',
 7),

('France','france','🇫🇷',
 'France offers affordable, high-quality education (especially in business, engineering and fashion), a large Indian student community, and a 1-2 year post-study job search residence permit (APS).',
 '[{"name":"Sorbonne University","location":"Paris","ranking":"Top Ranked Globally"},{"name":"INSEAD","location":"Fontainebleau","ranking":"#1 Business School in Europe"},{"name":"CentraleSupélec","location":"Paris region","ranking":"Top Engineering Grande École"},{"name":"EDHEC Business School","location":"Lille/Nice","ranking":"Popular with Indian Students"}]',
 'September, January',
 'EUR 2,500 - 15,000 / year (public universities are low-cost)',
 'IELTS 6.0+ (for English-taught programmes) or French B2, relevant academic background',
 '20 hrs/week during study, full-time during holidays',
 'Autorisation Provisoire de Séjour (APS) 1-2 years → Talent Passport → Long-term residency',
 '["Valid Passport","Academic Transcripts & Degree Certificates","IELTS/TCF/TEF Score Card","Campus France / Admission Letter","Statement of Purpose","Proof of Funds (Campus France-verified)","Health/Travel Insurance","Passport size photographs"]',
 'Europe',
 8),

('Poland','poland','🇵🇱',
 'Poland is one of Europe''s most budget-friendly study destinations, with low tuition, a low cost of living, and growing recognition among Indian students for engineering, medicine and business programmes.',
 '[{"name":"University of Warsaw","location":"Warsaw","ranking":"#1 in Poland"},{"name":"Warsaw University of Technology","location":"Warsaw","ranking":"Top Engineering University"},{"name":"Jagiellonian University","location":"Kraków","ranking":"Oldest & Most Prestigious"},{"name":"AGH University of Science and Technology","location":"Kraków","ranking":"Popular for Tech Programmes"}]',
 'October, February',
 'EUR 2,000 - 6,000 / year',
 'IELTS 6.0+ overall, relevant academic background, SOP',
 '20 hrs/week during study, full-time during holidays (with work permit)',
 'Temporary Residence Permit for job search (up to 1 year) → Work Permit → Permanent Residency',
 '["Valid Passport","Academic Transcripts & Degree Certificates","IELTS Score Card","Letter of Acceptance from University","Statement of Purpose","Proof of Funds","Health Insurance","Passport size photographs"]',
 'Europe',
 9);
