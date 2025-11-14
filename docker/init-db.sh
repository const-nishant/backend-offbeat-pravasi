#!/bin/bash
set -e

# Create database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'Database $POSTGRES_DB already exists' AS result;
EOSQL

# If the above fails, create the database
if [ $? -ne 0 ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
        CREATE DATABASE "$POSTGRES_DB";
EOSQL
fi

