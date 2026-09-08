alter table public.products
add column if not exists hover_media_url text;

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif'
]
where id = 'product-images';
