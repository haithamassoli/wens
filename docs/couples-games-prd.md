# Wens — Product Requirements Document

**Product:** Couples games and activities website  
**Version:** 1.0, English Markdown edition  
**Date:** September 5, 2026  
**Status:** Initial proposal; ready for refinement and implementation planning  
**Companion document:** [Couples Games and Activities Ideas](couples-games-ideas.md)

Wens is a proposed working name, not a commercially verified brand. Names, estimates, and targets in this document are planning assumptions. Requirements marked MVP define the proposed initial development scope.

This English edition preserves the original proposal: an **Arabic-first, mobile-first website**. Translating the documentation does not change the product's launch language. English examples below translate intended interface copy and content for the reader; production MVP content remains Arabic.

## 1. Executive overview

Wens helps two adult spouses begin an enjoyable shared activity in less than a minute. This document specifies the first release and the foundation for remote play, memories, and additional activities. Idea identifiers G01–G36 match the companion guide.

The implementation team should deliver a working mobile website, six complete games, a reviewed initial content bank, tests for rules and edge cases, and a documented content-update process.

### Release strategy

| Release | Scope                                                                          |
| ------- | ------------------------------------------------------------------------------ |
| MVP     | One shared device, no accounts, no server storing player session data.         |
| R1      | More local games and activities.                                               |
| R2      | Private rooms and two-device play.                                             |
| R3      | Private shared space, persistent accounts where needed, and specialized packs. |

**Readers:** Product owner, designer, frontend and backend developers, content editor, and quality reviewer.

Deliver independently usable stages. Do not display future features as apparently functional controls. Put new requests into a later backlog before estimating their impact.

## 2. Problem, value, and scope

### Problem

Searching for something to do together can take longer than the activity itself. Repetitive questions and long registration flows reduce the chance that a couple starts playing.

### Value proposition

- Fast selection by time and mood.
- Short games written in natural Arabic.
- Light results that do not evaluate the relationship.
- One device is sufficient initially.

### MVP goals

Start without registration, provide meaningfully different game rules, support enjoyable 5–15 minute sessions, and make skipping, leaving, and saving favorites clear.

### Included

| ID  | Game                     |
| --- | ------------------------ |
| G01 | Conversation Starters    |
| G02 | Would You Rather?        |
| G03 | Which One of Us?         |
| G04 | How Well Do You Know Me? |
| G09 | One-Minute Challenges    |
| G25 | What Shall We Do? Wheel  |

Included screens: home, catalog, game details, setup, active session, results, favorites, settings, and privacy information.

### Excluded from MVP

Accounts, rooms, photos, letters, payments, notifications, AI, chat, video, app-store applications, a web administration panel, and guaranteed offline operation. Manage MVP content through reviewed files and a new deployment.

### Definition of success

All six games work from start to result without incorrect turns, scoring errors, or premature visible answer disclosure. A new user can understand each game from one instruction screen.

A feature outside scope does not enter the release merely because it appears easy. Assess its content, privacy, and maintenance impact first. Usage targets later in this document are test hypotheses, not guaranteed outcomes.

## 3. Users, journeys, and user stories

### Primary journeys

1. **At home with ten minutes and one phone:** Home → 10 minutes → game card → Start → instructions → round → result.
2. **Quiet play without tools:** Catalog → No Movement + No Tools → a matching game such as G01 or G02 → session. Random selection must not insert a movement challenge.
3. **Apart, in R2:** One person creates a room and shares the link themselves. The other requests admission. The host accepts, both mark themselves ready, and the host starts.

### User stories

| ID    | Need                                                             | Acceptance criteria                                                                                                                                                   |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-01 | As a visitor, I want to play without an account.                 | After choosing a game, starting a round takes at most three screen transitions. Names are optional and default to Player 1 and Player 2.                              |
| US-02 | As a player, I want to choose before seeing my partner's answer. | Hide the first answer behind a handoff screen. Reveal only after the second player locks an answer. Back navigation cannot return revealed answers to an input stage. |
| US-03 | I want to skip without explaining why.                           | Skip is always available, carries no penalty, and discards any answer entered in the skipped round.                                                                   |
| US-04 | I want to return to a game or card I liked.                      | Favorite IDs survive refresh on this device. Explain that they belong to this browser and are not backed up.                                                          |
| US-05 | I want a clear exit.                                             | Leaving asks “End this session?” and explains that temporary answers will be cleared. Results offer Replay and Home.                                                  |

## 4. Screens and information architecture

### S01 — Home: `/`

Heading meaning “What would you like to do today?”; Surprise Me; mood choices Talk, Laugh, Challenge, and Choose an Activity; duration choices. Show only the six published MVP games.

### S02 — Catalog: `/games`

Each card shows a name, one-line description, duration, device count, and activity type. Filter by category, duration, No Tools, and No Movement. Include Clear Filters and a helpful no-results state.

### S03 — Game details: `/games/:slug`

Explain why to play, instructions in three short steps, duration, number of rounds, depth, and tools. Include Start and Favorite. Keep implementation details out of user-facing text.

### S04 — Session setup

Two optional aliases of up to 20 characters each; short sessions of 5 rounds or standard sessions of 10 where supported; game-specific filters. G04 is fixed at 10 rounds in MVP to give each player five opportunities. G09 uses five cards. G25 selects one activity.

