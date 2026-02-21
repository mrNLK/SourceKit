
-- Candidates cache table (no auth needed, public read/write from edge functions)
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  github_username TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  followers INTEGER DEFAULT 0,
  public_repos INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  top_languages JSONB DEFAULT '[]'::jsonb,
  highlights TEXT[] DEFAULT '{}',
  score INTEGER DEFAULT 0,
  summary TEXT,
  about TEXT,
  is_hidden_gem BOOLEAN DEFAULT false,
  joined_year INTEGER,
  contributed_repos JSONB DEFAULT '{}'::jsonb,
  linkedin_url TEXT,
  linkedin_confidence TEXT,
  twitter_username TEXT,
  email TEXT,
  github_url TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_candidates_username ON public.candidates(github_username);
CREATE INDEX idx_candidates_fetched_at ON public.candidates(fetched_at);

-- Enable RLS but allow public access (no auth needed for this app)
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Allow service insert" ON public.candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service update" ON public.candidates FOR UPDATE USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
