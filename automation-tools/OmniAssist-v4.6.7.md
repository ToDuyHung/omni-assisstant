# OmniAssist Architecture & Implementation (v4.6.7)

## Core Technology Stack
- **Engine**: TypeScript (GuideEngine) - Event-driven observer pattern.
- **UI**: React 18 + Lucide Icons + Material UI (High-fidelity matching).
- **Communication**: Custom UMD SDK with high-frequency DOM polling (600ms).
- **Perception**: Hybrid heuristic matching (Text + ARIA + ID + Name + Semantic Tags).

## Key Implementation Patterns

### 1. Reliable Event-Driven State
Instead of standard React callbacks which suffer from stale closures in complex SPAs, v4.6.7 uses a **Multi-Subscriber Listener Model**. 
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

### 3. Bulletproof Navigation Fallback
SPA navigation can be fragile. v4.6.7 implements a guarded timeout logic:
- If a step is marked `isNavigation: true`, the engine captures the current URL.
- It clicks the target and waits for ~2100ms.
- If the URL remains unchanged, it forces a redirect using `window.location.assign(anchorPath)`.
- **State Guard**: It explicitly sets `status: 'idle'` before redirecting to prevent UI hangs on the new page.

### 4. Smart Container Highlighting
The Perception engine doesn't just highlight the input box; it uses `.closest()` to find logical containers:
- `.MuiTextField-root`: Includes the label, placeholder, and icons (like Search magnifying glass).
- `.MuiButton-root`: For consistent button highlighting.
- This creates a "Premium Blue" sticky highlight (`#1976d2`) that feels integrated into the vendor site.

## Maintenance Notes
- **Schema**: Located in `src/schema.ts`. Use `anchorPath` for robust navigation.
- **Polling**: Managed in `App.tsx` via `triggerDiscovery`. High-frequency (600ms) during proposals to ensure sticky highlight stability.
- **Persistence**: Managed in `src/persistence.ts` to restore guide progress after page refreshes.