### S05 — Active session: `/play/:gameId`

Display the game name, progress, current player, card and options, Next or Lock Answer, Skip, Pause when applicable, and Exit. Handoff and reveal are phases inside this screen.

### S06 — Results

Use the correct summary for the game: conversation rounds, matches, prediction points, completed challenges, or selected activity. Offer replay with fresh cards. Never show a “love percentage” or relationship assessment.

### S07 — Favorites: `/favorites`

Separate game and card tabs. Users can remove items or open the associated game. Explain how to add favorites in the empty state. Remove withdrawn content from the visible list with a generic notice.

### S08 — Settings and information

Sound off by default; reduced motion; local-storage controls and clearing; privacy page; general feedback without requesting private details. Do not automatically transmit answers through a feedback form.

## 5. Shared session engine

### FR-CORE-01 — State model

The general progression is:

`setup → instructions → awaiting_ready → player_A_input → handoff → player_B_input → reveal → next_round → results`

Card-only games bypass unnecessary answer and reveal phases. The game definition decides which phases are valid.

### FR-CORE-02 — Round identity and atomic transitions

Give each session a random identifier and each round a fixed index. Treat each accepted transition as one operation. Rapid or double presses cannot repeat a turn or add points. Derive results from the completed-round record.

### FR-CORE-03 — Card selection

Filter matching published content first, then shuffle without replacement. If fewer cards are available than requested, show the actual count before starting. When a bank is exhausted, offer an explicit reshuffle rather than silently repeating it.

### FR-CORE-04 — Skipping

Skipping cancels the current round, deletes its inputs, consumes its slot, and advances the turn according to game rules. A skipped round contributes neither points nor a match-rate denominator. Show completed and skipped counts separately.

### FR-CORE-05 — Local interruptions

Do not save answers in `localStorage` or the page URL. Hiding the page covers private content and pauses MVP timers. Reloading loses the session. Explain this briefly before play, and start fresh after refresh without claiming restoration.

### FR-CORE-06 — Ending and clearing

After confirmation, early exit summarizes completed rounds only. If none are complete, show “No rounds completed yet.” Clearing device data requires a separate confirmation and removes favorites, settings, and seen-card IDs.

### FR-CORE-07 — Seen-card history

Store card IDs only to reduce repetition across sessions: at most the latest 200 per game for 30 days. Let users disable and clear this history. Never attach choices or names.

### Privacy boundary

One-device barriers prevent accidental disclosure through the interface. They do not provide secrecy against someone inspecting device memory or developer tools. In R2, the server protects unrevealed answers by withholding them from the other client.

## 6. Detailed MVP game requirements

### FR-G01 — Conversation Starters

- Packs: Light, Memories, Dreams, and explicitly enabled Deeper.
- Launch bank: 120 cards, divided into 40 Light, 40 Memories, and 40 Dreams.
- Keep Deeper hidden until reviewed content is available.
- Answers are spoken; there are no answer fields.
- Next and Skip alternate the speaking turn.

**Acceptance:** A five-round session with sufficient content shows five distinct cards. Each accepted press advances once. Results show completed cards without a score.

### FR-G02 — Would You Rather?

- 80 cards, each with two options identified by stable IDs.
- Player A chooses and locks; display “Pass the device.”
- Player B selects “I'm ready,” chooses, and locks; reveal both choices.
- Choices may change before locking, never afterward.

**Acceptance:** Different IDs produce no match; identical IDs produce one match. Three matches from five completed rounds may display 60%, labeled as matching choices in this session. If zero rounds are complete, do not display a percentage.

### FR-G03 — Which One of Us?

- 60 cards.
- Options are `PLAYER_A`, `PLAYER_B`, and `BOTH`, tied to people rather than button positions.
- Show aliases or default names.
- Alternate which person submits first between rounds.

**Acceptance:** `BOTH` and `BOTH` produce one match. `BOTH` and `PLAYER_A` produce none. Do not award half-points for `BOTH`, or label the selected person better or worse.

**Shared G02/G03 results:** Show round count, matches, skipped rounds, and Replay. Do not retain the full answer sequence after leaving results, or add it to a shareable image.

**Critical checks:** Browser Back at handoff covers content or confirms ending; it never exposes Player A's input. An empty choice blocks locking with a clear message. Skipping after the first input deletes that input.

### FR-G04 — How Well Do You Know Me?

- 60 cards with four distinct options each.
- Exactly 10 rounds in MVP.
- Odd rounds: A supplies the reference answer, B predicts. Even rounds: reverse roles.
- Award one point to the predictor when option IDs match.
- No free text and no point for the player supplying the reference answer.

**Acceptance:** If A predicts correctly three times and B twice, show 3–2. Each receives five opportunities, including skipped slots. A tie does not trigger an automatic tiebreaker. Early exit says “Incomplete session” and declares no winner. Skipping awards nothing and consumes the turn.

### FR-G09 — One-Minute Challenges

- 50 cards: 20 verbal, 15 acting, and 15 light movement.
- Each card specifies 30 or 60 seconds plus tool and movement requirements.
- Provide No Tools and No Movement filters.
- A session has five cooperative cards.

