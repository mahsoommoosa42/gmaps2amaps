import { describe, expect, it } from 'vitest'
import { ConversionError, convertGoogleMapsUrl } from './converter'

describe('convertGoogleMapsUrl', () => {
  it('converts a search URL into an Apple Maps place search', () => {
    const result = convertGoogleMapsUrl(
      'https://www.google.com/maps/search/?api=1&query=Natural+History+Museum%2C+London',
    )

    expect(result.kind).toBe('place')
    expect(result.title).toBe('Natural History Museum, London')
    expect(result.appleUrl).toBe(
      'https://maps.apple.com/search?query=Natural+History+Museum%2C+London',
    )
  })

  it('keeps precise place coordinates when present', () => {
    const result = convertGoogleMapsUrl(
      'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2922926,17z/data=!4m6!3m5!1s0x0:0x0!8m2!3d48.8583701!4d2.2944813',
    )

    expect(result.locations[0].coordinates).toEqual({
      lat: 48.8583701,
      lng: 2.2944813,
    })
    expect(result.appleUrl).toContain('center=48.8583701%2C2.2944813')
  })

  it('converts directions and preserves waypoints', () => {
    const result = convertGoogleMapsUrl(
      'https://www.google.com/maps/dir/?api=1&origin=London&destination=Edinburgh&waypoints=Oxford%7CYork&travelmode=driving',
    )
    const appleUrl = new URL(result.appleUrl)

    expect(result.kind).toBe('route')
    expect(result.locations.map(({ label }) => label)).toEqual([
      'London',
      'Oxford',
      'York',
      'Edinburgh',
    ])
    expect(appleUrl.pathname).toBe('/directions')
    expect(appleUrl.searchParams.getAll('waypoint')).toEqual([
      'Oxford',
      'York',
    ])
    expect(appleUrl.searchParams.get('mode')).toBe('driving')
  })

  it('converts path directions from the current location', () => {
    const result = convertGoogleMapsUrl(
      'https://www.google.com/maps/dir//Tower+Bridge,+London/@51.5,-0.1,12z/data=!4m2!4m1!3e2',
    )

    expect(result.locations.map(({ label }) => label)).toEqual([
      'Current Location',
      'Tower Bridge, London',
    ])
    expect(result.mode).toBe('walking')
    expect(new URL(result.appleUrl).searchParams.has('source')).toBe(false)
  })

  it('supports international Google domains', () => {
    const result = convertGoogleMapsUrl(
      'https://www.google.co.uk/maps/place/Buckingham+Palace',
    )
    expect(result.title).toBe('Buckingham Palace')
  })

  it('explains why shortened links need expanding', () => {
    expect(() =>
      convertGoogleMapsUrl('https://maps.app.goo.gl/example'),
    ).toThrowError(ConversionError)

    try {
      convertGoogleMapsUrl('https://maps.app.goo.gl/example')
    } catch (error) {
      expect((error as ConversionError).hint).toContain('full google.com/maps')
    }
  })

  it('rejects unrelated URLs', () => {
    expect(() =>
      convertGoogleMapsUrl('https://example.com/maps/place/London'),
    ).toThrow('not a supported Google Maps link')
  })
})
