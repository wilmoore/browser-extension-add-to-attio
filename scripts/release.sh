#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the release type (patch, minor, major) - default to patch
RELEASE_TYPE="${1:-patch}"

if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}Error: Invalid release type '$RELEASE_TYPE'${NC}"
  echo "Usage: npm run release [patch|minor|major]"
  exit 1
fi

echo -e "${BLUE}Starting $RELEASE_TYPE release...${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${RED}Error: You have uncommitted changes.${NC}"
  echo "Please commit or stash them before releasing."
  git status --short
  exit 1
fi

# Check we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo -e "${YELLOW}Warning: You're on branch '$CURRENT_BRANCH', not 'main'.${NC}"
  read -p "Continue anyway? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}v$CURRENT_VERSION${NC}"

# Bump version
echo -e "${BLUE}Bumping $RELEASE_TYPE version...${NC}"
npm version "$RELEASE_TYPE" --no-git-tag-version > /dev/null

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "New version: ${GREEN}v$NEW_VERSION${NC}"

# Sync manifest.json
echo -e "${BLUE}Syncing manifest.json...${NC}"
npm run sync-version --silent

# Run tests
echo -e "${BLUE}Running tests...${NC}"
npm run test:run --silent

# Build to verify
echo -e "${BLUE}Building extension...${NC}"
npm run build --silent

# Commit
echo -e "${BLUE}Committing version bump...${NC}"
git add package.json package-lock.json public/manifest.json
git commit -m "chore: release v$NEW_VERSION"

# Create tag
echo -e "${BLUE}Creating tag v$NEW_VERSION...${NC}"
git tag "v$NEW_VERSION"

# Push
echo -e "${BLUE}Pushing to origin...${NC}"
git push origin "$CURRENT_BRANCH" --tags

# Get repo info for the Actions URL
REPO_URL=$(git remote get-url origin | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//')
ACTIONS_URL="$REPO_URL/actions"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release v$NEW_VERSION triggered!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Watch the release progress:"
echo -e "${BLUE}$ACTIONS_URL${NC}"
echo ""
echo -e "Once complete, view the listing:"
echo -e "${BLUE}https://chromewebstore.google.com/detail/$(grep EXTENSION_ID .env 2>/dev/null | cut -d= -f2 || echo 'YOUR_EXTENSION_ID')${NC}"
echo ""

# Open Actions page in browser
if command -v open &> /dev/null; then
  open "$ACTIONS_URL"
elif command -v xdg-open &> /dev/null; then
  xdg-open "$ACTIONS_URL"
fi