**Acceptance:** Drawing a card does not start the timer; Ready does. Pause preserves remaining time. When time expires, show Done and Skip without automatic judging. Completing three of five cards gives three completed and two skipped, with no deduction. Hiding the tab pauses time.

### FR-G25 — What Shall We Do? Wheel

- 40 activities with duration limits, location, cost, and tools.
- MVP cost tiers: No Cost, Low Cost, Flexible. No live prices.
- Randomly choose one matching result first, then animate the wheel toward it. The selected result is authoritative before animation.

**Acceptance:** Indoors + No Cost excludes paid and outdoor activities. Show a sole match directly. With zero matches, suggest removing a filter and wait for the user's choice; never relax filters automatically.

**Another Option:** Exclude results already displayed until the matching pool is exhausted, then ask before resetting it. We Did It records completion for the session only. Favorite stores the activity ID. Reduced motion reveals instantly. Repeated presses during spinning cannot select additional results.

## 7. Content model and editorial workflow

### FR-CONTENT-01 — Launch production quota

| Game      | Required reviewed items |
| --------- | ----------------------: |
| G01       |                     120 |
| G02       |                      80 |
| G03       |                      60 |
| G04       |                      60 |
| G09       |                      50 |
| G25       |                      40 |
| **Total** |                 **410** |

These are required production quantities. Examples in the two documents are not a completed content bank.

### Common fields

| Field              | Requirement                                           |
| ------------------ | ----------------------------------------------------- |
| `id`               | Stable and unique; reject duplicate IDs during build. |
| `gameId`           | Owning game, such as `G02`.                           |
| `locale`           | `ar` for MVP production content.                      |
| `version`          | Content version.                                      |
| `status`           | `draft`, `review`, `published`, or `archived`.        |
| `category`         | Editorial category.                                   |
| `depth`            | `light` or `deep`.                                    |
| `body`             | User-facing text.                                     |
| `tags`             | Filter and discovery metadata.                        |
| `requiresMovement` | Movement requirement.                                 |
| `requiresTools`    | Tool requirement.                                     |
| `estimatedMinutes` | Expected duration.                                    |
| `reviewedAt`       | Review timestamp.                                     |

### Engine-specific fields

- **Choice:** `options[{id,label}]`.
- **Prediction:** The same options, without a fixed correct answer; the answering player supplies the reference.
- **Timer:** `durationSeconds`, steps, and an alternative.
- **Wheel:** `location`, `costTier`, `minMinutes`, `maxMinutes`, and `materials`.
- **Religious content later:** `sourceText`, `sourceUrl`, and `reviewerId`.

An illustrative record uses ID `G02-001`, game `G02`, locale `ar`, a prompt meaning “Which outing would you choose?”, option IDs `sea` and `mountains` with Arabic labels, light depth, published status, and version 1. This is a field illustration, not a complete publishable record. User choices never belong in the content file.

### FR-CONTENT-02 — Editorial policy

Use simple Arabic and neutral treatment of each spouse's role. Avoid blame, humiliation, coercion, password requests, and financial secrets. Romance is gentle and non-explicit. Do not rely on changing local facts without a maintenance process.

### FR-CONTENT-03 — Publishing

An author drafts, a second reviewer approves, a validator checks structure, and the item is tested in its game. Archived content cannot enter new sessions. Adding a pack must not require engine changes. Keep a change log per release.

### FR-CONTENT-04 — Sensitive and specialized content

No AI generation or stored answers in MVP. Religious R3 content requires sources and human review, and must not provide religious rulings or judgments about people.

**Content acceptance:** Automatically check every item for required fields, duplicate IDs, and option counts. Human-review every text before launch. Gameplay review includes at least one card from every category and every scoring branch.

## 8. User experience and nonfunctional requirements

| ID          | Requirement                                                                                                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-UX-01   | Arabic RTL at page level; logical navigation; LTR isolation for codes and links. Test widths of 360, 390, 768, and 1440 pixels. No horizontal scrolling in main content.                                                      |
| NFR-UX-02   | Target 16 px body text on phones, touch targets at least 44 × 44 px, 4.5:1 normal-text contrast, and visible focus. These are internal design and test targets, not a compliance certification.                               |
| NFR-UX-03   | Full keyboard operation, screen-reader labels, a non-repetitive round-result announcement, and no reliance on color alone. Future drawing interfaces need textual control alternatives; sortable cards need movement buttons. |
| NFR-UX-04   | Sound off by default, reduced-motion preference respected, persistent mute, and no unexpected vibration or audio. Pausing does not automatically cause a loss.                                                                |
| NFR-PERF-01 | On a midrange phone with simulated 4G, target primary content visible within 2.5 seconds and local game-button response within 100 ms. Target initial compressed JavaScript below 250 KB; load other games on demand.         |
| NFR-REL-01  | Test Safari on iPhone, Chrome on Android, and desktop Chrome/Firefox using versions available at delivery. Record actual devices; simulation alone is insufficient for touch acceptance.                                      |
| NFR-ERR-01  | Provide loading, content-load failure with retry, empty bank, unavailable local storage, missing game, and failed R2 room recovery states. No blank screen or silently lost lock action.                                      |

### Interface copy, translated for this document

- “Ready to start?”
- “Pass the device to your partner.”
- “It's okay to skip.”
- “No activity matches these choices. Try changing a filter.”
- “Timer paused.”
- “Round answers are temporary and are cleared when you leave.”

