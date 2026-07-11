export type TravelMode =
  | 'driving'
  | 'walking'
  | 'transit'
  | 'bicycling'
  | 'unknown'

export interface Coordinates {
  lat: number
  lng: number
}

export interface MapLocation {
  label: string
  coordinates?: Coordinates
}

export interface ConversionResult {
  kind: 'place' | 'route'
  title: string
  locations: MapLocation[]
  mode: TravelMode
  appleUrl: string
  legacyAppleUrl: string
  warnings: string[]
}

export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly hint?: string,
  ) {
    super(message)
    this.name = 'ConversionError'
  }
}

const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl'])

function decodePathPart(value: string): string {
  try {
    return decodeURIComponent(value).replace(/\+/g, ' ').trim()
  } catch {
    return value.replace(/\+/g, ' ').trim()
  }
}

function normaliseInput(input: string): URL {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new ConversionError(
      'Paste a Google Maps link to get started.',
      'Place links and direction links are both supported.',
    )
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new ConversionError(
      'That does not look like a valid URL.',
      'Copy the full link from Google Maps and try again.',
    )
  }

  const hostname = url.hostname.toLowerCase()
  if (SHORT_LINK_HOSTS.has(hostname)) {
    throw new ConversionError(
      'This is a shortened Google Maps link.',
      'Open it once, then copy the full google.com/maps URL from your browser.',
    )
  }

  const isGoogleMaps =
    /(^|\.)google\.[a-z.]+$/.test(hostname) &&
    (url.pathname.includes('/maps') || url.searchParams.has('q'))

  if (!isGoogleMaps) {
    throw new ConversionError(
      'This is not a supported Google Maps link.',
      'Use a full google.com/maps place or directions URL.',
    )
  }

  return url
}

function coordinatesFrom(value: string): Coordinates | undefined {
  const match = value.match(
    /(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
  )
  if (!match) return undefined

  const lat = Number(match[1])
  const lng = Number(match[2])
  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return undefined
  }

  return { lat, lng }
}

function preciseCoordinatesFromUrl(url: URL): Coordinates | undefined {
  const dataMatch = url.href.match(
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  )
  if (dataMatch) {
    return { lat: Number(dataMatch[1]), lng: Number(dataMatch[2]) }
  }

  const pathMatch = url.pathname.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  )
  if (pathMatch) {
    return { lat: Number(pathMatch[1]), lng: Number(pathMatch[2]) }
  }

  return undefined
}

