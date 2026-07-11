# gmaps2amaps

**MapShift** converts Google Maps place and directions links into Apple Maps links.
It runs entirely in the browser and does not require an API key.

## Features

- Google Maps place, search, and coordinate links
- Google Maps directions with origin, destination, and ordered waypoints
- Driving, walking, public transport, and cycling modes
- Apple Maps unified URLs with multi-stop route support
- Legacy Apple Maps fallback links for older devices
- Copy, open, and native share actions
- Responsive, accessible interface with no runtime dependencies

## Supported links

```text
https://www.google.com/maps/search/?api=1&query=...
https://www.google.com/maps/place/...
https://www.google.com/maps/dir/?api=1&origin=...&destination=...
https://www.google.com/maps/dir/Origin/Destination/...
```

Google's shortened `maps.app.goo.gl` links cannot be expanded safely in a
browser-only app because the redirect is cross-origin. Open a short link once
and copy the resulting full `google.com/maps` URL.

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Run all checks:

```bash
npm run check
```

## Privacy

MapShift parses links locally. It does not send map URLs, searches, or route
details to a server.

## Mapping URL references

- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Apple unified Maps URLs](https://developer.apple.com/documentation/mapkit/unified-map-urls)
- [Legacy Apple Map Links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html)
