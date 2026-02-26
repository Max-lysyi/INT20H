#!/bin/bash
set -e

echo "--- АВТОМАТИЧНИЙ ІМПОРТ GEOJSON ---"

# Використовуємо локальний сокет (без -h localhost), щоб обійти мережеві обмеження
ogr2ogr -f "PostgreSQL" \
  PG:"dbname=$POSTGRES_DB user=$POSTGRES_USER" \
  "/data_in_container/new-york-counties.geojson" \
  -nln tax_regions \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom \
  -overwrite

echo "--- ІМПОРТ ЗАВЕРШЕНО УСПІШНО ---"
