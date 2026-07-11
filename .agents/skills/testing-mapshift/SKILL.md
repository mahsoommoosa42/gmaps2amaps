---
name: testing-mapshift
description: Test MapShift place, route, error, clipboard, and responsive flows end-to-end in a browser.
---

# Testing MapShift

## Devin Secrets Needed

None.

## Setup

1. Install dependencies with `npm install`.
2. Start the app with `npm run dev -- --host 0.0.0.0`.
3. Open `http://localhost:5173`.
4. If exposing Vite through a tunnel, restart it with the tunnel host:
   `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=<tunnel-host> npm run dev -- --host 0.0.0.0`.

## Core browser checks

1. Click `a place`.
   - Expect `Place` and `Eiffel Tower`.
   - Expect the generated Apple URL to use `/search`, `query=Eiffel Tower`,
     and `center=48.8583701,2.2944813`.
2. Click `a route`.
   - Expect `Driving` and `London to Edinburgh`.
   - Expect London, Oxford, York, and Edinburgh in that order.
   - Expect two waypoints and a `/directions` Apple URL with driving mode.
3. Click `Copy link`, then paste into the URL input to verify the clipboard.
   - The pasted Apple URL should contain `source=London`,
     `waypoint=Oxford`, `waypoint=York`, `destination=Edinburgh`, and
     `mode=driving`.
   - Pasting into MapShift immediately triggers conversion and therefore shows
     the expected unsupported-Google-link error; click `a route` to restore the
     route result.
4. Enter `https://maps.app.goo.gl/example`.
   - Expect the shortened-link error and the instruction to copy a full
     `google.com/maps` URL.
5. Resize the browser below the 620px CSS breakpoint; 390px is a useful target.
   - Expect the input and Convert button to stack.
   - Expect the Apple action to span the row above Copy and Share.
   - Expect no horizontal overflow.

## Browser notes

- In Chrome for Testing, opening the Apple Maps action might reuse the current
  tab. Use browser Back to return; closing the tab can close the only browser
  window.
- The `Copied` label lasts 1.6 seconds, which can disappear before a delayed
  screenshot. Pasting the clipboard value provides durable evidence.
