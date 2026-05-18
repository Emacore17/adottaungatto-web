# Moderation Reporting Design

## Goal

Improve moderation so operators can understand and resolve assignment conflicts, inspect audit activity with pagination, and let authenticated users report problematic published listings without creating spam-heavy queues.

## Decisions

- A case assigned to another moderator remains protected for regular moderators.
- Admin users may override an existing assignment when making a decision. The override is recorded in moderation action metadata.
- Moderation queues and activity views show both the case UUID and listing UUID.
- Recent moderation activity gets a dedicated paginated table at `/moderation/activity`.
- Listing reporting is exposed from the public listing detail page for authenticated users. Anonymous users are sent to login and listing owners cannot report their own listing.
- Report submission uses existing duplicate protection and adds request rate limiting by IP, reporter, and listing.

## Error Handling

- Assignment conflicts surface as an explicit `assigned_elsewhere` decision error in the web UI.
- Empty or stale batch decisions show a useful message instead of only `no_cases_updated`.
- Report actions distinguish invalid input, unauthenticated user, unavailable listing, duplicate report, rate limit, and generic failures.

## Testing

- API moderation service tests cover admin override metadata and moderator conflict.
- Moderation controller tests cover passing admin override capability from roles.
- Report controller/rate limit tests cover the new anti-spam rules.
- Web tests cover server-action redirect behavior where practical; typecheck and build cover route integration.