## 9. MVP data and storage

### DATA-01 — Temporary data

Keep `sessionId`, `gameId`, `roundIndex`, `phase`, `playerAliases`, `shuffledCardIds`, `currentInputs`, `completedRounds`, `scores`, and `timerState` in page memory only. Do not restore them after leaving or reloading.

### DATA-02 — Persistent local data

- `settings_v1`: Sound, motion, and preferences.
- `favorites_v1`: Game and card IDs.
- `seen_v1`: Seen card IDs and timestamps.

These records contain no names, answers, or personal scores.

### DATA-03 — Retention

Favorites and settings remain until cleared by the user or browser. Seen history expires after 30 days and is limited to 200 IDs per game. Do not claim cloud storage or backup.

### DATA-04 — Storage failure

If storage is full or blocked, games continue in memory. Favorite explains that saving is unavailable. Safely reset corrupt JSON for the affected key with a short notice, without breaking unrelated keys.

### DATA-05 — Schema changes

Include `schemaVersion` in each record. Use explicit, tested migration functions. Unmigratable seen history may be discarded. Never clear all site storage to repair one key.

### DATA-06 — Result models

| Game    | Result                                   |
| ------- | ---------------------------------------- |
| G01     | Completed card count.                    |
| G02/G03 | Matches and completed-round denominator. |
| G04     | Points per player.                       |
| G09     | Completed and skipped challenges.        |
| G25     | Selected activity and its status.        |

Recompute results from round events rather than relying on an incremented counter without a source record.

### DATA-07 — Privacy boundaries

Preferences on a shared device may be visible to anyone using that browser. Answer hiding is an interface behavior, not encryption between spouses. Do not put private data into links, analytics, or crash logs.

**Deletion acceptance:** Clear This Device's Data removes application favorites, seen history, and settings, then restores defaults. It does not affect other websites or remove published content.

## 10. Proposed architecture and developer handoff

### Suggested stack

React with TypeScript, JSON content validated at build time, RTL-capable CSS, and a static frontend served over HTTPS. MVP needs no session backend. This is an interchangeable engineering proposal, not a mandated framework or version.

### Component boundaries

`AppShell`, `GameCatalog`, `GameSetup`, `PlayerHandoff`, `CardView`, `ChoiceInput`, `RevealPanel`, `Timer`, `ResultSummary`, and `Favorites`.

Games share presentation and navigation while each `gameId` has explicit rules.

### Internal engine interface

A `GameDefinition` specifies setup, validation, deck construction, `initialState`, `reduce(state, event)`, and `deriveResult(state)`.

Events include `START`, `SUBMIT`, `READY`, `SKIP`, `NEXT`, `PAUSE`, `RESUME`, and `END`. Reject events invalid for the current phase.

Keep scoring and transition functions testable without the DOM. Compute remaining time from elapsed time, excluding local pauses and hidden-page time. Do not rely solely on decrementing a counter every second.

### R2 and R3 architecture

Add a server session service, PostgreSQL database, private real-time connections, and private file storage for R3 photos. Begin with one service and one database; multiple microservices are unnecessary before actual load justifies them.

Verify membership on every server read and write. Database row policies can support isolation. Never expose privileged service credentials to the browser. A room identifier in a URL is not authorization.

### Handoff deliverables

Organized source code; run and build instructions; an environment-variable template without secrets; content schema; instructions for adding a game; rules tests; known limitations; and a deployable build. Pin and document dependency versions when implementation begins.

### Technical references retained from the original document

