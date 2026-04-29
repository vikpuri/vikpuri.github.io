-- Requation CRM — contacts table
-- Run once in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS contacts (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firm          text NOT NULL,
  name          text,
  type          text NOT NULL CHECK (type IN ('RE_ATTORNEY','WEALTH_ADVISOR','CPA','LISTING_AGENT','REDFIN','OTHER')),
  market        text NOT NULL CHECK (market IN ('LA','AZ','NATIONAL')),
  email         text,
  phone         text,
  url           text,
  address       text,
  status        text DEFAULT 'NEW' CHECK (status IN ('NEW','CONTACTED','REPLIED','MEETING','CLOSED','PASS')),
  notes         text,
  source        text DEFAULT 'MANUAL',
  created_at    timestamptz DEFAULT now(),
  last_contact  timestamptz
);

-- Allow read/write with publishable key (internal tool — RLS is permissive)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON contacts FOR ALL USING (true) WITH CHECK (true);

-- Agent columns on existing properties table (for listing agent CRM model)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS agent_name  text,
  ADD COLUMN IF NOT EXISTS agent_email text,
  ADD COLUMN IF NOT EXISTS agent_phone text,
  ADD COLUMN IF NOT EXISTS agent_firm  text;
