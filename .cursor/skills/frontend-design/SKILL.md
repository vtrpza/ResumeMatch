---
name: frontend-design
description: Creates distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, or applications, when the user asks for UI design, layouts, or styling, or when improving existing frontend code. Generates creative, polished code that avoids generic AI aesthetics.
---

# Frontend Design

## When to apply

Use this skill when:
- Building or refining UI components, pages, or full applications
- User asks for layouts, styling, or visual design
- Improving existing frontend code for clarity and polish
- Choosing typography, color, or spacing systems

## Core principles

1. **Distinctive over generic** — Avoid “AI slop” aesthetics: no Inter + purple gradients + rounded cards by default. Make deliberate choices that fit the product.
2. **Production-grade** — Semantic HTML, accessible patterns, responsive behavior. Code should be maintainable and performant.
3. **Purpose-driven** — Every visual choice (color, weight, spacing) should support hierarchy, scannability, or trust.

## Layout and structure

- Prefer clear visual hierarchy: one primary focus per section.
- Use consistent spacing scale (e.g. 4/8/16/24/32/48 in Tailwind).
- Align to a grid; avoid arbitrary alignment.
- On content-heavy pages, use max-width containers (e.g. `max-w-3xl` or `max-w-4xl`) for readability.

## Typography

- Pick one or two typefaces. Use weight (e.g. 400/500/600/700) and size for hierarchy, not extra fonts.
- Prefer readable body size (e.g. 16px base) and comfortable line-height (e.g. 1.5–1.6).
- Headings: clear size steps (e.g. `text-2xl` → `text-xl` → `text-lg`) and consistent margin below.

## Color and contrast

- Ensure sufficient contrast (WCAG AA minimum for body text).
- Use color for meaning: primary actions, states (success/error/warning), and emphasis—not decoration.
- Prefer a small, intentional palette over many one-off colors.

## Components and patterns

- **Buttons**: One primary style for the main CTA; secondary/ghost for lesser actions. Consistent padding and border-radius.
- **Forms**: Label + input + optional error. Use `focus:` and `focus-visible:` for keyboard users. Group related fields.
- **Cards / panels**: Use subtle borders or shadows to separate from background; avoid heavy shadows unless needed for elevation.
- **Lists**: Consistent spacing between items; consider dividers or alternating backgrounds for long lists.

## Accessibility

- Use semantic elements (`<button>`, `<nav>`, `<main>`, `<section>`, headings in order).
- Ensure interactive elements are keyboard-focusable and have visible focus styles.
- Provide text alternatives for icons and images; use `aria-label` where the label isn’t visible.
- Avoid low-contrast text or tiny touch targets on mobile.

## Stack alignment (this project)

- **Next.js App Router**: Use server components by default; client components only where needed (state, events, browser APIs).
- **Tailwind CSS**: Use utility classes; prefer design tokens (e.g. `text-primary`, `bg-surface`) if a theme is defined. Avoid long arbitrary value chains; extract repeated patterns into components.
- **TypeScript**: Type props and event handlers; avoid `any` for UI code.

## Output checklist

Before considering a UI “done”:

- [ ] Clear hierarchy and one primary action per section
- [ ] Consistent spacing and alignment
- [ ] Accessible focus states and semantic structure
- [ ] Responsive behavior (key breakpoints considered)
- [ ] No generic “AI default” look without a reason

## Anti-patterns to avoid

- Centering everything in a single column with no structure
- Multiple competing CTAs or decorative gradients
- Inconsistent spacing or font sizes
- Buttons or links that are not obviously interactive (e.g. no hover/focus)
- Ignoring dark/light context if the app supports both
