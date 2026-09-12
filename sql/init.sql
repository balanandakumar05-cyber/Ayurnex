-- ============================================================
-- AYURNEX DATABASE INITIALIZATION
-- Ayurvedic Knowledge Base + RAG Vector Database
-- PostgreSQL + pgvector
-- ============================================================

-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. DOCUMENTS
-- Stores original Ayurvedic PDF/document information
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source_path TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    title TEXT,

    document_type TEXT,
    author TEXT,
    publisher TEXT,
    publication_year INTEGER,

    language TEXT DEFAULT 'en',

    description TEXT,

    file_sha256 TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    page_count INTEGER,

    reliability_level TEXT DEFAULT 'official',

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. DOCUMENT CHUNKS
-- Stores small pieces of PDF text for RAG retrieval
-- ============================================================

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL
        REFERENCES documents(id)
        ON DELETE CASCADE,

    chunk_index INTEGER NOT NULL,

    page_start INTEGER,
    page_end INTEGER,

    chapter_title TEXT,
    section_title TEXT,
    heading TEXT,

    content TEXT NOT NULL,

    content_hash TEXT NOT NULL,

    token_count INTEGER,

    -- IMPORTANT:
    -- This is currently configured for 1536-dimensional embeddings.
    -- Your embedding model must produce 1536 dimensions.
    embedding VECTOR(1536),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(document_id, chunk_index),
    UNIQUE(document_id, content_hash)
);


-- ============================================================
-- 3. AYURVEDIC HERBS
-- Structured information about medicinal plants
-- ============================================================

CREATE TABLE IF NOT EXISTS herbs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    common_name TEXT NOT NULL,
    sanskrit_name TEXT,
    hindi_name TEXT,
    scientific_name TEXT,

    regional_names JSONB NOT NULL DEFAULT '{}'::jsonb,

    plant_family TEXT,

    description TEXT,

    traditional_uses TEXT,

    safety_notes TEXT,

    contraindications TEXT,

    evidence_notes TEXT,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 4. HERB PROPERTIES
-- Ayurvedic properties such as Rasa, Guna, Virya, Vipaka
-- ============================================================

CREATE TABLE IF NOT EXISTS herb_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    herb_id UUID NOT NULL
        REFERENCES herbs(id)
        ON DELETE CASCADE,

    rasa JSONB NOT NULL DEFAULT '[]'::jsonb,

    guna JSONB NOT NULL DEFAULT '[]'::jsonb,

    virya TEXT,

    vipaka TEXT,

    dosha_effect JSONB NOT NULL DEFAULT '{}'::jsonb,

    karma JSONB NOT NULL DEFAULT '[]'::jsonb,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(herb_id)
);


-- ============================================================
-- 5. HEALTH CONDITIONS
-- Ayurvedic conditions and related descriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL UNIQUE,

    sanskrit_name TEXT,

    description TEXT,

    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,

    traditional_management TEXT,

    safety_notes TEXT,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 6. AYURVEDIC FORMULATIONS
-- Churna, Kashaya, Taila, Ghrita, Vati, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS formulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL UNIQUE,

    sanskrit_name TEXT,

    formulation_type TEXT,

    description TEXT,

    traditional_uses TEXT,

    preparation_description TEXT,

    dosage_information TEXT,

    safety_notes TEXT,

    contraindications TEXT,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 7. FORMULATION INGREDIENTS
-- Many-to-many relationship:
-- One formulation contains many herbs
-- One herb can belong to many formulations
-- ============================================================

CREATE TABLE IF NOT EXISTS formulation_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    formulation_id UUID NOT NULL
        REFERENCES formulations(id)
        ON DELETE CASCADE,

    herb_id UUID NOT NULL
        REFERENCES herbs(id)
        ON DELETE CASCADE,

    quantity TEXT,

    role TEXT,

    notes TEXT,

    UNIQUE(formulation_id, herb_id)
);


-- ============================================================
-- 8. HERB-CONDITION RELATIONSHIP
-- Links herbs to conditions
-- ============================================================

CREATE TABLE IF NOT EXISTS herb_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    herb_id UUID NOT NULL
        REFERENCES herbs(id)
        ON DELETE CASCADE,

    condition_id UUID NOT NULL
        REFERENCES conditions(id)
        ON DELETE CASCADE,

    relationship_type TEXT,

    evidence_level TEXT,

    notes TEXT,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    UNIQUE(herb_id, condition_id)
);


-- ============================================================
-- 9. FORMULATION-CONDITION RELATIONSHIP
-- Links formulations to conditions
-- ============================================================

