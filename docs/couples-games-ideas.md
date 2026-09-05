# Wens — Couples Games and Activities Ideas

**Version:** 1.0, English Markdown edition  
**Date:** September 5, 2026  
**Status:** Initial proposal; editable  
**Companion document:** [Product Requirements Document](couples-games-prd.md)

“Wens” is a proposed working name, not a commercially verified brand.

## 1. Product concept

Open the website whenever you want something enjoyable to do together. Choose your mood and available time, then start in less than a minute. The website combines conversation, laughter, challenges, cooperation, and memories. Its collections could later become separate projects.

This document describes 36 ideas. Each includes a purpose, gameplay, example, result rule, implementation needs, and acceptance criterion. It is a bank of options, not a commitment to build everything at once. The companion PRD defines six starting games and connects the expansions to that foundation.

### Assumptions and release labels

- **Audience:** Two adult spouses.
- **Product language:** Arabic first, with a mobile-first interface. This document is in English; it does not change the proposed product language.
- **MVP:** Initial release on one shared device, without accounts.
- **R1:** Additional games on one device.
- **R2:** Two-device play and private rooms.
- **R3:** Shared storage, accounts where required, and specialized content.
- **Content tone:** Fun and gently romantic, with an always-available free skip action. Religious sections are optional. Games must not judge the success or quality of a relationship.

### Categories

| IDs | Category |
| --- | --- |
| G01–G08 | Conversation and getting to know each other |
| G09–G16 | Laughter and movement |
| G17–G24 | Thinking and cooperation |
| G25–G30 | Outings and memories |
| G31–G34 | Useful shared activities |
| G35–G36 | Optional religious and charitable activities |

## 2. Conversation and getting to know each other

### G01 — Conversation Starters

**Release:** MVP · **Devices:** One · **Duration:** 5–15 minutes · **Engine:** Cards

- **Purpose:** Open a conversation when you run out of topics, using light questions, memories, and dreams.
- **Gameplay:** Choose a pack and take turns drawing 10 cards. The current player speaks; the other player can answer too. Skipping is always available. The PRD also supports a five-round short session.
- **Example:** “If we had a whole day off with no responsibilities, how would you like us to spend it?”
- **Result:** No winner. Completing the session or saving a favorite question is the outcome.
- **Implementation:** An initial bank of 120 questions, with category, depth, and duration fields. Hide deeper questions by default.
- **Acceptance:** No card repeats within a session. Next changes the turn exactly once. A daily question is a possible later extension.

### G02 — Would You Rather?

**Release:** MVP · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Choice and reveal

- **Purpose:** Compare playful preferences and discover the reasons behind them.
- **Gameplay:** Each player secretly chooses between two alternatives, with a device-handoff screen between turns. Reveal both answers only after both are locked. Play 10 rounds, or use the PRD's short-session option.
- **Example:** “A seaside trip or a mountain cabin?” “Cook together or try a new restaurant?”
- **Result:** Matching rounds out of completed rounds. Never label this a measure of marital compatibility.
- **Implementation:** 80 cards with two clear options. Answers are temporary and are not retained after leaving.
- **Acceptance:** In-game back navigation does not expose the first player's answer to the second player. Each match counts once.

### G03 — Which One of Us?

**Release:** MVP · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Choice and reveal

- **Purpose:** Laugh about everyday habits without insults or judgments.
- **Gameplay:** For each question, both players choose Player A, Player B, or Both of Us. Reveal the choices together, then continue.
- **Example:** “Which one of us loses the remote?” “Who turns a short errand into an outing?”
- **Result:** Optional agreement counter. No ranking of who is better in the relationship.
- **Implementation:** 60 neutral situations and optional aliases. Avoid prompts that encourage humiliation or financial comparisons.
- **Acceptance:** Both of Us is an independent, valid option. Skipping clears every choice entered for the current round.

### G04 — How Well Do You Know Me?

**Release:** MVP · **Devices:** One · **Duration:** 10–15 minutes · **Engine:** Answer prediction

