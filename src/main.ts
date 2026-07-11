import './style.css'
import {
  ConversionError,
  type ConversionResult,
  convertGoogleMapsUrl,
} from './converter'

const icons = {
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>`,
  external: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-9 9"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  route: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/></svg>`,
  share: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>`,
}

const samples = {
  place:
    'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2922926,17z/data=!4m6!3m5!1s0x0:0x0!8m2!3d48.8583701!4d2.2944813',
  route:
    'https://www.google.com/maps/dir/?api=1&origin=London&destination=Edinburgh&waypoints=Oxford%7CYork&travelmode=driving',
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="page-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="MapShift home">
        <span class="brand-mark">${icons.route}</span>
        <span>MapShift</span>
      </a>
      <span class="privacy-pill">${icons.lock} Runs in your browser</span>
    </header>

    <main>
      <section class="hero" aria-labelledby="hero-title">
        <div class="eyebrow"><span></span> Google Maps → Apple Maps</div>
        <h1 id="hero-title">Take your route<br/><em>with you.</em></h1>
        <p class="hero-copy">
          Turn Google Maps places and routes into Apple Maps links.
          No account, no tracking, no detours.
        </p>

        <div class="converter-card">
          <form id="converter-form" novalidate>
            <label for="maps-url">Paste a Google Maps link</label>
            <div class="input-row">
              <div class="input-wrap">
                <span class="input-icon">${icons.pin}</span>
                <input
                  id="maps-url"
                  name="maps-url"
                  type="url"
                  inputmode="url"
                  autocomplete="url"
                  placeholder="https://maps.google.com/..."
                  aria-describedby="input-help"
                />
                <button class="clear-button" id="clear-button" type="button" aria-label="Clear link">×</button>
              </div>
              <button class="convert-button" type="submit">
                <span>Convert</span>${icons.arrow}
              </button>
            </div>
            <div class="form-footer">
              <p id="input-help">Places, directions, and multi-stop routes</p>
              <div class="examples">
                Try:
                <button type="button" data-sample="place">a place</button>
                <span>or</span>
                <button type="button" data-sample="route">a route</button>
              </div>
            </div>
          </form>

          <div id="message" class="message" role="alert" aria-live="polite"></div>
          <section id="result" class="result" aria-live="polite"></section>
        </div>

        <div class="trust-row" aria-label="Product benefits">
          <div><span>${icons.check}</span> Free to use</div>
          <div><span>${icons.check}</span> Nothing uploaded</div>
          <div><span>${icons.check}</span> Multi-stop ready</div>
        </div>
      </section>

      <section class="how-it-works" aria-labelledby="how-title">
        <div>
          <p class="section-kicker">Simple by design</p>
          <h2 id="how-title">One link in.<br/>One tap out.</h2>
        </div>
        <div class="steps">
          <article>
            <span>01</span>
            <h3>Copy</h3>
            <p>Use Share in Google Maps and copy the full place or route link.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Convert</h3>
            <p>MapShift reads the destination, stops, and travel mode locally.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Go</h3>
            <p>Open the result in Apple Maps, or copy and share it anywhere.</p>
          </article>
        </div>
      </section>
    </main>

    <footer>
      <a class="brand footer-brand" href="/">
        <span class="brand-mark">${icons.route}</span>
        <span>MapShift</span>
      </a>
      <p>Built for people who use both maps.</p>
      <p class="disclaimer">Not affiliated with Google or Apple.</p>
    </footer>
  </div>
`

const form = document.querySelector<HTMLFormElement>('#converter-form')!
const input = document.querySelector<HTMLInputElement>('#maps-url')!
const result = document.querySelector<HTMLElement>('#result')!
const message = document.querySelector<HTMLElement>('#message')!
const clearButton = document.querySelector<HTMLButtonElement>('#clear-button')!

function escapeHtml(value: string): string {
  const element = document.createElement('div')
  element.textContent = value
  return element.innerHTML
}

function modeLabel(converted: ConversionResult): string {
  if (converted.kind === 'place') return 'Place'
  if (converted.mode === 'unknown') return 'Route'
  return converted.mode[0].toUpperCase() + converted.mode.slice(1)
}

function routeStops(converted: ConversionResult): string {
  if (converted.kind === 'place') return ''

  return `
    <ol class="route-stops">
      ${converted.locations
        .map(
          (location, index) => `
            <li>
              <span class="stop-marker ${index === converted.locations.length - 1 ? 'destination' : ''}"></span>
              <div>
                <small>${index === 0 ? 'Start' : index === converted.locations.length - 1 ? 'Destination' : `Stop ${index}`}</small>
                <strong>${escapeHtml(location.label)}</strong>
              </div>
            </li>
          `,
        )
        .join('')}
    </ol>
  `
}

function renderResult(converted: ConversionResult): void {
  message.className = 'message'
  message.innerHTML = ''
  const isRoute = converted.kind === 'route'

  result.innerHTML = `
    <div class="result-heading">
      <span class="result-icon">${isRoute ? icons.route : icons.pin}</span>
      <div>
        <span class="result-type">${modeLabel(converted)}</span>
        <h2>${escapeHtml(converted.title)}</h2>
      </div>
    </div>

    ${routeStops(converted)}

    ${
      converted.warnings.length
        ? `<div class="notice">${converted.warnings.map(escapeHtml).join('<br/>')}</div>`
        : ''
    }

    <div class="result-actions">
      <a class="apple-button" href="${escapeHtml(converted.appleUrl)}" target="_blank" rel="noreferrer">
        Open in Apple Maps ${icons.external}
      </a>
      <button class="action-button" id="copy-result" type="button">
        ${icons.copy}<span>Copy link</span>
      </button>
      <button class="action-button" id="share-result" type="button">
        ${icons.share}<span>Share</span>
      </button>
    </div>
    <details>
      <summary>Need a link for an older Apple device?</summary>
      <div class="fallback-row">
        <code>${escapeHtml(converted.legacyAppleUrl)}</code>
        <button id="copy-fallback" type="button">Copy fallback</button>
      </div>
    </details>
  `
  result.classList.add('visible')

  document
    .querySelector<HTMLButtonElement>('#copy-result')!
    .addEventListener('click', (event) =>
      copyLink(converted.appleUrl, event.currentTarget as HTMLButtonElement),
    )
  document
    .querySelector<HTMLButtonElement>('#copy-fallback')!
    .addEventListener('click', (event) =>
      copyLink(
        converted.legacyAppleUrl,
        event.currentTarget as HTMLButtonElement,
      ),
    )
  document
    .querySelector<HTMLButtonElement>('#share-result')!
    .addEventListener('click', async () => {
      if (navigator.share) {
        await navigator.share({
          title: converted.title,
          text: `Open ${converted.title} in Apple Maps`,
          url: converted.appleUrl,
        })
      } else {
        await navigator.clipboard.writeText(converted.appleUrl)
        showMessage('Sharing is unavailable here, so the link was copied.', false)
      }
    })
}

async function copyLink(url: string, button: HTMLButtonElement): Promise<void> {
  await navigator.clipboard.writeText(url)
  const label = button.querySelector('span')
  const previous = label?.textContent
  if (label) label.textContent = 'Copied'
  button.classList.add('copied')
  window.setTimeout(() => {
    if (label && previous) label.textContent = previous
    button.classList.remove('copied')
  }, 1600)
}

function showMessage(text: string, isError = true, hint?: string): void {
  result.classList.remove('visible')
  result.innerHTML = ''
  message.className = `message visible ${isError ? 'error' : 'success'}`
  message.innerHTML = `<strong>${escapeHtml(text)}</strong>${hint ? `<span>${escapeHtml(hint)}</span>` : ''}`
}

function convert(): void {
  try {
    renderResult(convertGoogleMapsUrl(input.value))
    input.setAttribute('aria-invalid', 'false')
  } catch (error) {
    input.setAttribute('aria-invalid', 'true')
    if (error instanceof ConversionError) {
      showMessage(error.message, true, error.hint)
    } else {
      showMessage('Something went wrong while reading that link.')
    }
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault()
  convert()
})

input.addEventListener('input', () => {
  clearButton.classList.toggle('visible', Boolean(input.value))
  input.setAttribute('aria-invalid', 'false')
  if (message.classList.contains('visible')) {
    message.className = 'message'
    message.innerHTML = ''
  }
})

input.addEventListener('paste', () => {
  window.setTimeout(convert, 0)
})

clearButton.addEventListener('click', () => {
  input.value = ''
  clearButton.classList.remove('visible')
  message.className = 'message'
  message.innerHTML = ''
  result.classList.remove('visible')
  result.innerHTML = ''
  input.focus()
})

document.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => {
    const sample = button.dataset.sample as keyof typeof samples
    input.value = samples[sample]
    clearButton.classList.add('visible')
    convert()
  })
})
