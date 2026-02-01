-- Migration 002: Create assets table for file storage management
-- Created: 2026-02-01

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('model', 'material', 'texture')),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  thumbnail_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying assets by project and type
CREATE INDEX IF NOT EXISTS idx_assets_project_type ON assets(project_id, type);

-- Index for querying assets by project
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_assets_timestamp
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION update_assets_updated_at();

-- Comments for documentation
COMMENT ON TABLE assets IS 'Stores metadata for project assets (models, materials, textures)';
COMMENT ON COLUMN assets.file_path IS 'Relative path to the file in the uploads directory';
COMMENT ON COLUMN assets.metadata IS 'Additional metadata like format, vertices count, dimensions, etc.';