- **Purpose:** Turn knowledge of small personal details into a friendly competition.
- **Gameplay:** One player privately answers a four-option question. Their partner predicts the answer. Reveal the result and swap roles over 10 rounds.
- **Example:** “For a short break, I would choose: sleeping, going out, visiting family, or a movie at home.”
- **Result:** One point per correct prediction. Ties are normal; there is no penalty for an incorrect prediction.
- **Implementation:** 60 multiple-choice questions. Avoid free-text matching initially so differences in phrasing do not create unfair results.
- **Acceptance:** Each player receives five prediction opportunities. Scores equal actual matches, with no duplicate scoring.

### G05 — Finish the Sentence

**Release:** R1 · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Cards

- **Purpose:** Make expression easier with a short sentence starter.
- **Gameplay:** Draw an unfinished sentence and complete it aloud, with an optional timer. The partner restates what they understood, then roles switch.
- **Example:** “The nicest detail in my day with you is…” “If we learned something together, I would choose…”
- **Result:** No points. Three answers per person complete the session.
- **Implementation:** 60 sentence starters and a timer that can be disabled. No audio recording.
- **Acceptance:** The game works without microphone access, and Skip remains available when the timer is paused.

### G06 — Memory Lane

**Release:** R1 · **Devices:** One · **Duration:** 10–20 minutes · **Engine:** Cards

- **Purpose:** Recall shared moments instead of relying only on general questions.
- **Gameplay:** Choose a period or theme: beginnings, travel, home, or funny moments. Answer five cards and optionally write a memory title.
- **Example:** “What was the first meal we made together?” “What were we late for and later laughed about?”
- **Result:** Do not score memory accuracy. Two different accounts of the same event are acceptable.
- **Implementation:** 40 cards. In R1, save titles locally only; connect to the cloud album in R3.
- **Acceptance:** Save a memory title only through an explicit Save action. Canceling editing leaves no saved draft.

### G07 — Two Truths and a Fiction

**Release:** R1 · **Devices:** One · **Duration:** 10 minutes · **Engine:** Manual guessing

- **Purpose:** Discover personal stories through a light guessing game.
- **Gameplay:** A player writes three statements about themselves and secretly marks the fictional one. Their partner selects one; reveal the answer and swap roles.
- **Example:** “I have tried camping.” “I used to love mathematics.” “I performed in a school play.”
- **Result:** One point per correct guess. Six rounds with equal turns.
- **Implementation:** A form for three short statements and one hidden answer. Keep data in session memory.
- **Acceptance:** A round cannot start without three distinct, nonempty statements and exactly one marked answer. Hide that answer until reveal.

### G08 — Our World If…

**Release:** R1 · **Devices:** One · **Duration:** 10–15 minutes · **Engine:** Cards

- **Purpose:** Build a shared imaginary world beyond conventional questions.
- **Gameplay:** Show a premise and three follow-up questions. Each player proposes an idea, then both choose a shared version of the story.
- **Example:** “If we opened a little café: what would it be called, what would its special dish be, and who would welcome customers?”
- **Result:** Cooperative completion through three decisions; no correct answer.
- **Implementation:** 40 scenarios with three follow-ups each. Draw from an editorially prepared bank.
- **Acceptance:** Keep the scenario fixed while answering its follow-ups. Redrawing replaces the entire group.

## 3. Laughter and movement

### G09 — One-Minute Challenges

**Release:** MVP · **Devices:** One · **Duration:** 5–15 minutes · **Engine:** Challenges and timer

- **Purpose:** Break routine with simple verbal, acting, and movement challenges.
- **Gameplay:** Choose quiet or active play, then draw five cards. Start the timer when ready, then record Done or Skip.
- **Example:** Name five foods beginning with the same letter; perform an advertisement for a pillow; build a tower of paper cups.
- **Result:** Shared accomplishments only. Skipping does not deduct points.
- **Implementation:** 50 challenges lasting 30 or 60 seconds. Include No Tools and No Movement filters and an alternative for each challenge.
- **Acceptance:** The countdown starts only after a button press. Pause preserves remaining time. A completion cannot be recorded twice.

### G10 — Silent Charades

**Release:** R1 · **Devices:** One · **Duration:** 10–20 minutes · **Engine:** Challenges and timer

