# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant technical decisions.

## What is an ADR?

An ADR captures the context, decision, and consequences of an architecturally significant choice.

## Format

We use the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Naming Convention

- Filename: `NNN-kebab-case-title.md` (e.g., `001-use-localStorage-for-tracking.md`)
- NNN = zero-padded sequence number (001, 002, 003...)
- Title in heading must match: `# NNN. Title` (e.g., `# 001. Use localStorage for Tracking`)

## Index

- [001. Use Attio Attribute Slugs for API Queries](001-use-attio-attribute-slugs.md)
- [002. Flexible URL Matching with Contains](002-flexible-url-matching.md)
- [003. Two-Step Upsert Pattern for Person Records](003-two-step-upsert-pattern.md)
