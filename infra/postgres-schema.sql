-- WeatherArchive PostgreSQL Schema
-- Compatible with AWS RDS PostgreSQL 15.x
-- Database: weatherarchive

-- Drop existing tables for clean setup
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS cities CASCADE;

-- ============================================
-- CITIES TABLE
-- ============================================
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- IMAGES TABLE
-- ============================================
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    city_slug VARCHAR(100) NOT NULL REFERENCES cities(slug) ON DELETE CASCADE,
    capture_time TIMESTAMP NOT NULL,
    camera_id VARCHAR(100) NOT NULL,
    s3_unedited_key VARCHAR(500) NOT NULL,
    s3_edited_key VARCHAR(500),
    s3_video_key VARCHAR(500),
    temperature DECIMAL(5,2),
    humidity INTEGER CHECK (humidity >= 0 AND humidity <= 100),
    air_pressure INTEGER CHECK (air_pressure > 0),
    processed BOOLEAN DEFAULT FALSE,
    used_in_video BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_camera_time UNIQUE(camera_id, capture_time)
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Index for querying images by city and time (most common query)
CREATE INDEX idx_images_city_time ON images(city_slug, capture_time DESC);

-- Index for finding unprocessed images (for resize worker)
CREATE INDEX idx_images_processed ON images(processed) WHERE NOT processed;

-- Index for finding images not yet used in videos (for video worker)
CREATE INDEX idx_images_video ON images(used_in_video) WHERE NOT used_in_video;

-- Index for time-based queries
CREATE INDEX idx_images_capture_time ON images(capture_time DESC);

-- ============================================
-- SEED DATA: European Cities
-- ============================================
INSERT INTO cities (slug, name, country) VALUES
('vienna', 'Vienna', 'Austria'),
('berlin', 'Berlin', 'Germany'),
('paris', 'Paris', 'France'),
('london', 'London', 'United Kingdom'),
('rome', 'Rome', 'Italy'),
('madrid', 'Madrid', 'Spain'),
('amsterdam', 'Amsterdam', 'Netherlands'),
('brussels', 'Brussels', 'Belgium');

-- ============================================
-- TRIGGER: Auto-update timestamp
-- ============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger on images table
CREATE TRIGGER update_images_updated_at
    BEFORE UPDATE ON images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Schema created successfully!' AS status;
SELECT COUNT(*) as city_count FROM cities;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

