# OmniAssist Architecture & Implementation (v4.6.20)

## Core Technology Stack
- **Engine**: TypeScript (GuideEngine) - Event-driven observer pattern.
- **UI**: React 18 + Lucide Icons + Material UI (High-fidelity matching).
- **Communication**: Custom UMD SDK with high-frequency DOM polling (600ms).
- **Perception**: Hybrid heuristic matching (Text + ARIA + ID + Name + Semantic Tags).
- **Resilient Text Matching (v4.6.23)**: Advanced normalization that strips asterisks, colons, and non-breaking spaces, ensuring `text=Country` matches `Country *`.

## Key Implementation Patterns

### 1. Reliable Event-Driven State
Instead of standard React callbacks which suffer from stale closures in complex SPAs, v4.6.20 uses a **Multi-Subscriber Listener Model**. 
- The `GuideEngine` maintains a single source of truth.
- The UI (`App.tsx`) subscribes to state changes and re-renders reactively.
- **Benefit**: Ensures the "Assistant in Control" panel and the "Scanning" state are always in sync with the underlying automation loop.

### 2. Ultra-Robust Interaction (The 5-Step Click)
To bypass event-trap mechanisms in modern UI libraries like Material UI, the engine dispatches a sequence of events for a single 'click':
1. `focus()`
2. `PointerDown`
3. `MouseDown`
4. `MouseUp`
5. `PointerUp`
6. `click()`
This ensures that internal React state changes (like navigation) are triggered as if a physical user interacted with the element.

### 3. Bulletproof Navigation Fallback & SPA Sync
SPA navigation can be fragile. v4.6.11 implements two layers of sync:
- **Navigation Fallback**: If the URL remains unchanged after a click, it forces a redirect using `window.location.assign`.
- **SPA Double-Scan**: Patching `pushState` is not always enough for slow renders. v4.6.11 triggers discovery immediately AND again after 500ms to guarantee Suggested Actions are fresh for the target page.

### 4. Interactive Automation (Fill-Mode Highlights)
To maintain user trust, v4.6.11 enables **Visual Tracking** during automated fills. 
- The engine highlights the current target element (`globalHighlighter.targetElement`) before each action in the automation loop.
- This allows the user to see the "action update" directly on the main page while the assistant is in control.

### 5. Schema-Driven Interaction (Website-Agnostic)
v4.6.20 introduces a structural shift to move all interaction logic into the configuration layer:
- **`triggerQuery`**: Allows re-targeting clicks from descriptive labels to functional triggers (e.g., MUI select buttons).
- **`menuQuery`**: Defines the boundary for option discovery, preventing "hallucinations" from unrelated page content.
- **`itemQuery`**: Configures how to identify selectable options within a menu portal.
- **Agnostic Defaults**: The engine defaults to ARIA standards (`role="button"`, `role="listbox"`, `role="option"`) when specific queries are missing.

### 6. Smart Container Highlighting
The Perception engine doesn't just highlight the input box; it uses `.closest()` to find logical containers:
- `.MuiTextField-root`: Includes the label, placeholder, and icons.
- `.MuiButton-root`: For consistent button highlighting.
- This creates a "Premium Blue" sticky highlight (`#1976d2`) that feels integrated into the vendor site.

## Maintenance Notes
- **Schema**: Located in `src/schema.ts`. Use `anchorPath` for robust navigation.
- **Polling**: Managed in `App.tsx` via `triggerDiscovery`. High-frequency (600ms) during proposals to ensure sticky highlight stability.
- **Persistence**: Managed in `src/persistence.ts` to restore guide progress after page refreshes.
- **Backup**: v4.6.19 source is backed up in `src_backup_v4.6.19/`.