CREATE TABLE IF NOT EXISTS formulation_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    formulation_id UUID NOT NULL
        REFERENCES formulations(id)
        ON DELETE CASCADE,

    condition_id UUID NOT NULL
        REFERENCES conditions(id)
        ON DELETE CASCADE,

    relationship_type TEXT,

    notes TEXT,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    UNIQUE(formulation_id, condition_id)
);


-- ============================================================
-- 10. AYURVEDIC CONCEPTS
-- Dosha, Agni, Prakriti, Ama, Dhatu, Mala, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS ayurvedic_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    concept_name TEXT NOT NULL UNIQUE,

    sanskrit_name TEXT,

    category TEXT,

    description TEXT,

    detailed_explanation TEXT,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 11. SUPPORTED LANGUAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS languages (
    id SERIAL PRIMARY KEY,

    language_code VARCHAR(10) NOT NULL UNIQUE,

    language_name TEXT NOT NULL
);


-- ============================================================
-- 12. TRANSLATIONS
-- Stores multilingual content
-- ============================================================

CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    language_id INTEGER NOT NULL
        REFERENCES languages(id)
        ON DELETE CASCADE,

    entity_type TEXT NOT NULL,

    entity_id UUID NOT NULL,

    field_name TEXT NOT NULL,

    translated_text TEXT NOT NULL,

    UNIQUE(language_id, entity_type, entity_id, field_name)
);


-- ============================================================
-- 13. SAFETY GUIDELINES
-- General safety information for chatbot responses
-- ============================================================

