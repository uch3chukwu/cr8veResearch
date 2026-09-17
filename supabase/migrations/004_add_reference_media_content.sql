-- Add first-class text content for text-based reference media.

alter table public.reference_media
add column content text;
