#!/usr/bin/env bash
# ==============================================================================
# 🚜 EquipGrid Monolith Deployment Script (deploy.sh)
# Automates Git pull, container rebuilds, zero-downtime restarts, and pruning.
# ==============================================================================

set -e

COMPOSE_FILE="docker-compose.prod.yml"

print_header() {
    echo ""
    echo "=================================================================="
    echo "🚜  EquipGrid Monolith Deployment: $1"
    echo "=================================================================="
}

git_pull_updates() {
    echo "📥 Pulling latest commits from git..."
    if [ -d ".git" ]; then
        git pull --ff-only || {
            echo "⚠️  Git pull returned non-zero or branch had diverged. Continuing with current source..."
        }
    else
        echo "ℹ️  Not a git working copy or skipping git pull."
    fi
}

prune_images() {
    echo "🧹 Pruning unused dangling Docker images..."
    docker image prune -f >/dev/null 2>&1 || true
}

show_status() {
    print_header "Container Status"
    docker compose -f "$COMPOSE_FILE" ps
}

show_logs() {
    print_header "Live Streaming Logs (Ctrl+C to exit)"
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
}

deploy_frontend() {
    print_header "Deploying Frontend (station-frontend)"
    git_pull_updates
    echo "🔨 Building station-frontend container..."
    docker compose -f "$COMPOSE_FILE" build station-frontend
    echo "🚀 Restarting station-frontend..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps station-frontend
    prune_images
    echo "✅ Frontend successfully deployed!"
    show_status
}

deploy_backend() {
    print_header "Deploying Backend (power-backend)"
    git_pull_updates
    echo "🔨 Building power-backend container..."
    docker compose -f "$COMPOSE_FILE" build power-backend
    echo "🚀 Restarting power-backend..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps power-backend
    prune_images
    echo "✅ Backend successfully deployed!"
    show_status
}

deploy_all() {
    print_header "Deploying Full Monolith (Database + Backend + Frontend)"
    git_pull_updates
    echo "🔨 Building all containers..."
    docker compose -f "$COMPOSE_FILE" build
    echo "🚀 Launching all containers..."
    docker compose -f "$COMPOSE_FILE" up -d
    prune_images
    echo "✅ Full Monolith successfully deployed!"
    show_status
}

# --- CLI Command Router ---
TARGET="${1:-all}"

case "$TARGET" in
    frontend|fe|station)
        deploy_frontend
        ;;
    backend|be|power)
        deploy_backend
        ;;
    all|monolith)
        deploy_all
        ;;
    status|ps)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "❌ Unknown command: '$TARGET'"
        echo ""
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Available commands:"
        echo "  ./deploy.sh frontend  (or fe, station) -> Rebuild and redeploy only Station UI"
        echo "  ./deploy.sh backend   (or be, power)   -> Rebuild and redeploy only Power REST API"
        echo "  ./deploy.sh all       (or monolith)    -> Rebuild and redeploy full stack"
        echo "  ./deploy.sh status    (or ps)          -> View status of all running containers"
        echo "  ./deploy.sh logs                       -> Follow live container logs"
        exit 1
        ;;
esac
