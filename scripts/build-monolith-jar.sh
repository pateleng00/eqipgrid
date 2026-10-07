#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🏗️  EquipGrid Monolith: Building Station + Power..."
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "1. Building Station Frontend (React/Vite)..."
cd "$ROOT_DIR/equipgrid-station"
npm install
npm run build

echo "2. Embedding static assets into equipgrid-power..."
STATIC_TARGET="$ROOT_DIR/equipgrid-power/src/main/resources/static"
rm -rf "$STATIC_TARGET"
mkdir -p "$STATIC_TARGET"
cp -r "$ROOT_DIR/equipgrid-station/dist/"* "$STATIC_TARGET/"

echo "3. Building Spring Boot Executable JAR (power + station)..."
cd "$ROOT_DIR/equipgrid-power"
./gradlew bootJar -x test

echo "=========================================================="
echo "✅ Build Complete!"
echo "📦 Monolith JAR: equipgrid-power/build/libs/equipgrid-power-0.0.1-SNAPSHOT.jar"
echo "🚀 Run with: java -jar equipgrid-power/build/libs/equipgrid-power-0.0.1-SNAPSHOT.jar"
echo "=========================================================="
