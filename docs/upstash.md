# Upstash operations

Speye uses a dedicated user-owned Upstash Redis database on the **Free**
plan in AWS Ireland (`eu-west-1`), alongside the hosted Supabase region.
No payment details, paid regions, paid ACLs, or paid add-ons are required.
Supabase remains the source of truth. A cache failure must not lose an
attempt, block a reading session, change matchmaking, or prevent rankings
from loading through the database fallback.

## Configuration and credential boundaries

| Surface | Variables | Access |
| --- | --- | --- |
| Supabase Edge secrets | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Private standard token; server reads and writes |
| Pages production and preview | `VITE_UPSTASH_REDIS_REST_URL`, `VITE_UPSTASH_REDIS_REST_READ_TOKEN` | Public read-only token; public text rankings only |
| Root ignored `.env` | The same two `VITE_UPSTASH_*` variables | Local development uses the current database |

Use distinct standard and read-only tokens. Never put the standard token
in a `VITE_` variable, repository file, screenshot, or browser response.
Changing a Pages environment variable requires a new build; old immutable
deployments keep their original public configuration. Supabase secrets
apply to the hosted functions without putting those values in their source.
There is no application caller for the former TCP `REDIS_URL` variable.

The public read-only token can read the database's other keys. A key prefix
alone is not authorization. Authenticated PvP cache values are therefore
encrypted on the server before storage, as described below. Do not add
private data to plaintext keys in this database.

## Cache responsibilities

### Public reading-performance rankings

`backend/redis/getTextLeaderboard.ts` reads the best five entries and an
optional current-reader entry using read-only Redis pipelines. It validates
payloads, numeric boundaries, and score/stat agreement. A missing, malformed,
timed-out, or unavailable cache falls back to the hosted
`get_text_leaderboard` RPC. Reads have a three-second timeout.

The authenticated `leaderboard` Edge Function validates the caller, permits
only that caller's update, and checks that the text is completed and public
before reading saved attempts with the service role. Stable paged queries
avoid the PostgREST row cap. The writer atomically publishes rankings and
matching statistics, and an older request cannot replace a higher best
score. A healthy empty cache can be warmed after a successful database read
for a signed-in reader; concurrent warms from the same client are deduplicated.
Cache errors do not trigger additional warm attempts.

Each board generation has a fixed **five-minute** lifetime. Every member's
statistics expire with that board, and normal updates do not extend its
lifetime. This prevents inactive members from outliving their statistics
and bounds stale usernames, removed results, and moderation changes. Saved
results remain authoritative, and the next cold fill reconstructs the board.
Tied rounded scores retain a valid cached attempt until the next rebuild
when their WPM/quiz percentages differ; rebuilds use the canonical earliest
attempt ordering. Cache reads are eventually consistent within this window.
Only intentionally public leaderboard fields are stored, without private
attempt timestamps or activity IDs.

### Authenticated PvP top five

`pvp-leaderboard` authenticates the caller before touching Redis. It caches
only the shared five rating rows for **30 seconds**, using the caller's
Supabase token for database reads so the existing RLS rules still apply.
The cache excludes queue state, active games, histories, and private profiles.

The existing browser read-only token must not bypass authenticated-only
PvP reads. Cached values use AES-GCM with a fresh nonce and cache-key-bound
additional authenticated data. The encryption key is derived on the server
from the private standard Redis token with a PvP-specific context. A token
rotation or invalid ciphertext becomes a cache miss. Ciphertext and secret
metadata are never returned to clients.

The current player's rating and rank remain database reads. If that player
appears in the cached top five or their live rank has entered it, the client
reloads the canonical top five. Shared opponents can be up to 30 seconds
old. Cache or Edge failures retain the direct database query.

### Existing stores retained across the stack

Private libraries, activity, reading positions, notifications, and queued
writes use their account-scoped Supabase and IndexedDB paths. Text content
and quiz payloads already use network-first IndexedDB caching and prefetch.
Supabase handles transactional matchmaking, authenticated realtime, and
persistent processing queues. Workbox handles assets and the offline app
shell. These flows do not benefit from another public cache, and Redis is
not required for their correctness.

## Free-plan operation

Keep the database on Free, without entering payment details or selecting a
paid plan. The verified account limits are 500,000 monthly commands, 250 MB
storage, and 10 GB monthly bandwidth. Pipelines reduce HTTP round trips;
their individual Redis commands still consume the allowance. Check the
console's usage and current provider limits before capacity planning.
Eviction is enabled because all cache data can be reconstructed.

Free databases can be archived after at least 30 days of inactivity. If
that happens, restore the database in Upstash and verify connectivity. The
application must continue using its Supabase fallback while Redis is
unavailable. There is no artificial keepalive, paid failover, or automatic
upgrade configured by the application.

Provider references: [pricing](https://upstash.com/pricing/redis),
[inactivity FAQ](https://upstash.com/docs/redis/help/faq),
[REST token permissions](https://upstash.com/docs/redis/features/restapi),
and [ACL availability](https://upstash.com/docs/redis/features/security).

## Migration and release verification

1. Create the dedicated Free database in the appropriate region. Verify the
   plan, region, cost, and absence of paid add-ons before using it.
2. Update hosted Supabase secrets, both Pages environments, and the ignored
   local environment. Compare secret digests and preserve unrelated settings.
3. Verify TLS, a real read/write, read-only write denial, authenticated cold
   and warm paths, anonymous and cross-user denial, and private-text exclusion.
4. Run the unit, Edge type, lint, format, security, build, and browser gates.
   Exercise Redis failure against the real database fallback.
5. Deploy reviewed Edge sources manually, then release the reviewed frontend.
   Compare the served assets and deployed function source with the reviewed
   revisions. Check the actual production host and installed-PWA transition.
6. Delete only synthetic users, sessions, activity, and cache keys created
   for verification. Check for residue, remove temporary credential files,
   and clean task branches, previews, worktrees, and local listeners.

The migration needs no export of the former Redis database because saved
attempts and ratings remain in Supabase. Historical assets and reports may
retain old public endpoint references; active bindings and current builds
must use the user-owned database.
