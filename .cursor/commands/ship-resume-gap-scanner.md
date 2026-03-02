# ship-resume-gap-scanner

Build and ship the Resume Matcb MVP using the project rules.

Workflow:
1. Read the project rules first.
2. Inspect the current repository structure and infer what already exists.
3. Produce a concise phased plan.
4. Build only the next highest-leverage slice.
5. After each slice:
   - run the minimum relevant validation
   - summarize progress
   - list blockers
   - propose the next slice

Priorities:
1. foundation and app shell
2. resume upload + job description input
3. PDF extraction and normalization
4. GPT-5-mini structured analysis
5. result page rendering
6. paywall + Stripe
7. analytics / Sentry / OTel
8. export and launch polish

Non-negotiables:
- do not build side features outside the wedge
- do not add auto-apply
- do not add LinkedIn integration in V1
- do not add CRM features in V1
- do not invent resume content
- keep code simple and shippable

Always prefer:
- direct implementation
- sensible defaults
- clear types
- clean error handling
- mobile-usable UI

At the end of each run, output:
- completed
- in progress
- blocked
- exact next step