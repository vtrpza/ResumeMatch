# ship-resume-match

Build, refine, and launch the Resume Match MVP using the project rules.

Workflow:
1. Read the project rules first.
2. Inspect the current repository structure and infer what already exists.
3. Produce a concise plan for the next highest-leverage slice.
4. Build or refine only that slice.
5. After each slice:
   - run the minimum relevant validation
   - summarize progress
   - list blockers
   - propose the next slice

Current priorities:
1. landing page and product UX refinement
2. sample report and result page refinement
3. first free scan premium experience
4. PDF extraction and normalization reliability
5. GPT-5-mini structured analysis quality and groundedness
6. PostHog integration and funnel visibility
7. Sentry integration and error visibility
8. simple one-time Stripe checkout for $2 per additional scan
9. deployment readiness and launch polish

Business model:
- first scan is free
- each additional scan costs $2
- no subscriptions
- no recurring billing
- keep payment logic simple and credible

Non-negotiables:
- do not build side features outside the wedge
- do not add auto-apply
- do not add LinkedIn integration in V1
- do not add CRM features in V1
- do not invent resume content
- do not fabricate candidate achievements
- keep code simple and shippable
- prefer refinement, clarity, trust, and launch-readiness over feature expansion

Always prefer:
- direct implementation
- sensible defaults
- clear types
- clean error handling
- grounded output
- mobile-usable UI
- premium but restrained UX

At the end of each run, output:
- completed
- in progress
- blocked
- exact next step