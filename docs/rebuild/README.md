# Vault Rebuild Planning

This folder is the production-grade rebuild plan for Vault.

The existing app is treated as a research prototype: it proved the core product thesis, explored many feature areas, and surfaced important data-model lessons. The rebuild should preserve those lessons while resetting the execution standard around product scope, data architecture, security, testability, release discipline, and user experience.

## Documents

- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — product vision, target users, release scope, milestones, and feature sequencing.
- [MONARCH_PARITY.md](./MONARCH_PARITY.md) — long-term Monarch Money replacement scope, parity capability map, and phased parity roadmap.
- [V1_PRD.md](./V1_PRD.md) — concrete first-release product requirements, user journey, functional scope, and open decisions.
- [V1_DATA_MODEL.md](./V1_DATA_MODEL.md) — first-release relational model, ledger ownership boundary, constraints, indexes, and backup shape.
- [V1_BUILD_PLAN.md](./V1_BUILD_PLAN.md) — implementation milestones, CI gates, QA flow, and private beta hardening plan.
- [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) — accepted ADRs and open naming decisions for the production rebuild.
- [../BACKUP_PACKAGE.md](../BACKUP_PACKAGE.md) — V1 backup export shape, manifest contract, privacy notes, and restore status.
- [UX_UI_PRINCIPLES.md](./UX_UI_PRINCIPLES.md) — information architecture, screen-level UX direction, interaction standards, and visual design rules.
- [DESIGN_FOUNDATION.md](./DESIGN_FOUNDATION.md) — concrete visual direction, layout rules, typography, color, component standards, and redesign roadmap.
- [FIDELITY_REFERENCE_ANALYSIS.md](./FIDELITY_REFERENCE_ANALYSIS.md) — Fidelity-inspired dark institutional design analysis translated into reusable Praxis Ledger tokens, layout rules, and component patterns.
- [ARCHITECTURE_ENGINEERING.md](./ARCHITECTURE_ENGINEERING.md) — system architecture, database principles, coding standards, testing, deployment, and operations.
- [SECURITY_PRIVACY.md](./SECURITY_PRIVACY.md) — security posture, multi-user access control, secrets, AI usage, file handling, and release gates.
- [AGENTIC_WORKFLOW.md](./AGENTIC_WORKFLOW.md) — AI-assisted development process, planning gates, prompt discipline, review loops, and progress ledger.

## Rebuild Thesis

Vault should become a personal finance operating system: ledger-first, statement-aware, reporting-rich, private by default, and robust enough for future multi-user households without losing the depth that made the prototype valuable.

The first production release should not attempt to recreate every prototype feature. It should ship a narrow, durable foundation:

1. Secure identity and personal ledgers.
2. Reliable transaction ledger.
3. Imports with provenance.
4. Review and categorization workflows.
5. Cashflow and net-worth reporting.
6. Export, backup, and auditability.

Everything else should build on that foundation.
