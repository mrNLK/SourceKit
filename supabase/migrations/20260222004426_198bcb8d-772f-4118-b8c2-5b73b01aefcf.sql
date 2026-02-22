
-- Create watchlist_items table
CREATE TABLE public.watchlist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_username text NOT NULL,
  candidate_name text,
  candidate_avatar_url text,
  list_name text NOT NULL DEFAULT 'Default',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (candidate_username, list_name)
);

-- Enable RLS
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing app pattern - no auth)
CREATE POLICY "Allow public read watchlist_items" ON public.watchlist_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert watchlist_items" ON public.watchlist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete watchlist_items" ON public.watchlist_items FOR DELETE USING (true);
CREATE POLICY "Allow public update watchlist_items" ON public.watchlist_items FOR UPDATE USING (true);