function cleanLocation(value: string): string {
  return decodePathPart(value)
    .replace(/^(?:place_id:|via:)/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function locationFrom(value: string): MapLocation {
  const label = cleanLocation(value)
  return { label, coordinates: coordinatesFrom(label) }
}

function routeMode(url: URL): TravelMode {
  const queryMode = url.searchParams.get('travelmode')?.toLowerCase()
  if (
    queryMode === 'driving' ||
    queryMode === 'walking' ||
    queryMode === 'transit' ||
    queryMode === 'bicycling'
  ) {
    return queryMode
  }

  const dataMode = url.href.match(/!3e([0-3])(?:!|$)/)?.[1]
  return (
    {
      '0': 'driving',
      '1': 'bicycling',
      '2': 'walking',
      '3': 'transit',
    } as const
  )[dataMode ?? ''] ?? 'unknown'
}

function appleMode(mode: TravelMode): string | undefined {
  if (mode === 'bicycling') return 'cycling'
  return mode === 'unknown' ? undefined : mode
}

function legacyMode(mode: TravelMode): string | undefined {
  return (
    {
      driving: 'd',
      walking: 'w',
      transit: 'r',
      bicycling: undefined,
      unknown: undefined,
    } satisfies Record<TravelMode, string | undefined>
  )[mode]
}

function routeFromQuery(url: URL): MapLocation[] | undefined {
  const origin = url.searchParams.get('origin')
  const destination = url.searchParams.get('destination')
  if (!destination) return undefined

  const locations: MapLocation[] = [
    origin ? locationFrom(origin) : { label: 'Current Location' },
  ]
  const waypoints = url.searchParams.get('waypoints')
  if (waypoints) {
    locations.push(
      ...waypoints
        .split('|')
        .map(locationFrom)
        .filter((location) => location.label),
    )
  }
  locations.push(locationFrom(destination))
  return locations
}

function routeFromPath(url: URL): MapLocation[] | undefined {
  const segments = url.pathname.split('/')
  const directionIndex = segments.findIndex((segment) => segment === 'dir')
  if (directionIndex === -1) return undefined

  const routeSegments: string[] = []
  for (const segment of segments.slice(directionIndex + 1)) {
    if (segment.startsWith('@') || segment.startsWith('data=')) break
    routeSegments.push(segment)
  }

  while (routeSegments.at(-1) === '') routeSegments.pop()
  if (!routeSegments.length) return undefined

  const locations = routeSegments.map((segment, index) =>
    segment
      ? locationFrom(segment)
      : { label: index === 0 ? 'Current Location' : 'Unnamed stop' },
  )

  return locations.length === 1
    ? [{ label: 'Current Location' }, locations[0]]
    : locations
}

function buildRoute(
  url: URL,
  locations: MapLocation[],
): ConversionResult {
  if (locations.length < 2 || !locations.at(-1)?.label) {
    throw new ConversionError(
      'The route is missing a destination.',
      'Open the route in Google Maps, add a destination, and copy it again.',
    )
  }

  const mode = routeMode(url)
  const source = locations[0]
  const destination = locations.at(-1)!
  const waypoints = locations.slice(1, -1)
  const apple = new URL('https://maps.apple.com/directions')

  if (source.label !== 'Current Location') {
    apple.searchParams.set('source', source.label)
  }
  apple.searchParams.set('destination', destination.label)
  for (const waypoint of waypoints) {
    apple.searchParams.append('waypoint', waypoint.label)
  }
  const unifiedMode = appleMode(mode)
  if (unifiedMode) apple.searchParams.set('mode', unifiedMode)

  const legacy = new URL('https://maps.apple.com/')
  if (source.label !== 'Current Location') {
    legacy.searchParams.set('saddr', source.label)
  }
  legacy.searchParams.set('daddr', destination.label)
  const fallbackMode = legacyMode(mode)
  if (fallbackMode) legacy.searchParams.set('dirflg', fallbackMode)

  const warnings: string[] = []
  if (waypoints.length) {
    warnings.push(
      `${waypoints.length} waypoint${waypoints.length === 1 ? '' : 's'} preserved with Apple’s modern multi-stop route format.`,
    )
  }
  if (mode === 'bicycling') {
    warnings.push(
      'Cycling availability in Apple Maps varies by region and device version.',
    )
  }
  if (locations.some((location) => location.label.startsWith('ChIJ'))) {
    warnings.push(
      'One or more stops only contain a Google Place ID and may need to be reselected.',
    )
  }

  return {
    kind: 'route',
    title: `${source.label} to ${destination.label}`,
    locations,
    mode,
    appleUrl: apple.toString(),
    legacyAppleUrl: legacy.toString(),
    warnings,
  }
}

function buildPlace(url: URL): ConversionResult {
  const segments = url.pathname.split('/').filter(Boolean)
  const placeIndex = segments.findIndex(
    (segment) => segment === 'place' || segment === 'search',
  )
  const query =
    url.searchParams.get('query') ??
    url.searchParams.get('q') ??
    (placeIndex >= 0 ? segments[placeIndex + 1] : undefined)
  const coordinates =
    (query ? coordinatesFrom(query) : undefined) ??
    preciseCoordinatesFromUrl(url)
  const rawLabel = query ? cleanLocation(query) : ''
  const label =
    rawLabel ||
    (coordinates ? `${coordinates.lat},${coordinates.lng}` : '')

  if (!label) {
    throw new ConversionError(
      'I could not find a place in this link.',
      'Try Google Maps’ Share button and copy the full place URL.',
    )
  }

  if (label.startsWith('place_id:') || label.startsWith('ChIJ')) {
    throw new ConversionError(
      'This link only contains a Google Place ID.',
      'Copy a link that also includes the place name or address.',
    )
  }

  const apple = new URL('https://maps.apple.com/search')
  apple.searchParams.set('query', label)
  if (coordinates) {
    apple.searchParams.set(
      'center',
      `${coordinates.lat},${coordinates.lng}`,
    )
  }

  const legacy = new URL('https://maps.apple.com/')
  legacy.searchParams.set('q', label)
  if (coordinates) {
    legacy.searchParams.set('ll', `${coordinates.lat},${coordinates.lng}`)
  }

  return {
    kind: 'place',
    title: label,
    locations: [{ label, coordinates }],
    mode: 'unknown',
    appleUrl: apple.toString(),
    legacyAppleUrl: legacy.toString(),
    warnings: [],
  }
}

export function convertGoogleMapsUrl(input: string): ConversionResult {
  const url = normaliseInput(input)
  const locations = routeFromQuery(url) ?? routeFromPath(url)
  return locations ? buildRoute(url, locations) : buildPlace(url)
}
