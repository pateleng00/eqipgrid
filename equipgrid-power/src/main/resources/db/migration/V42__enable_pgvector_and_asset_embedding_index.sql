-- EquipGrid V42: Enable pgvector and add HNSW index for asset semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure embedding column exists on assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create HNSW index for sub-millisecond cosine similarity search
CREATE INDEX IF NOT EXISTS idx_assets_embedding_hnsw ON assets USING hnsw (embedding vector_cosine_ops);
