-- Create database if it doesn't exist
-- This script runs automatically on first PostgreSQL initialization
-- Note: This only runs on first initialization. If volume already exists, 
-- you'll need to manually create the database or recreate the volume.

-- Connect to postgres database (default) to create our target database
\c postgres

-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE offbeat_pravasi'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'offbeat_pravasi')\gexec