- **Purpose:** Work together to guess a word through acting.
- **Gameplay:** The actor privately reads the word, hides it, and hands over the phone. Act for up to 60 seconds. The partner records Correct or Skip, then roles switch.
- **Example:** Opening an umbrella in the wind; making coffee; looking for glasses.
- **Result:** One point per correct word. Six equal turns with manual scoring.
- **Implementation:** 100 words or scenes across three difficulty levels and a screen that hides the word.
- **Acceptance:** The word never appears on the timer screen facing the guesser. No required audio or video capture.

### G11 — Explain Without These Words

**Release:** R1 · **Devices:** One · **Duration:** 10 minutes · **Engine:** Challenges and timer

- **Purpose:** Challenge quick thinking by describing a word without its usual vocabulary.
- **Gameplay:** Show the explainer a target and three forbidden words. They explain aloud within one minute. Both players manually confirm the result.
- **Example:** Target: coffee. Forbidden words: beans, cup, morning.
- **Result:** One point for a correct guess. If a forbidden word is used, skip the card by mutual agreement.
- **Implementation:** 100 original Arabic cards. No voice analysis or automated speech judging.
- **Acceptance:** Only the explainer's viewing stage displays the target and forbidden words. A local skip reason may be recorded without personal text.

### G12 — A Story, One Word at a Time

**Release:** R1 · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Alternating writing

- **Purpose:** Create a funny story through small shared decisions.
- **Gameplay:** Start with a five-word opening. Players alternate adding one word or a short sentence for up to 20 turns, then view the whole story.
- **Example premise:** Waking up to discover that the refrigerator can talk, then taking turns adding unexpected developments.
- **Result:** Finishing the story is the win. Copying requires an explicit action.
- **Implementation:** An alternating editor with a 120-character limit per turn, 30 openings, and undo for the latest turn only.
- **Acceptance:** A turn changes only after a nonempty submission. Leaving clears the story unless the user explicitly preserves it; durable in-app saving is deferred, so R1 provides explicit copying.

### G13 — The Unusual Announcer

**Release:** R1 · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Challenges and timer

- **Purpose:** Combine an ordinary object with an unexpected performance style.
- **Gameplay:** Draw a product, a style, and an audience. Deliver a 30-second spoken advertisement. The partner picks the funniest line.
- **Example:** Advertise a spoon in the style of a news broadcast to an audience of cats.
- **Result:** Count completed performances without ranking personal ability.
- **Implementation:** 20 products, 10 styles, and 10 audiences. Review unsuitable combinations. No recording.
- **Acceptance:** Freeze all three elements for the round. Allow one element to be replaced before the timer starts.

### G14 — The Preference Auction

**Release:** R2 · **Devices:** Two · **Duration:** 10–15 minutes · **Engine:** Simultaneous bidding

- **Purpose:** Discover priorities using an imaginary entertainment budget.
- **Gameplay:** Give each player 100 stars with no monetary value. Players secretly bid on five imaginary privileges, then reveal bids.
- **Example:** A day without chores; choosing the next trip destination; choosing the day's menu.
- **Result:** The highest bidder wins the item and pays their bid in stars. A tie makes the choice shared with no deduction.
- **Implementation:** Session balances, hidden bids, and a server-authoritative balance. No star purchases or financial prizes.
- **Acceptance:** Reject bids above the available balance. Repeated requests cannot deduct twice. Delete bids at the end of the round.

### G15 — Home Treasure Hunt

**Release:** R3 · **Devices:** One · **Duration:** 20–45 minutes · **Engine:** Puzzle path

- **Purpose:** Let one spouse create a home adventure for the other.
- **Gameplay:** The creator selects five safe locations, writes clues, and leaves short codes at them. Show the next clue only after the correct code is entered.
- **Example:** “Start where we keep our shoes, then look near our favorite book.”
- **Result:** Complete the path; additional hints carry no penalty.
- **Implementation:** A station editor, separate preview mode, and nonsensitive codes. No location tracking or camera requirement.
- **Acceptance:** The player interface does not reveal solutions. The creator can edit the path only before play starts.

### G16 — Random Cooking Challenge

