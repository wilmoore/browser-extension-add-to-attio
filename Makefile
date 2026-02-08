# Chrome Web Store Publishing Makefile
# Usage: make <target>
# See 'make help' for available targets

# Load environment variables from .env if it exists
ifneq (,$(wildcard .env))
	include .env
	export
endif

# Validation
.PHONY: check-env
check-env:
ifndef EXTENSION_ID
	$(error EXTENSION_ID is not set. Copy .env.example to .env and configure credentials)
endif
ifndef CLIENT_ID
	$(error CLIENT_ID is not set. See docs/PUBLISHING.md for setup instructions)
endif
ifndef CLIENT_SECRET
	$(error CLIENT_SECRET is not set. See docs/PUBLISHING.md for setup instructions)
endif
ifndef REFRESH_TOKEN
	$(error REFRESH_TOKEN is not set. Run 'make cws-init' to generate one)
endif

# Build targets
.PHONY: build
build: ## Build the extension
	npm run build

.PHONY: package
package: build ## Build and create dist.zip
	cd dist && zip -r ../dist.zip . && cd ..
	@echo "Created dist.zip ($$(du -h dist.zip | cut -f1))"

# Chrome Web Store targets
.PHONY: cws-init
cws-init: ## Initialize Chrome Web Store credentials (interactive)
	npx chrome-webstore-upload-cli init

.PHONY: cws-upload
cws-upload: check-env package ## Upload extension to Chrome Web Store (draft)
	npx chrome-webstore-upload upload \
		--source dist.zip \
		--extension-id $(EXTENSION_ID) \
		--client-id $(CLIENT_ID) \
		--client-secret $(CLIENT_SECRET) \
		--refresh-token $(REFRESH_TOKEN)

.PHONY: cws-publish
cws-publish: check-env ## Publish the uploaded draft to Chrome Web Store
	npx chrome-webstore-upload publish \
		--extension-id $(EXTENSION_ID) \
		--client-id $(CLIENT_ID) \
		--client-secret $(CLIENT_SECRET) \
		--refresh-token $(REFRESH_TOKEN)

.PHONY: cws-deploy
cws-deploy: cws-upload cws-publish ## Upload and publish in one step
	@echo "Extension deployed successfully!"

.PHONY: cws-status
cws-status: check-env ## Check Chrome Web Store extension status
	@ACCESS_TOKEN=$$(curl -s -X POST https://oauth2.googleapis.com/token \
		-d "client_id=$(CLIENT_ID)" \
		-d "client_secret=$(CLIENT_SECRET)" \
		-d "refresh_token=$(REFRESH_TOKEN)" \
		-d "grant_type=refresh_token" | jq -r '.access_token') && \
	echo "=== Extension Status ===" && \
	curl -s -H "Authorization: Bearer $$ACCESS_TOKEN" \
		"https://www.googleapis.com/chromewebstore/v1.1/items/$(EXTENSION_ID)?projection=DRAFT" | \
		jq -r '"ID:           \(.id)\nPublished:    \(.crxVersion)\nDraft State:  \(.uploadState)\nErrors:       \(.itemError // "none")"'

# Browser open command (auto-detect OS)
# Note: WSL uses 'start ""' with empty title because start treats first quoted arg as window title
OPEN_CMD := $(shell \
	if [ "$$(uname)" = "Darwin" ]; then echo "open"; \
	elif [ -n "$$WSL_DISTRO_NAME" ]; then echo 'cmd.exe /c start ""'; \
	else echo "xdg-open"; fi)

.PHONY: cws-console
cws-console: ## Open Chrome Web Store developer console
ifdef PUBLISHER_ID
	$(OPEN_CMD) "https://chrome.google.com/u/0/webstore/devconsole/$(PUBLISHER_ID)"
else
	$(OPEN_CMD) "https://chrome.google.com/u/0/webstore/devconsole"
endif

.PHONY: cws-edit
cws-edit: ## Open extension edit page in developer console
ifndef PUBLISHER_ID
	$(error PUBLISHER_ID is not set. Set it in .env to open the edit page)
endif
ifndef EXTENSION_ID
	$(error EXTENSION_ID is not set. Set it in .env to open the edit page)
endif
	$(OPEN_CMD) "https://chrome.google.com/u/0/webstore/devconsole/$(PUBLISHER_ID)/$(EXTENSION_ID)/edit"

.PHONY: cws-listing
cws-listing: ## Open public Chrome Web Store listing
ifndef EXTENSION_ID
	$(error EXTENSION_ID is not set. Set it in .env to open the listing)
endif
	$(OPEN_CMD) "https://chromewebstore.google.com/detail/$(EXTENSION_ID)"

.PHONY: privacy
privacy: ## Open hosted privacy policy page
	$(OPEN_CMD) "https://wilmoore.github.io/add-to-attio/privacy.html"

.PHONY: sync-version
sync-version: ## Sync manifest.json version from package.json
	npm run sync-version

# Automated release (bump, commit, tag, push, opens Actions)
.PHONY: release-patch
release-patch: ## Release patch version (1.0.x)
	bash scripts/release.sh patch

.PHONY: release-minor
release-minor: ## Release minor version (1.x.0)
	bash scripts/release.sh minor

.PHONY: release-major
release-major: ## Release major version (x.0.0)
	bash scripts/release.sh major

# Convenience aliases
.PHONY: release
release: release-patch ## Release patch version (default)

.PHONY: release-local
release-local: cws-deploy ## Manual local release (requires .env)

.PHONY: upload
upload: cws-upload ## Alias for cws-upload

.PHONY: publish
publish: cws-publish ## Alias for cws-publish

.PHONY: status
status: cws-status ## Alias for cws-status

.PHONY: console
console: cws-console ## Alias for cws-console

.PHONY: edit
edit: cws-edit ## Alias for cws-edit

.PHONY: listing
listing: cws-listing ## Alias for cws-listing

# Development targets
.PHONY: dev
dev: ## Start development server
	npm run dev

.PHONY: test
test: ## Run unit tests
	npm run test:run

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	npm run test:e2e

.PHONY: lint
lint: ## Run linter (placeholder)
	@echo "No linter configured yet"

# Utility targets
.PHONY: clean
clean: ## Clean build artifacts
	rm -rf dist dist.zip

.PHONY: version
version: ## Show current version
	@node -p "require('./package.json').version"

.PHONY: manifest
manifest: ## Print extension manifest (pipe to pbcopy to copy)
	@cat public/manifest.json

.PHONY: bump-patch
bump-patch: ## Bump patch version (1.0.x)
	npm version patch --no-git-tag-version
	@echo "Version bumped to $$(make version)"

.PHONY: bump-minor
bump-minor: ## Bump minor version (1.x.0)
	npm version minor --no-git-tag-version
	@echo "Version bumped to $$(make version)"

.PHONY: bump-major
bump-major: ## Bump major version (x.0.0)
	npm version major --no-git-tag-version
	@echo "Version bumped to $$(make version)"

# Help target
.PHONY: help
help: ## Show this help message
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# Default target
.DEFAULT_GOAL := help
