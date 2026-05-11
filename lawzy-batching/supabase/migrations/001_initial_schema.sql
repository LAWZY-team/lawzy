-- Cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'error')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- General Info table (JSONB for flexibility)
CREATE TABLE general_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE UNIQUE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  language TEXT DEFAULT 'vi' CHECK (language IN ('vi', 'en', 'both')),
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (generated outputs)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  output_path TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_general_info_case_id ON general_info(case_id);
CREATE INDEX idx_documents_case_id ON documents(case_id);

-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases
CREATE POLICY "Users can view own cases" ON cases
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can insert own cases" ON cases
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own cases" ON cases
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Leaders can view all cases" ON cases
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'leader'
  );

-- RLS Policies for general_info
CREATE POLICY "Users can view own general_info" ON general_info
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = general_info.case_id AND cases.created_by = auth.uid())
  );

CREATE POLICY "Users can insert own general_info" ON general_info
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = general_info.case_id AND cases.created_by = auth.uid())
  );

CREATE POLICY "Users can update own general_info" ON general_info
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = general_info.case_id AND cases.created_by = auth.uid())
  );

-- Templates are public read
CREATE POLICY "Templates are viewable by all authenticated users" ON templates
  FOR SELECT USING (auth.role() = 'authenticated');