**Release:** R3 · **Devices:** One · **Duration:** 30–60 minutes · **Engine:** Activity planner

- **Purpose:** Turn making a simple meal into a shared activity.
- **Gameplay:** Enter available ingredients and exclusions, choose from prepared recipes, and divide the tasks. Either player can reject a suggestion.
- **Example:** With bread, cheese, and vegetables, make two different sandwiches and name each one.
- **Result:** Completing the meal and a playful presentation review, without hurtful comparisons.
- **Implementation:** Tested recipes, ingredient lists, and tools. Strictly exclude specified ingredients; make no health promises.
- **Acceptance:** If no recipe matches, offer filter changes without ignoring exclusions.

## 4. Thinking and cooperation

### G17 — Draw and Guess

**Release:** R2 · **Devices:** Two · **Duration:** 10–20 minutes · **Engine:** Drawing canvas

- **Purpose:** Guess a simple drawing in real time.
- **Gameplay:** The artist sees a private word. The partner sees only the drawing and types a guess before 60 seconds expire. Alternate roles over six rounds.
- **Example:** Draw an umbrella, a teapot, or a tent without writing its name.
- **Result:** One point per correct guess. Use approved synonyms for each word instead of AI interpretation.
- **Implementation:** Touch canvas, clear and undo controls, stroke transmission, and a synonym dictionary.
- **Acceptance:** Never send the secret word to the guesser. Restore the drawing after disconnection. Accept defined synonyms without overly broad matching.

### G18 — Emoji Guessing

**Release:** R1 · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Answer and solution

- **Purpose:** Solve combinations of symbols representing familiar things.
- **Gameplay:** Show three symbols with four choices or a Reveal Solution button. Discuss and lock an answer across 10 cards.
- **Example:** Sun, suitcase, and airplane symbols indicate a summer trip among four clear options.
- **Result:** One point for solving before reveal. Optional hints appear in the result without a penalty.
- **Implementation:** 80 puzzles, symbol alternative text, and editorial review to avoid protected-work references or ambiguous solutions.
- **Acceptance:** Accept only the approved option. Provide understandable alternative text when a symbol cannot be displayed.

### G19 — The Shared Escape Room

**Release:** R3 · **Devices:** One or two · **Duration:** 20–40 minutes · **Engine:** Puzzle path

- **Purpose:** A cooperative escape experience built around a short Arabic story.
- **Gameplay:** Each player receives different clues. They discuss and combine them to open four locks. Offer a hint, then a solution with an explanation.
- **Example:** One player has a color order; the other has a color-to-number mapping. Together they derive a safe code.
- **Result:** Unlock the ending. Show elapsed time and hint usage only.
- **Implementation:** Three original stories initially, a puzzle dependency graph, progress saving, and role-specific content.
- **Acceptance:** Every puzzle can be solved from its clues alone. No puzzle requires a clue from a station that is not yet available.

### G20 — Object Memory

**Release:** R1 · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Memory and timer

- **Purpose:** A short visual memory challenge played cooperatively or in turns.
- **Gameplay:** Display a grid for 10 seconds, then hide it. The player selects remembered objects from a list. Swap roles using an equally difficult grid.
- **Example:** A key, cup, book, and glasses are shown, followed by a list of eight objects.
- **Result:** Correct selections minus incorrect selections, with a minimum of zero. Ties are allowed.
- **Implementation:** Original or licensed icons, levels of 4, 6, and 9 objects, and a word-based alternative.
- **Acceptance:** Generate no duplicate target objects, and include every correct answer among the available choices.

### G21 — Twenty Questions

**Release:** R1 · **Devices:** One · **Duration:** 10 minutes · **Engine:** Counter and turns

- **Purpose:** Identify a hidden object through yes-or-no questions.
- **Gameplay:** One player chooses a secret word from the bank and verbally answers their partner's questions. Count questions until a correct guess or 20 questions, then swap roles.
- **Example:** “Is it used at home?” “Does it need electricity?” “Is it in the kitchen?”
- **Result:** Record whether the word was guessed and how many questions were used.
- **Implementation:** 100 words, clear categories, a counter, and one-step undo. No speech recognition.
- **Acceptance:** Keep the counter between 0 and 20. Hide the word until an intentional reveal.

