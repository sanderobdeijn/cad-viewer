/**
 * @jest-environment jsdom
 */
import {
  ACAP_DEFAULT_DOCS_BASE_URL,
  ACAP_DOCS_PATH_MAGNIFIER,
  acapDocsUrl,
  acapGetDocsBaseUrl,
  acapSetDocsBaseUrl,
  normalizeDocsBaseUrl
} from '../src/app/AcApDocsUrl'

describe('acapDocsUrl', () => {
  afterEach(() => {
    acapSetDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)
  })

  it('builds URLs under the docs root', () => {
    expect(acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER)).toBe(
      `${normalizeDocsBaseUrl(ACAP_DEFAULT_DOCS_BASE_URL)}/guide/magnifier.html`
    )
  })

  it('respects a configured docs base URL', () => {
    acapSetDocsBaseUrl('https://example.com/help/')
    expect(acapGetDocsBaseUrl()).toBe('https://example.com/help')
    expect(acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER)).toBe(
      'https://example.com/help/guide/magnifier.html'
    )
  })
})
