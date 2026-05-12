# Design System Document: The Stoic Oversight Framework

## 1. Overview & Creative North Star: "The Clinical Authority"
This design system moves away from the cluttered, high-stress interfaces typical of legacy judicial software. Our Creative North Star is **"The Clinical Authority."** It represents an environment of absolute calm, surgical precision, and unshakeable order. 

To break the "template" look, we leverage **Intentional Asymmetry**. While the left sidebar remains a fixed anchor of stability, the main content area utilizes a "layered-leaf" approach—where information isn't just placed in a grid, but organized in cascading depths. This reflects the weight of judicial decisions: high-level oversight lives on elevated surfaces, while granular logs recede into the background.

## 2. Colors: Tonal Depth vs. Structural Lines
The palette is rooted in a "Sober Green" and "Paper White" foundation, designed to reduce cognitive load during long shifts.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. In this system, boundaries are defined exclusively through background shifts.é
- A card should never have a stroke; it should be a `surface-container-lowest` object sitting on a `surface-container-low` background. 
- Separation is achieved through the **Spacing Scale** (e.g., a `20` (4.5rem) gap) rather than a line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers of heavy, premium cardstock.
- **Base Layer:** `surface` (#f8faf9) – The desk on which everything sits.
- **Sectioning:** `surface-container-low` (#f2f4f3) – Large regions of data.
- **Actionable Cards:** `surface-container-lowest` (#ffffff) – The highest points of focus for interaction.
- **Nesting:** When a modal or detail view opens, use `surface-container-high` (#e6e9e8) to create a visual "recess" or "overlay" effect that feels integrated.

### The "Glass & Gradient" Rule
To avoid a flat, "cheap" feel, use **Glassmorphism** for the fixed left sidebar. Use a semi-transparent `primary` (#17362e) with a `backdrop-blur` of 20px. 
- **Signature Textures:** For high-priority CTAs or summary banners, use a subtle linear gradient from `primary` (#17362e) to `primary_container` (#2e4d44) at a 135-degree angle. This adds a "weighted" feel to critical judicial actions.

## 3. Typography: The Editorial Voice
We pair **Manrope** (Display/Headline) with **Inter** (Body) to balance institutional authority with modern readability.

- **Display & Headlines (Manrope):** These are the "Commanding Voices." Use `display-md` for prisoner names or case IDs to give them immediate prominence.
- **Body & Labels (Inter):** These are the "Data Voices." They are optimized for rapid scanning.
- **Hierarchy Logic:** Use `on_surface_variant` (#414845) for secondary metadata (dates, timestamps) to create a clear "read-first, scan-second" flow. 

## 4. Elevation & Depth: Tonal Layering
We eschew traditional drop shadows in favor of **Ambient Shadows** and **Tonal Lift**.

- **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card on a `surface` background creates a natural 2dp-equivalent lift without a single pixel of shadow.
- **Ambient Shadows:** Only use shadows for floating elements like Tooltips or Context Menus. Use a 24px blur at 6% opacity, tinted with the `primary` color (#17362e) rather than pure black. This makes the shadow feel like a natural reflection of the room's lighting.
- **The "Ghost Border" Fallback:** If a border is required for high-density data tables where background shifts fail, use `outline_variant` (#c1c8c4) at **15% opacity**. It should be felt, not seen.

## 5. Components: Precision Primitives

### Buttons & CTAs
- **Primary:** Gradient-filled (`primary` to `primary_container`), `rounded-md` (0.375rem). No shadow.
- **Secondary/Ghost:** `on_surface` text with no background. On hover, transition to a `surface_container_high` background.

### Input Fields & Search
- **The "Silent" Input:** Fields should have no border. They are defined by a `surface_container_highest` (#e1e3e2) background and a `rounded-sm` (0.125rem) corner. On focus, a 2px bottom-bar of `primary` green appears.

### Cards & Lists (Judicial Logs)
- **Rule:** Absolute prohibition of divider lines. 
- **Execution:** Use vertical spacing of `spacing.4` (0.9rem) between log entries. Use `surface_container_low` for the list container and `surface_container_lowest` for the individual item cards.

### Status Indicators (The "Compliance Pulse")
- **Compliant (Green):** `primary_fixed` (#c7eade) background with `on_primary_fixed_variant` (#2e4d44) text.
- **Alert (Red):** `error_container` (#ffdad6) background with `on_error_container` (#93000a) text.
- **Inactive (Grey):** `secondary_container` (#d3e3de) background with `on_secondary_container` (#576662) text.

### Additional Signature Component: "The Summary Ribbon"
A full-width `surface_container_lowest` bar that sits at the top of the main content. It uses `display-sm` typography to show a "Decision Pulse" (e.g., "3 Pending Reviews | 1 Alert"). This acts as the officer's immediate "Next Step" guide.

## 6. Do’s and Don’ts

### Do:
- **Do** use whitespace as a functional tool. If two elements feel cluttered, increase the spacing scale rather than adding a line.
- **Do** use `rounded-lg` (0.5rem) for main containers and `rounded-sm` (0.125rem) for internal elements like buttons to create a "nested" visual language.
- **Do** ensure all text on `primary` backgrounds uses `on_primary` (#ffffff) for AA-level accessibility.

### Don’t:
- **Don’t** use 100% opaque black for text. Always use `on_surface` (#191c1c) to keep the "Paper" aesthetic soft on the eyes.
- **Don’t** use standard Material Design "elevated" cards with heavy shadows. This creates "visual noise" that distracts a prison officer in high-stakes moments.
- **Don’t** use icons as the primary means of communication. Always pair icons with `label-md` text to ensure zero ambiguity in judicial supervision.