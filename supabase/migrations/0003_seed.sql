-- 0003_seed.sql — initial tag_options for the QR flow (English).
-- Rating-band chips shown after the customer picks stars (FR-28).
-- Editable later without a code change; hindi/hinglish sets follow before QR launch (NFR-7).

-- Guard: safe to re-run — skips if the english set already exists.
insert into public.tag_options (category, min_rating, max_rating, label, language)
select v.category, v.min_rating, v.max_rating, v.label, v.language
from (values
  -- 1–2★ band: what went wrong
  ('service',    1, 2, 'Slow service',        'english'),
  ('cleanliness',1, 2, 'Not clean',            'english'),
  ('staff',      1, 2, 'Rude staff',           'english'),
  ('value',      1, 2, 'Overpriced',           'english'),
  ('quality',    1, 2, 'Poor quality',         'english'),
  ('experience', 1, 2, 'Would not return',     'english'),
  -- 3★ band: neutral / mixed
  ('service',    3, 3, 'It was okay',          'english'),
  ('value',      3, 3, 'Average for the price','english'),
  ('quality',    3, 3, 'Decent, not great',    'english'),
  ('experience', 3, 3, 'Mixed experience',     'english'),
  ('staff',      3, 3, 'Staff were fine',      'english'),
  ('experience', 3, 3, 'Can improve',          'english'),
  -- 4–5★ band: what went right
  ('service',    4, 5, 'Quick service',        'english'),
  ('quality',    4, 5, 'Great quality',        'english'),
  ('staff',      4, 5, 'Friendly staff',       'english'),
  ('cleanliness',4, 5, 'Clean place',          'english'),
  ('value',      4, 5, 'Good value',           'english'),
  ('experience', 4, 5, 'Would recommend',      'english')
) as v(category, min_rating, max_rating, label, language)
where not exists (select 1 from public.tag_options where language = 'english');
