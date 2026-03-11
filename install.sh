#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# opentranscribe — One-Command Installer
# OpenTranscribe
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/jasperan/opentranscribe/main/install.sh | bash
#
# Override install location:
#   PROJECT_DIR=/opt/myapp curl -fsSL ... | bash
# ============================================================

REPO_URL="https://github.com/jasperan/opentranscribe.git"
PROJECT="opentranscribe"
BRANCH="main"
INSTALL_DIR="${PROJECT_DIR:-$(pwd)/$PROJECT}"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}→${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}!${NC} $1"; }
fail()    { echo -e "${RED}✗ $1${NC}"; exit 1; }
command_exists() { command -v "$1" &>/dev/null; }

print_banner() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  opentranscribe${NC}"
    echo -e "  OpenTranscribe"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

clone_repo() {
    if [ -d "$INSTALL_DIR" ]; then
        warn "Directory $INSTALL_DIR already exists"
        info "Pulling latest changes..."
        (cd "$INSTALL_DIR" && git pull origin "$BRANCH" 2>/dev/null) || true
    else
        info "Cloning repository..."
        git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR" || fail "Clone failed. Check your internet connection."
    fi
    success "Repository ready at $INSTALL_DIR"
}

check_prereqs() {
    info "Checking prerequisites..."
    command_exists git || fail "Git is required — https://git-scm.com/"
    success "Git $(git --version | cut -d' ' -f3)"

    command_exists node || fail "Node.js is required — https://nodejs.org/"
    success "Node $(node --version)"

    if command_exists pnpm; then
        PKG_MGR="pnpm"
    elif command_exists yarn; then
        PKG_MGR="yarn"
    elif command_exists npm; then
        PKG_MGR="npm"
    else
        fail "npm, yarn, or pnpm is required"
    fi
    success "Package manager: $PKG_MGR"

    PYTHON=""
    for cmd in python3 python; do
        if command_exists "$cmd"; then
            PYTHON="$cmd"
            break
        fi
    done
    [ -n "$PYTHON" ] || fail "Python 3 is required — https://www.python.org/downloads/"
    success "Python $($PYTHON --version | cut -d' ' -f2)"
}

install_deps() {
    cd "$INSTALL_DIR"

    info "Installing Node.js dependencies..."
    $PKG_MGR install
    success "Node.js dependencies installed"

    if [ -f requirements.txt ] || [ -f pyproject.toml ]; then
        info "Setting up Python environment..."
        $PYTHON -m venv .venv
        source .venv/bin/activate
        pip install --upgrade pip -q 2>/dev/null
        if [ -f pyproject.toml ]; then
            pip install -e . -q 2>/dev/null || pip install -r requirements.txt -q 2>/dev/null || true
        elif [ -f requirements.txt ]; then
            pip install -r requirements.txt -q
        fi
        success "Python dependencies installed"
    fi
}

main() {
    print_banner
    check_prereqs
    clone_repo
    install_deps
    print_done
}

print_done() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}Installation complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BOLD}Location:${NC}  $INSTALL_DIR"
    echo -e "  ${BOLD}Start:${NC}    cd $INSTALL_DIR && $PKG_MGR start"
    echo ""
}

main "$@"