### G22 — Letter Challenge

**Release:** R2 · **Devices:** Two · **Duration:** 10–15 minutes · **Engine:** Simultaneous answers

- **Purpose:** A two-player version of finding words by starting letter and category.
- **Gameplay:** Select a letter and categories such as food, place, and household object. Both players write for one minute, then reveal and jointly approve answers.
- **Example:** For the Arabic letter corresponding to M: macaroni, Madaba, and the Arabic word for mirror.
- **Result:** 10 points for a valid unique answer, 5 for a matching answer, and 0 for blank answers or answers rejected by agreement.
- **Implementation:** Curated letters to avoid impossible rounds; normalize spacing and Arabic diacritics; manual approval for disagreements.
- **Acceptance:** Do not automatically judge an ambiguous Arabic name. Lock answers when time expires.

### G23 — Rank It Like Me

**Release:** R2 · **Devices:** Two · **Duration:** 5–10 minutes · **Engine:** Ranking and reveal

- **Purpose:** Predict a partner's order of preference.
- **Gameplay:** One player secretly ranks four cards. The other predicts the order. Compare the rankings and swap roles across six rounds.
- **Example:** Rank travel, reading, cooking, and movies by what you would prefer during a break.
- **Result:** One point for each item in the correct position, from 0 to 4 per round.
- **Implementation:** 40 sets, drag-and-drop, and alternative movement buttons.
- **Acceptance:** Every item appears exactly once. Keyboard reordering produces the same result as touch input.

### G24 — Daily Duo Puzzle

**Release:** R2 · **Devices:** One or two · **Duration:** 3–5 minutes · **Engine:** Answer and solution

- **Purpose:** Provide a light reason to return without committing to a long session.
- **Gameplay:** Show one puzzle for today's date in the chosen time zone. Each player proposes a solution, then both reveal the answer and explanation.
- **Example:** A simple ordering puzzle involving three incorrectly labeled boxes, with choices and an explained solution.
- **Result:** Shared daily completion without losing a streak for missing a day.
- **Implementation:** 90 reviewed puzzles, a local-day identifier, and no repeats before the bank is exhausted.
- **Acceptance:** Both players see the same puzzle for the same date. Changing time zone does not create a second reward.

## 5. Outings and memories

### G25 — What Shall We Do? Wheel

**Release:** MVP · **Devices:** One · **Duration:** One minute to choose, then the activity · **Engine:** Random selection

- **Purpose:** Resolve indecision using available time, location, and cost.
- **Gameplay:** Choose indoors or outdoors, duration, and budget. Filter matching options, animate a wheel, and display an activity with steps.
- **Example:** “20 minutes, indoors, no cost: make a drink and choose three old photos to talk about.”
- **Result:** No points. Offer We Did It, Another Option, and Favorite.
- **Implementation:** 40 activities with duration, descriptive cost, and tools. No booking integration or live prices.
- **Acceptance:** Every result satisfies all filters. If none match, explain the empty result instead of showing an incompatible activity.

### G26 — Our Night Planner

**Release:** R1 · **Devices:** One · **Duration:** Three minutes to plan · **Engine:** Activity planner

- **Purpose:** Build an evening from an opening activity, a game, and a pleasant closing.
- **Gameplay:** Choose 30, 60, or 90 minutes and a mood. Display a three-part plan and allow individual parts to be replaced.
- **Example:** 10 minutes for a drink, 15 for How Well Do You Know Me?, and 5 to choose next week's activity.
- **Result:** Complete the plan's parts; no competitive ranking.
- **Implementation:** Plan templates, duration totals, links to existing games, and local plan saving.
- **Acceptance:** Combined durations never exceed the selected time budget. Replacing one part leaves the others unchanged.

### G27 — Our Wish Jar

**Release:** R3 · **Devices:** One or two · **Duration:** 5–10 minutes · **Engine:** Shared lists

