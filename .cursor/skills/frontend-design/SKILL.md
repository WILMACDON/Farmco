---
name: frontend-design
description: Guides creation of distinctive, production-grade frontend UI with React, Inertia, Tailwind v4, and shadcn/ui. Use when building or updating pages, components, layouts, forms, styling, dark mode, or when the user asks about design consistency, accessibility, navigation, or avoiding generic AI aesthetics.
---

# Frontend Design

This skill combines **project conventions** (stack, navigation, theme) with **aesthetic guidelines** so interfaces are both correct and distinctive. Implement working code with clear aesthetic intent; avoid generic “AI slop” looks.

## Design Thinking

Before implementing, decide on a **clear aesthetic direction**:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick a direction and commit: minimal, maximalist, retro-futuristic, organic, luxury/refined, playful, editorial, brutalist, art deco/geometric, soft/pastel, industrial, etc.
- **Constraints**: Framework (this project: React, Inertia, Tailwind, shadcn), performance, accessibility.
- **Differentiation**: What makes this screen or component memorable?

Bold maximalism and refined minimalism both work; the key is **intentionality**. Match implementation complexity to the vision: maximalist needs more motion and detail; minimalist needs restraint, spacing, and typography.

## Frontend Aesthetics Guidelines

- **Typography**: Prefer distinctive, characterful fonts. Avoid defaulting to Inter, Roboto, Arial, or system-only. Pair a strong display font with a readable body font when appropriate.
- **Color & theme**: Use this project’s **CSS variables** (see Theme and Colors). Commit to a cohesive palette; dominant colors with sharp accents beat timid, even distribution. Never hardcode colors for interactive UI; use tokens so dark mode stays readable.
- **Motion**: Use animation for high-impact moments (e.g. one well-orchestrated load with staggered reveals). Prefer CSS for simple effects; consider Motion for React when needed. Avoid scattered, low-impact micro-interactions.
- **Spatial composition**: Consider asymmetry, overlap, diagonal flow, grid-breaking elements, and either generous negative space or controlled density.
- **Backgrounds & depth**: Add atmosphere when it fits the direction: gradient meshes, subtle noise, geometric patterns, layered transparencies, shadows, grain. Match the overall aesthetic.

**Avoid**: Overused font stacks (Inter, Roboto, Space Grotesk), clichéd schemes (e.g. purple gradients on white), predictable layouts, and cookie-cutter patterns. Vary choices by context; don’t converge on the same look every time.

---

## Stack

- **React 19** + **TypeScript**
- **Inertia.js** for SPA-style navigation (server-rendered)
- **Tailwind CSS v4** with theme tokens in `resources/css/app.css`
- **shadcn/ui** (Radix primitives) in `inertia/components/ui/`
- **Lucide React** for icons
- **class-variance-authority (cva)** for component variants
- **cn()** from `@/lib/utils` for merging class names

## Theme and Colors

- Use **CSS variables** for all UI colors so light/dark mode works automatically.
- Tokens: `background`, `foreground`, `primary`, `primary-foreground`, `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`, plus sidebar and chart tokens.
- **Never hardcode colors** for interactive UI (e.g. no `text-white` on primary buttons). Use `text-primary-foreground` so dark mode stays readable.
- Light theme: `:root`; dark theme: `.dark` (same tokens, different values).

## Navigation and Links

- **In-app navigation**: Use Inertia **`<Link href="...">`** so navigation is client-side and does not full-reload.
- **Button-styled links**: Use `Link` with `buttonVariants()` instead of `<Button asChild><Link>...</Link></Button>`. Wrapping Link in Button asChild can overwrite Inertia’s click handler and cause “click twice” or full reloads.
  - Example: `<Link href='/login' className={cn(buttonVariants({ variant: 'ghost' }))}>Sign In</Link>`
- **External or full reload**: Use `<a href="...">` or `router.visit(url, { preserveState: false })` only when intentional.

## Buttons

- Use **`Button`** from `@/components/ui/button` for actions (submit, modals, non-navigation).
- Variants: `default`, `outline`, `secondary`, `ghost`, `link`, `destructive`. Sizes: `default`, `xs`, `sm`, `md`, `lg`, `icon`.
- For “looks like a button but navigates”: `Link` + `className={cn(buttonVariants({ variant: '...' }))}`.
- Export and use **`buttonVariants`** when you need the same look on a different element (e.g. Link).

## Forms

- Use **`Label`**, **`Input`**, **`PasswordInput`**, **`Checkbox`**, **`Select`**, **`Textarea`** from `inertia/components/ui/`.
- Group with consistent spacing: `space-y-2` per field, `space-y-4` between sections.
- Use **Formik** or **React Query mutations** for submit; call API then `router.visit(redirectTo)` or refetch as needed.
- Show validation errors from server (e.g. `errors?.message` in Alert) or inline per field.

## Layout and Spacing

- **Public pages**: `PublicLayout` (header, optional footer). Use `AppCard` for contained content.
- **Dashboard/admin**: `DashboardLayout` (sidebar, top bar). Use `PageHeader`, `AppCard`, `DataTable` where applicable.
- Use **Stack**, **HStack** from `@/components/ui/` for consistent gaps; Tailwind `gap-*` and `space-y-*` for flex/grid.

## Accessibility

- Preserve **focus-visible** styles (ring) on interactive elements; they are defined in button and form components.
- Use **`aria-label`** on icon-only buttons (e.g. `aria-label='Open menu'`).
- Use semantic HTML: `nav`, `main`, `header`, `footer`, `button` vs `a` for actions vs navigation.

## Consistency Checklist

- [ ] Clear aesthetic direction (tone, differentiation) for the screen or component
- [ ] Navigation uses `Link` + `buttonVariants` (not Button asChild with Link) for in-app routes
- [ ] Colors use theme tokens (e.g. `text-primary-foreground` on primary buttons), not hardcoded light/dark colors
- [ ] New UI uses existing components from `inertia/components/ui/` before adding new primitives
- [ ] Forms use shared Input/Label/Button patterns and show server/validation errors
- [ ] Dark mode remains readable (contrast) without extra overrides
- [ ] Typography and motion match the chosen direction (restraint vs. elaboration)
