# ADR-060: Allow Owned Legacy Receipt File Access

## Status
Accepted

## Context
ADR-052 made the `receipts` storage bucket private and required new uploads to use a user-scoped path shape, `<user_id>/<folder>/<filename>`. This correctly prevents users from accessing files outside their own storage prefix.

Production data still contains receipt rows whose `file_path` values predate that convention, such as `bni/...` or `budiman-swalayan/...`. The storage objects still exist and the receipt rows are owned by the authenticated user, but the storage SELECT policy rejects signed URL creation because the object name does not start with the user's UUID. The frontend then receives `Failed to get file access`.

## Decision
Keep the strict user-scoped path requirement for new receipt uploads, updates, and deletes. Extend only the receipt storage SELECT policy so authenticated users can read receipt storage objects when either:

1. The object path starts with their user ID folder, or
2. The object name is referenced by a `public.receipts.file_path` row owned by the authenticated user.

## Alternatives Considered
- Move existing storage objects into user-scoped folders. Rejected for this fix because moving storage objects safely requires a storage API/service-role workflow and risks breaking existing references if partially completed.
- Use a service-role client for signed URL generation. Rejected because it bypasses storage RLS in application code and would weaken the defense-in-depth model from ADR-052.
- Leave legacy receipt files inaccessible. Rejected because the database still contains valid owned receipt references and the user needs to view those files.

## Consequences
- Positive: Existing owned receipt files become accessible again without broad public access.
- Positive: New uploads remain constrained to the user-scoped path convention.
- Positive: The policy remains user-scoped through the owning `receipts.user_id`.
- Trade-off: The storage SELECT policy now depends on the `public.receipts` table for legacy paths.
- Risk: If a receipt row points to an unintended object name, the owner of that row can read that object. This is bounded by receipt row ownership and the `receipts` bucket.

## Related Notes
- Migration: `supabase/migrations/20260722090000_allow_owned_legacy_receipt_file_access.sql`
- Prior decision: `docs/decisions/052-production-rls-implementation.md`