- **Purpose:** Collect postponed experiences and turn them into small next steps.
- **Gameplay:** Each partner adds a wish with an approximate cost and flexible date. Choose one together and define its first step.
- **Example:** Visit a nearby city, learn a new dish, or watch the sunrise once.
- **Result:** States: Idea, Planned, Tried It. Do not turn wishes into compulsory obligations.
- **Implementation:** Two linked accounts, editing permissions, a filterable list, and no payment-information storage.
- **Acceptance:** Concurrent edits cannot erase the other person's independent addition. Shared deletion requires clear confirmation.

### G28 — Our Memory Map

**Release:** R3 · **Devices:** Two · **Duration:** 10 minutes initially, then additions · **Engine:** Private album

- **Purpose:** Collect meaningful places and moments in a timeline with an optional map.
- **Gameplay:** Add a title, date, city, and optional photo. Browse memories by year or place.
- **Example:** A first trip to Aqaba, a first home, or a café where you celebrated good news.
- **Result:** No points. Filters and optional anniversary calendar features.
- **Implementation:** Private photo uploads, removal of image location metadata, and item-level permissions. A city is sufficient; GPS is unnecessary.
- **Acceptance:** Unauthorized users cannot access private image links. Deletion removes originals and thumbnails according to the deletion policy.

### G29 — A Letter to the Future

**Release:** R3 · **Devices:** Two · **Duration:** 5–10 minutes · **Engine:** Scheduled letters

- **Purpose:** Write a letter that opens on a chosen date.
- **Gameplay:** Write to yourself or your partner, review the recipient and opening date, and save. The author can delete it before it opens.
- **Example:** “Open on our next anniversary: the thing I appreciate most this year is…”
- **Result:** No points. User-facing states include Draft, Locked, and Available.
- **Implementation:** Verified identity, time zones, server scheduling, and generic notifications without the letter text.
- **Acceptance:** Never release a letter early. Unlinking prevents future delivery to the former partner.

### G30 — Our First-Time Album

**Release:** R3 · **Devices:** One or two · **Duration:** 10 minutes · **Engine:** Private album

- **Purpose:** Encourage new experiences and document them without a social network.
- **Gameplay:** Choose a safe new activity, try it, then write an impression and optionally add a photo.
- **Example:** First homemade pizza, first dawn walk, or first shared puzzle game.
- **Result:** Experience badges that do not imply relationship quality.
- **Implementation:** 30 suggestions, a private log, optional photos, and the same permissions as the memory map.
- **Acceptance:** Never publish achievements automatically. Deleting one experience leaves other memories intact.

## 6. Useful shared activities

### G31 — A Gratitude Card

**Release:** R1 · **Devices:** One · **Duration:** 3–5 minutes · **Engine:** Cards

- **Purpose:** End a session with specific, kind words.
- **Gameplay:** Show a gratitude starter for each person to complete aloud. One card is enough; continuing is optional.
- **Example:** “Thank you for… today.” “One small thing you did that made my day easier was…”
- **Result:** No points or compliance tracking.
- **Implementation:** 30 cards; no writing or storage by default; a clear End button.
- **Acceptance:** Do not show the spoken gratitude content in a session summary. Do not send reminders without a request.

### G32 — Our Weekly Team Mission

**Release:** R3 · **Devices:** Two · **Duration:** Five minutes to plan · **Engine:** Shared lists

- **Purpose:** Choose a small household accomplishment that encourages cooperation.
- **Gameplay:** Agree on one task, split it into two steps, and optionally choose a review date. Allow postponement or cancellation.
- **Example:** Organize one shelf, prepare a reading corner, or plan two days of meals.
- **Result:** Shared task progress only; no monitoring dashboard for each partner's contribution.
- **Implementation:** Tasks, flexible dates, optional notifications, shared storage, and permissions.
- **Acceptance:** Both partners receive updated dates. Each can independently disable their own notifications.

### G33 — Learn Together

**Release:** R3 · **Devices:** One · **Duration:** 10–20 minutes · **Engine:** Content path

- **Purpose:** Try a small skill through a lesson, an exercise, and a question.
- **Gameplay:** Choose from an editorially prepared skill bank, read a short instruction, complete an exercise, and answer a review question.
- **Example:** Learn five words in a language, draw a simple shape, or practice phone photography.
- **Result:** Lesson and practice completion, without claims of certification or mastery.
- **Implementation:** 12 original or licensed lessons, answers, explanations, and content review.
- **Acceptance:** Never present a quiz that depends on unavailable material. Repeating a lesson does not lose progress.