CREATE TABLE IF NOT EXISTS safety_guidelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    guideline_text TEXT NOT NULL,

    category TEXT,

    source_document_id UUID
        REFERENCES documents(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS documents_title_idx
ON documents(title);

CREATE INDEX IF NOT EXISTS documents_type_idx
ON documents(document_type);

CREATE INDEX IF NOT EXISTS documents_language_idx
ON documents(language);

CREATE INDEX IF NOT EXISTS document_chunks_document_idx
ON document_chunks(document_id, chunk_index);

CREATE INDEX IF NOT EXISTS document_chunks_page_idx
ON document_chunks(document_id, page_start);

CREATE INDEX IF NOT EXISTS document_chunks_metadata_idx
ON document_chunks
USING GIN(metadata);

CREATE INDEX IF NOT EXISTS herbs_common_name_idx
ON herbs(common_name);

CREATE INDEX IF NOT EXISTS herbs_scientific_name_idx
ON herbs(scientific_name);

CREATE INDEX IF NOT EXISTS conditions_name_idx
ON conditions(name);

CREATE INDEX IF NOT EXISTS formulations_name_idx
ON formulations(name);

CREATE INDEX IF NOT EXISTS concepts_name_idx
ON ayurvedic_concepts(concept_name);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;


-- ============================================================
-- FULL TEXT SEARCH INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS document_chunks_content_search_idx
ON document_chunks
USING GIN(to_tsvector('english', content));


-- ============================================================
-- VECTOR SEARCH FUNCTION
-- Used by the RAG backend
-- ============================================================

CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding VECTOR(1536),
    match_count INTEGER DEFAULT 8,
    filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    filename TEXT,
    page_start INTEGER,
    page_end INTEGER,
    heading TEXT,
    content TEXT,
    metadata JSONB,
    similarity REAL
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        c.id,
        c.document_id,
        d.filename,
        c.page_start,
        c.page_end,
        c.heading,
        c.content,
        c.metadata,

        (1 - (c.embedding <=> query_embedding))::REAL
        AS similarity

    FROM document_chunks c

    JOIN documents d
        ON d.id = c.document_id

    WHERE c.embedding IS NOT NULL

      AND c.metadata @> filter

    ORDER BY c.embedding <=> query_embedding

    LIMIT match_count;
$$;


-- ============================================================
-- SAMPLE LANGUAGES
-- ============================================================

INSERT INTO languages (language_code, language_name)
VALUES
    ('en', 'English'),
    ('hi', 'Hindi'),
    ('te', 'Telugu'),
    ('ta', 'Tamil'),
    ('kn', 'Kannada'),
    ('ml', 'Malayalam'),
    ('ja', 'Japanese')
ON CONFLICT (language_code) DO NOTHING;


-- ============================================================
-- SAMPLE AYURVEDIC DOCUMENT
-- Replace with actual PDFs later
-- ============================================================

INSERT INTO documents (
    source_path,
    filename,
    title,
    document_type,
    language,
    description,
    file_sha256,
    file_size_bytes,
    reliability_level
)
VALUES (
    '/data/sample_ayurveda.pdf',
    'sample_ayurveda.pdf',
    'Sample Ayurvedic Knowledge Document',
    'AYURVEDIC_TEXT',
    'en',
    'Demo document for testing AYURNEX database',
    'demo-hash-001',
    0,
    'demo'
)
ON CONFLICT (source_path) DO NOTHING;


-- ============================================================
-- SAMPLE HERBS
-- These are DEMO records only.
-- Replace/verify them using trusted Ayurvedic sources.
-- ============================================================

INSERT INTO herbs (
    common_name,
    sanskrit_name,
    scientific_name,
    description,
    traditional_uses,
    safety_notes,
    contraindications
)
VALUES
(
    'Ashwagandha',
    'Ashwagandha',
    'Withania somnifera',
    'A traditionally used Ayurvedic herb.',
    'Traditionally used in Ayurveda for general vitality and stress-related support.',
    'Use only with appropriate professional guidance, especially during pregnancy or when taking medicines.',
    'Pregnancy, certain medical conditions, and medication interactions require professional advice.'
),
(
    'Turmeric',
    'Haridra',
    'Curcuma longa',
    'A commonly used Ayurvedic spice and medicinal plant.',
    'Traditionally used for digestive and inflammatory support.',
    'High-dose supplements may interact with medicines.',
    'People using blood-thinning medicines should seek medical advice.'
),
(
    'Holy Basil',
    'Tulasi',
    'Ocimum tenuiflorum',
    'A traditional Ayurvedic plant used in household and classical practices.',
    'Traditionally used for respiratory and general wellness support.',
    'Dosage and suitability depend on the person and preparation.',
    'Consult a qualified professional for pregnancy, chronic illness, or medication use.'
)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SAMPLE HERB PROPERTIES
-- ============================================================

INSERT INTO herb_properties (
    herb_id,
    rasa,
    guna,
    virya,
    vipaka,
    dosha_effect,
    karma
)
SELECT
    id,
    '["Bitter", "Sweet"]'::jsonb,
    '["Heavy", "Unctuous"]'::jsonb,
    'Heating',
    'Sweet',
    '{"vata": "may balance", "pitta": "context dependent", "kapha": "context dependent"}'::jsonb,
    '["Rasayana"]'::jsonb
FROM herbs
WHERE common_name = 'Ashwagandha'
ON CONFLICT (herb_id) DO NOTHING;


INSERT INTO herb_properties (
    herb_id,
    rasa,
    guna,
    virya,
    vipaka,
    dosha_effect,
    karma
)
SELECT
    id,
    '["Bitter", "Pungent"]'::jsonb,
    '["Light", "Dry"]'::jsonb,
    'Heating',
    'Pungent',
    '{"vata": "context dependent", "pitta": "context dependent", "kapha": "may balance"}'::jsonb,
    '["Digestive support"]'::jsonb
FROM herbs
WHERE common_name = 'Turmeric'
ON CONFLICT (herb_id) DO NOTHING;


-- ============================================================
-- SAMPLE CONDITIONS
-- ============================================================

INSERT INTO conditions (
    name,
    sanskrit_name,
    description,
    symptoms,
    traditional_management
)
VALUES
(
    'Digestive discomfort',
    'Agnimandya-related discomfort',
    'A general demo category for digestive complaints.',
    '["Bloating", "Indigestion", "Reduced appetite"]'::jsonb,
    'Traditional management depends on individual assessment.'
),
(
    'Stress-related discomfort',
    'Manasika stress-related condition',
    'A demo category for stress-related complaints.',
    '["Restlessness", "Difficulty relaxing", "Sleep disturbance"]'::jsonb,
    'Individual constitution and professional assessment should be considered.'
)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- SAMPLE FORMULATIONS
-- ============================================================

INSERT INTO formulations (
    name,
    sanskrit_name,
    formulation_type,
    description,
    traditional_uses,
    preparation_description,
    dosage_information,
    safety_notes
)
VALUES
(
    'Sample Herbal Powder',
    'Sample Churna',
    'Churna',
    'Demo formulation record for database testing.',
    'Traditional use depends on the actual formulation and source.',
    'Preparation must be taken from an authenticated source.',
    'Do not use this demo dosage information clinically.',
    'Verify formulation, dosage, and contraindications with a qualified practitioner.'
),
(
    'Sample Herbal Decoction',
    'Sample Kashaya',
    'Kashaya',
    'Demo decoction record.',
    'Traditional use depends on the actual formulation.',
    'Preparation should follow a verified classical or institutional source.',
    'No clinical dosage is provided in this demo record.',
    'Professional guidance is required.'
)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- SAMPLE FORMULATION INGREDIENTS
-- ============================================================

INSERT INTO formulation_ingredients (
    formulation_id,
    herb_id,
    quantity,
    role
)
SELECT
    f.id,
    h.id,
    'Demo quantity',
    'Primary ingredient'
FROM formulations f
JOIN herbs h
    ON h.common_name = 'Ashwagandha'
WHERE f.name = 'Sample Herbal Powder'
ON CONFLICT DO NOTHING;


INSERT INTO formulation_ingredients (
    formulation_id,
    herb_id,
    quantity,
    role
)
SELECT
    f.id,
    h.id,
    'Demo quantity',
    'Supporting ingredient'
FROM formulations f
JOIN herbs h
    ON h.common_name = 'Turmeric'
WHERE f.name = 'Sample Herbal Powder'
ON CONFLICT DO NOTHING;


-- ============================================================
-- SAMPLE HERB-CONDITION RELATIONSHIPS
-- ============================================================

INSERT INTO herb_conditions (
    herb_id,
    condition_id,
    relationship_type,
    evidence_level,
    notes
)
SELECT
    h.id,
    c.id,
    'Traditional association',
    'Demo',
    'This is a sample relationship and must be verified.'
FROM herbs h
JOIN conditions c
    ON c.name = 'Stress-related discomfort'
WHERE h.common_name = 'Ashwagandha'
ON CONFLICT DO NOTHING;


INSERT INTO herb_conditions (
    herb_id,
    condition_id,
    relationship_type,
    evidence_level,
    notes
)
SELECT
    h.id,
    c.id,
    'Traditional association',
    'Demo',
    'This is a sample relationship and must be verified.'
FROM herbs h
JOIN conditions c
    ON c.name = 'Digestive discomfort'
WHERE h.common_name = 'Turmeric'
ON CONFLICT DO NOTHING;


-- ============================================================
-- SAMPLE AYURVEDIC CONCEPTS
-- ============================================================

INSERT INTO ayurvedic_concepts (
    concept_name,
    sanskrit_name,
    category,
    description,
    detailed_explanation
)
VALUES
(
    'Dosha',
    'Dosha',
    'Fundamental Concept',
    'The three functional principles traditionally described as Vata, Pitta, and Kapha.',
    'Dosha interpretation depends on Ayurvedic assessment and individual constitution.'
),
(
    'Agni',
    'Agni',
    'Digestion',
    'The Ayurvedic concept associated with digestion and metabolism.',
    'Agni is interpreted within the broader Ayurvedic assessment framework.'
),
(
    'Prakriti',
    'Prakriti',
    'Constitution',
    'The individual constitutional nature described in Ayurveda.',
    'Assessment should be performed using appropriate professional methods.'
),
(
    'Ama',
    'Ama',
    'Metabolic Concept',
    'A traditional Ayurvedic concept associated with improperly processed material.',
    'Meaning and interpretation depend on the classical source and context.'
)
ON CONFLICT (concept_name) DO NOTHING;


-- ============================================================
-- SAMPLE SAFETY GUIDELINES
-- ============================================================

INSERT INTO safety_guidelines (
    title,
    guideline_text,
    category
)
VALUES
(
    'General Medical Safety',
    'AYURNEX provides educational information and does not replace consultation with a qualified healthcare professional.',
    'General'
),
(
    'Medication Interactions',
    'Users taking medicines should consult a qualified healthcare professional before using herbs or formulations.',
    'Medication Safety'
),
(
    'Pregnancy and Children',
    'Pregnant individuals, children, and people with chronic conditions should seek professional guidance before using remedies.',
    'Special Populations'
),
(
    'Emergency Symptoms',
    'Severe symptoms, breathing difficulty, chest pain, unconsciousness, or other emergencies require immediate medical care.',
    'Emergency'
)
ON CONFLICT DO NOTHING;


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

CREATE OR REPLACE VIEW herb_summary AS
SELECT
    h.id,
    h.common_name,
    h.sanskrit_name,
    h.scientific_name,
    h.description,
    h.traditional_uses,
    h.safety_notes,
    hp.rasa,
    hp.guna,
    hp.virya,
    hp.vipaka,
    hp.dosha_effect
FROM herbs h
LEFT JOIN herb_properties hp
    ON h.id = hp.herb_id;


CREATE OR REPLACE VIEW formulation_summary AS
SELECT
    f.id AS formulation_id,
    f.name AS formulation_name,
    f.formulation_type,
    h.id AS herb_id,
    h.common_name AS herb_name,
    fi.quantity,
    fi.role
FROM formulations f
JOIN formulation_ingredients fi
    ON f.id = fi.formulation_id
JOIN herbs h
    ON h.id = fi.herb_id;


-- ============================================================
-- FINAL STATUS CHECK
-- ============================================================

SELECT 'AYURNEX database initialization completed successfully'
AS status;