[React documentation: Using TypeScript](https://react.dev/learn/typescript) supports typed React usage. [PostgreSQL documentation: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) explains row restrictions. The product architecture above is a design proposal, not a prescription from those sources.

## 11. R2 — Private rooms and two-device play

### FR-ROOM-01 — Entry

The host creates a private room and receives a random eight-character code and invitation link. The host shares the link themselves. A second player requests admission using a temporary alias; the host accepts. Limit rooms to two people, with no public room directory.

### FR-ROOM-02 — Identity

Issue each player a random server credential stored in an `HttpOnly`, `Secure` cookie with an appropriate `SameSite` policy. A room code permits an admission request only; it cannot restore an existing player's identity.

### FR-ROOM-03 — States

Room states: `waiting → ready → playing → paused → finished`, with `expired` available under expiry rules.

Round states: `awaiting_submissions → reveal_ready → revealed → next`.

The host starts play. The server enforces valid transitions.

### FR-ROOM-04 — Secret submissions

Send the question and options, not the partner's answer. A locked submission receives a server acknowledgment. The partner sees only that a choice was locked. Send both answers only when the reveal condition is satisfied.

### FR-ROOM-05 — Authority and duplicate handling

The server is the source of truth and maintains an increasing `revision`. Every action has a unique `actionId` and round identifier. Repeating an action returns its previous result. Reject stale actions and return current authorized state.

### FR-ROOM-06 — Disconnection

Use a heartbeat every 15 seconds. After 30 seconds without connectivity, confirm disconnection and pause the round. The same credential reconnecting within 120 seconds restores the identity and authorized state. After that, the remaining player may end the session. Do not replace a player during a session.

### FR-ROOM-07 — Expiry

A waiting room expires after 15 minutes without starting. An active room expires after 30 minutes without activity from either player, with a maximum total lifetime of two hours. Preserve timer pauses during reconnect; the server alone decides time in timed games.

**Room acceptance:** Network inspection reveals no partner answer before reveal. A third device is not admitted. Refresh does not create a new seat. Server failure displays failure and retry without fabricating results.

## 12. R2 — API and event contracts

**Base:** `/api/v1`. All timestamps use UTC and fields use stable IDs. Every private endpoint verifies credentials and membership. These are R2 contracts; do not build them in MVP.

| Endpoint                        | Request                                                      | Response and rules                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /rooms`                   | `gameId`, `settings`, `alias`                                | `roomId`, `joinCode`, `expiresAt`, `revision`; host credential in a cookie. Validate published game, settings, and creation limits.                              |
| `POST /rooms/:id/join-requests` | `joinCode`, `alias`                                          | `pendingRequestId` and waiting status only. After host approval, issue the second player's credential through a documented flow. Rejection reveals no room data. |
| `POST /rooms/:id/admissions`    | `requestId`, `decision`                                      | Host only. Atomic admission rejects a seat already taken; concurrent requests cannot create more than two members.                                               |
| `GET /rooms/:id/state`          | Authenticated request                                        | Player-specific snapshot: round, turn, timer, and submission-lock states; no unrevealed opponent input. Reconnection retrieves a full authorized snapshot.       |
| `POST /rooms/:id/actions`       | `actionId`, `expectedRevision`, `roundId`, `type`, `payload` | `accepted`, `revision`, `state`, or a defined error. Derive `playerId` from the credential, never from an untrusted client value.                                |

### Real-time events

`member_joined`, `ready_changed`, `round_started`, `submission_locked`, `round_revealed`, `paused`, `resumed`, and `finished`.

Each carries `eventId`, `revision`, and `serverTime`. Ignore duplicates; request state when a revision gap occurs.

### Error contract

| Status | Meaning                                   |
| ------ | ----------------------------------------- |
| 400    | Invalid input.                            |
| 401    | Missing or invalid credential.            |
| 403    | Not an authorized member.                 |
| 404    | Room unavailable or nonexistent.          |
| 409    | State conflict or full room.              |
| 410    | Expired room, after authorization checks. |
| 429    | Rate limit exceeded.                      |

Use simple user-facing messages without stack traces.

**Acceptance examples:** Repeating `actionId` leaves the result unchanged. A stale `expectedRevision` returns 409 with no partial write. Reject an unknown `optionId`. An outsider's action cannot read or modify room state.

## 13. R2–R3 — Data models and permissions

### R2 entities

```text
rooms(id, gameId, status, settings, revision, expiresAt)
room_members(id, roomId, role, credentialHash, alias, lastSeenAt)
rounds(id, roomId, index, phase, cardId)
submissions(roundId, memberId, payload, lockedAt)
actions(roomId, actionId, resultRevision)
```

Require uniqueness on `(roomId, actionId)`, `(roundId, memberId)`, and `(roomId, roundIndex)`. Enforce the two-member maximum in a server transaction. Define foreign keys. Never put raw credentials in reports or logs.

### R3 accounts and content

```text
users(id, verifiedEmail, timezone, createdAt)
couples(id, status)
couple_members(coupleId, userId, state, joinedAt)
memories(id, coupleId, authorId, title, date, city, visibility)
media(id, memoryId, ownerId, objectKey, mimeType, bytes)
wishes(..., status, revision)
tasks(..., status, revision)
letters(id, authorId, recipientId, coupleId, releaseAt, status, encryptedBody)
```

Use two separate accounts and an invitation explicitly accepted by the recipient, not one shared password. The list entities are conceptual here; required content fields are defined under EXT-LIST.

### Visibility rules

| Content state             | Authorized viewers                                                        |
| ------------------------- | ------------------------------------------------------------------------- |
| Draft or private          | Author only.                                                              |
| Shared                    | Both active members of the couple.                                        |
| Letter before `releaseAt` | Author only.                                                              |
| Letter after release      | Author and designated current recipient, provided the link remains valid. |

Content administrators have no permission to read couples' private text.

### Edit conflicts

Every shared item has a revision. A stale update returns a conflict and the newer version; never silently overwrite. Preserve independent additions. List ordering has its own change record.

### Deletion and unlinking

Either member can unlink immediately. Revoke invitations, shared-space credentials, and future deliveries. The former partner loses access to the shared archive. Authors retain their own private content and may delete their contributions. Explain that copies previously downloaded by the other person cannot be recalled.

Show shared-memory ownership rules before the first save. Deleting an individual account must not delete the other person's account. Scheduled deletion and file-reference checks must prevent accessible orphan images.

## 14. Privacy, security, and operations

### SEC-01 — Data minimization

Do not collect answer histories or emotional details for measurement. Exclude sensitive payloads, join codes, session credentials, and signed URLs from logs. Do not use visual session recording or input replay tools.

### SEC-02 — R2 entry protection

Initial configurable limits: five room creations per client per 10 minutes and ten code attempts per source per 10 minutes, with progressive cooldown. Combine IP and client signals to reduce harm to shared networks. No automatic permanent bans.

### SEC-03 — Sessions and requests

Use HTTPS, Origin checks, CSRF protection for cookie-authenticated actions, safe text rendering, and no execution of user-supplied HTML. Authorize every route and real-time event, not only the initial connection.

### SEC-04 — R3 images

Accept JPEG, PNG, and WebP, up to 10 MB per file. Verify actual bytes and image dimensions. Re-encode to remove metadata. Use private storage and short-lived viewing links issued after membership checks; no permanent public URLs.

### SEC-05 — R2 retention

Delete answer payloads from active storage within 15 minutes of session completion or expiry. Do not place them in storage with long-lived backups. If using a shared database, isolate these data through an operational policy that can honor the promise.

### SEC-06 — R3 retention

Retain account data and content until deletion. Remove from view immediately, delete from active systems within seven days, and expire backups within 30 days. Verify that the chosen operator can meet these requirements before promising them to users.

### OPS-01 — Reliability

Monitor room-creation errors, submission errors, and latency only. Back up persistent R3 data daily. Initial recovery targets: service restoration within eight hours and at most 24 hours of data loss. Perform a restoration drill before album launch.

### OPS-02 — Incident controls

Use separate feature flags for rooms, uploads, and letters. For a privacy defect, disable the affected feature, revoke exposed credentials, and correct authorization before re-enabling. Do not collect more private couple data to diagnose the issue.

## 15. Complete idea traceability

The companion guide's acceptance criterion for each idea is part of its specification. Engine and privacy requirements in this PRD apply in addition. A release label means the first proposed availability, not a committed date.

| ID  | Game or activity            | Release | Main dependency      |
| --- | --------------------------- | ------- | -------------------- |
| G01 | Conversation Starters       | MVP     | Cards                |
| G02 | Would You Rather?           | MVP     | Choice and reveal    |
| G03 | Which One of Us?            | MVP     | Choice and reveal    |
| G04 | How Well Do You Know Me?    | MVP     | Answer prediction    |
| G05 | Finish the Sentence         | R1      | Cards                |
| G06 | Memory Lane                 | R1      | Cards                |
| G07 | Two Truths and a Fiction    | R1      | Manual guessing      |
| G08 | Our World If…               | R1      | Cards                |
| G09 | One-Minute Challenges       | MVP     | Challenges and timer |
| G10 | Silent Charades             | R1      | Challenges and timer |
| G11 | Explain Without These Words | R1      | Challenges and timer |
| G12 | A Story, One Word at a Time | R1      | Alternating writing  |
| G13 | The Unusual Announcer       | R1      | Challenges and timer |
| G14 | The Preference Auction      | R2      | Simultaneous bidding |
| G15 | Home Treasure Hunt          | R3      | Puzzle path          |
| G16 | Random Cooking Challenge    | R3      | Activity planner     |
| G17 | Draw and Guess              | R2      | Drawing canvas       |
| G18 | Emoji Guessing              | R1      | Answer and solution  |
| G19 | The Shared Escape Room      | R3      | Puzzle path          |
| G20 | Object Memory               | R1      | Memory and timer     |
| G21 | Twenty Questions            | R1      | Counter and turns    |
| G22 | Letter Challenge            | R2      | Simultaneous answers |
| G23 | Rank It Like Me             | R2      | Ranking and reveal   |
| G24 | Daily Duo Puzzle            | R2      | Answer and solution  |
| G25 | What Shall We Do? Wheel     | MVP     | Random selection     |
| G26 | Our Night Planner           | R1      | Activity planner     |
| G27 | Our Wish Jar                | R3      | Shared lists         |
| G28 | Our Memory Map              | R3      | Private album        |
| G29 | A Letter to the Future      | R3      | Scheduled letters    |
| G30 | Our First-Time Album        | R3      | Private album        |
| G31 | A Gratitude Card            | R1      | Cards                |
| G32 | Our Weekly Team Mission     | R3      | Shared lists         |
| G33 | Learn Together              | R3      | Content path         |
| G34 | Creative Photo Challenge    | R3      | Tasks and album      |
| G35 | Religious Knowledge Quiz    | R3      | Answer and solution  |
| G36 | A Good Deed Together        | R3      | Cards and tasks      |

One-device games may later receive room support after their private-turn handling is tested.

## 16. R1 — Lightweight expansion engines

### EXT-CARDS — G05, G06, G08, G31

Reuse the card engine. G05 adds a sentence starter and optional timer. G06 adds an explicitly saved local memory title. G08 keeps a scenario and its follow-ups within one round. G31 uses a single card without a compliance counter.

### EXT-GUESS — G07, G21

G07 uses three statements, a hidden answer, and alternating turns; validate nonempty, distinct statements. G21 holds a chosen word and a 0–20 counter with one-step undo. Judging is verbal and manual. Do not connect personal text to analytics.

### EXT-TIMED — G10, G11, G13

Reuse G09's timer. Add a private viewing phase followed by hiding. G11's forbidden words are not checked through a microphone. G13 freezes its generated combination. Results depend on the players' agreement, not automated judging.

### EXT-STORY — G12

States: Start → A/B turn → Preview → Copy or Leave. Maximum 20 turns and 120 characters per turn, with at least one visible character. Undo affects only the latest turn. Never render submitted HTML. Copy is explicit; durable saving is deferred.

### EXT-QUIZ — G18

Question, choices, answer, explanation, and symbol alternative text. Lock once, then reveal. An answer submitted after Reveal Solution receives no point. Editorial review rejects ambiguous puzzles unless accepted alternatives are defined.

### EXT-MEMORY — G20

Choose unique objects and set their display time. Hiding replaces the grid with answer choices. Provide more choices than target objects. Score `max(0, correctSelected - wrongSelected)`. Word mode uses the same rules.

### EXT-PLAN — G26

A three-part template; each part contains `gameId` or `activityId` and duration. Replacement filters by remaining time and location without changing the rest. Add `plans_v1` to local storage and the clear-data action, with an explanation of saving behavior.

### R1 release gate

A working interface alone is insufficient. Complete the relevant content quota from the ideas guide and test states, empty content, and exit behavior. A small R1 pack may launch without waiting for every R1 game.

## 17. R2–R3 — Synchronization and specialized content

### EXT-RT — G14, G22, G23, G24

All depend on room identity and server locking. The auction rejects bids above balance and deducts only from the winner. Letter answers lock at the deadline and are manually approved; a disputed answer gets zero after agreement or skipping. Ranking validates a complete permutation without duplicates. Daily puzzles use one identifier per pair and local date.

### EXT-DRAW — G17

States: Assign Word → Draw and Guess → Reveal → Swap. Send numbered vector strokes in batches with rate limiting. Limit a canvas to 5,000 points and guesses to 120 characters. Reconnection sends a canvas snapshot without the secret word to the guesser.

### EXT-PUZZLE — G15, G19

Represent stations with clues, prerequisites, and solution conditions. G15's local creator interface hides solution codes from the player view. G19 sends role-specific clues. Do not describe G15's one-device hiding as technical secrecy. Test every path from start to finish and reject blocking circular dependencies.

### EXT-COOK — G16

Recipes contain required ingredients, tools, steps, durations, and exclusions. Match strictly. Do not use unrestricted generation that ignores an excluded ingredient. A no-match message is preferable to an unsuitable activity.

### EXT-LEARN — G33, G35

Short learning unit, exercise, question, and source where needed. Each unit has a review state and version. Religious content is a separate bank and cannot publish before source and reviewer verification. Exclude archived questions from new sessions as soon as the catalog updates.

### EXT-GOOD — G36

Cards offer Replace and Done without worship measurement or mandatory streaks. No Cost excludes activities requiring purchases. No donation collection or financial rewards. A financial integration requires a separate PRD.

### R2 implementation order

Launch remote G02, G03, and G04 first. Validate reconnection and answer reveal, then add G14, G22, G23, and G24, followed by drawing. Prove that network tools cannot expose secret answers before increasing game count.

## 18. R3 — The couple's private space

### FR-PAIR — Account linking

A registered user invites a specific account. Invitations expire after 24 hours and can be revoked. Acceptance is explicit. This proposal allows one active relationship per account. Changing partners requires unlinking and a new invitation, without automatic content transfer.

### EXT-LIST — G27, G32

Create a title, optional description, status, and flexible due date. G27 adds a descriptive cost and first step. G32 supports agreed responsibilities without productivity comparisons. Both members may edit shared items, with revisions, conflict dialogs, and contribution deletion.

### EXT-ALBUM — G28, G30, G34

Saving starts private to the author. Share Within Our Space explains who will see the item. Photos and cities are optional. The map can be disabled; the chronological list is a complete alternative. The first version provides a 100 MB limit per shared space and displays usage.

### EXT-LETTER — G29

States: `draft → scheduled → available → deleted`. Before scheduling, the author reviews the recipient, date, and time zone. Store opening time in UTC with the original time zone. A server job checks due letters every minute.

**Letter acceptance:** Target availability within five minutes after the opening time; never before it. Job retries cannot deliver twice. Unlinking before the due time cancels delivery. Notifications contain no letter text. Email failure does not prevent in-app availability.

### R3 administration

Editor, reviewer, and publisher roles manage packs, review, publication, and archiving. Audit who published what and when. Operators see aggregate service metrics without private letters, images, or answers, and cannot silently impersonate a user.

### Notifications

Require explicit opt-in per channel and type, independent controls for each person, and quiet hours. Never notify that a partner ignored a question or share worship or private activity status. Personal reminders require a confirmed channel and recipient identity.

### R3 release gate

Do not launch shared saving, images, or letters until authorization, unlinking, deletion, and recovery tests pass. Each pack has an independent operational disable control.

## 19. Implementation plan and initial estimates

**Assumption:** One full-time developer experienced in web interfaces, part-time design support, and an independent content reviewer. Estimates are approximate working effort, not a quote or delivery commitment. Content and review may change the schedule.

| Stage                                  | Estimated engineering effort | Deliverable                                                                                                                                     |
| -------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Foundation                         | 4–6 working days             | Project structure and RTL, catalog, unified card schema, setup, handoff, and reveal. One complete flow with sample cards, not yet launch-ready. |
| B — Rules                              | 6–9 working days             | G01–G04, then G09 and its timer, and G25 and filters. Six working games with transition, score, and edge-case checks.                           |
| C — Experience and content integration | 4–6 working days             | Favorites, local storage, empty states, reduced motion, interface copy, and reviewed bank integration.                                          |
| D — Verification                       | 3–4 working days             | Actual-device review, privacy and accessibility checks, 5–10 volunteer couple sessions, blocker fixes, and a release package.                   |
| **Total engineering**                  | **17–25 working days**       | Approximately 4–5 weeks when content is available.                                                                                              |

Producing and reviewing 410 items is a parallel content track, initially estimated at 5–8 content working days. Re-estimate after the first 30 items.

### Expansion estimates

- R1: Approximately 2–4 weeks, depending on selected packs.
- R2: Approximately 4–6 weeks for rooms, synchronized games, and drawing.
- R3: Approximately 6–10 weeks or more for linking, files, letters, and specialized content.

Re-estimate after measuring MVP. Do not add these ranges into a contractual deadline.

### Dependencies

State rules before final result-screen design; content schema before bank production; room identity before synchronization; linking and authorization before image uploads; retention policy before scheduled letters.

### Release decision

The product owner confirms scope completion, the reviewer approves content, and the developer demonstrates acceptance checks. This document-preparation request does not itself include public deployment or payments.

## 20. Testing and release acceptance

### QA-01 — Complete flows

For all six games: default start, customized start where supported, completion, skip, early exit, and replay. Results must match events. Do not publish a game without enough content for its advertised session.

### QA-02 — Scores and reveal

G02/G03: zero, partial, and full matches, plus zero completed rounds. G04: alternating correct predictions, ties, and skips; five opportunities each. G02/G03/G04 must not expose the first input during handoff or in-game Back.

### QA-03 — Transitions

Test double locking, Next during animation, Skip after partial input, Exit during reveal, and browser Back. Each transition occurs once. Inputs are inactive in inappropriate phases.

### QA-04 — Timing and filtering

G09: start, pause, resume, hidden tab, and expiry; target less than one second of drift in a short local trial. G25: zero, one, and multiple matches; all filters combined; exhausted alternatives; reduced motion.

### QA-05 — Device data

Refresh does not restore answers. Favorites persist. Disabled storage does not prevent play. Corrupt JSON does not break the application. Archived-card IDs do not cause error pages. Inspect local storage, URLs, and logs for answers.

### QA-06 — Interface and accessibility

Test RTL, mixed-direction text, and long names at the specified widths. Check scrolling, focus, keyboard, screen reader, and actual iPhone and Android devices. No clipped text or buttons hidden beneath the screen.

### MVP gate

Pass 100% of critical tests. No defect may reveal an answer, corrupt a result, or block a primary flow. Complete and review the content bank. Provide run/build instructions and a clear saving policy. Document minor visual defects before release.

### Additional R2–R3 gate

Test room and account isolation; third-user attempts; repeated requests; 30/120-second disconnections; room expiry; edit conflicts; invalid uploads; thumbnail deletion; unlinking before letter delivery; and backup restoration.

Initially test 100 simultaneous rooms with clients acting every 2–5 seconds. Target acknowledgment latency below one second at p95.

## 21. Measurement, business experiments, and risks

### MET-01 — Product metrics

- **Time to first start:** Home opened to `session_started`.
- **Start rate:** Browsing sessions that start a game divided by eligible browsing sessions.
- **Completion rate:** `session_completed / session_started`.
- **Weekly return:** Measure only through an optional mechanism that collects no answers.

### MET-02 — Allowed events

`game_opened`, `session_started`, `round_skipped`, `session_completed`, `replay_clicked`, and `favorite_added`.

Allowed fields: `gameId`, bucketed duration, broad device type, and technical end reason where needed. No private question text, names, choices, or persistent couple identifiers in MVP.

### MET-03 — Measurement approach

The first MVP may be evaluated through observation and voluntary feedback instead of external analytics. If measurement is added, define a clear notice and purpose, retain nonsensitive events for at most 90 days, aggregate them, and minimize identifiers.

### Initial pilot targets

Most testers start within 60 seconds without spoken instructions. Target 70% of started sessions completing their selected length and an optional average enjoyment rating of 4/5. These are internal decision targets for a small sample, not forecast market rates.

### Later business experiment

Start free. Test interest in a ready-made game-night pack and one-time extra-content purchases before subscriptions. MVP needs neither pricing nor a payment gateway. Payments require separate specifications for entitlement, failures, refunds, and review of providers available at implementation time.

### Risks and responses

| Risk                       | Response                                         |
| -------------------------- | ------------------------------------------------ |
| Weak or repetitive content | Editorial review and seen-card ID history.       |
| Scope growth               | Keep MVP to six games.                           |
| Hurtful comparisons        | Neutral tone and no relationship interpretation. |
| Answer exposure            | Separate UI phases and R2 server withholding.    |
| Network failure            | Reconnection and duplicate-safe actions.         |
| Photo-maintenance burden   | Defer images and enforce upload limits.          |

### Deferred decisions that do not block MVP

Final name and visual identity; target country and pricing; R3 account method; hosting provider; notification channel; a second product language; and final religious packs. Resolve each before its related feature while keeping the implementation replaceable.

## 22. First implementation action

Begin with G01 and G02 to prove the card and reveal engines, then complete all six games within scope. Deliver each slice as a complete flow with acceptance checks and reviewed content. Do not begin accounts before meeting the MVP release gate.