### G34 — Creative Photo Challenge

**Release:** R3 · **Devices:** One or two · **Duration:** 15–30 minutes · **Engine:** Tasks and album

- **Purpose:** Notice appealing details around you and create a memory.
- **Gameplay:** Each person draws a theme and takes a photo outside the website. They choose whether to upload it or show it directly on their own device.
- **Example:** Something blue, a beautiful shadow, or a detail that makes home feel warm.
- **Result:** Choose the funniest photo together. No automated face scoring.
- **Implementation:** 30 tasks and optional private uploads. No automatic camera access or access to the full photo library.
- **Acceptance:** Refusing photo permission does not block the activity. No upload occurs before user confirmation.

## 7. Optional religious and charitable activities

### G35 — Religious Knowledge Quiz

**Release:** R3 · **Devices:** One · **Duration:** 5–10 minutes · **Engine:** Answer and solution

- **Purpose:** Learn sourced religious information in a short game.
- **Gameplay:** Choose a topic, take turns answering five multiple-choice questions, and see the answer, short explanation, and source after each question.
- **Example topics:** Prophetic biography, names of Quranic chapters, and ethics. Final question text must be reviewed before publication.
- **Result:** One point per correct answer inside the game only. Never connect points to spiritual reward.
- **Implementation:** A separate content bank with precise references and human review. No generated religious rulings or disputed questions initially.
- **Acceptance:** Publishing requires a reference and approved review. Keep the section hidden until the user enables it.

### G36 — A Good Deed Together

**Release:** R3 · **Devices:** One · **Duration:** 5–30 minutes · **Engine:** Cards and tasks

- **Purpose:** Suggest a small useful action the couple voluntarily chooses.
- **Gameplay:** Show an idea with duration and tools; accept or replace it. Do not request proof or log religious observance.
- **Example:** Call a relative, help someone, or prepare a useful item to donate.
- **Result:** No spiritual points or worship streaks. An optional private Done state is sufficient.
- **Implementation:** 30 general ideas, a No Cost filter, and no donation collection or money transfers inside the website.
- **Acceptance:** Skipping never triggers guilt. Do not collect worship data or automatically share it with the partner.

## 8. Turning the ideas into projects

Start with one website under the working name Wens. Shared card, turn, timer, and reveal engines reduce repeated work. These collections can later become separate products if useful.

| Proposed project | Ideas | Scope and dependencies |
| --- | --- | --- |
| Quick Wens | G01, G02, G03, G04, G09, G25 | Immediate start without registration; the PRD's MVP. |
| Game Night | G05–G08, G10–G13, G18, G20, G21, G26, G31 | Local expansion using cards, turns, and lightweight engines. |
| Play Apart | Suitable existing games, then G14, G17, G22, G23, G24 | Private rooms, server synchronization, and temporary player identities. |
| Our Story | G27–G30, G32, G34 | Linked accounts, private storage, files, deletion, and unlinking. Launch after validating the privacy model. |
| Adventures and Learning | G15, G16, G19, G33, G35, G36 | Specialized content and additional review; split into smaller packs according to demand. |

## 9. Experience improvements and business experiments

Begin with six free games. Later test original content packs or a one-time purchase for a ready-made game night. Consider subscriptions only if users demonstrate demand for recurring content. There is no approved price, purchasable game currency, or advertising interruption during a round.

Useful shared features include favorites, Surprise Me, mood and duration filters, optional sound, quiet mode, short instructions, a friendly summary, and replay without repeats until the relevant bank is exhausted. The first release does not require AI.

Try the product with 5–10 volunteer couples. With their consent, observe difficulty understanding rules, time to start, and enjoyment ratings. Do not collect private answers. The ordering and priorities in this document are initial product judgments, not market-research findings.

## 10. Recommended starting point

Build G01 and G02 first to prove the card and reveal engines. Complete all six MVP games next, using the companion PRD's acceptance tests and reviewed content requirements. Defer accounts and the remaining collections until the MVP release gate is met.
