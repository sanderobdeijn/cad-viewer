/**
 * @jest-environment jsdom
 */
import {
  APPLICATION_DEFAULT_DOCS_BASE_URL,
  APPLICATION_DOCS_PATH_MAGNIFIER,
  applicationDocsUrl,
  applicationGetDocsBaseUrl,
  applicationSetDocsBaseUrl,
  normalizeDocsBaseUrl
} from '../src/app/ApplicationDocsUrl'

describe('applicationDocsUrl', () => {
  afterEach(() => {
    applicationSetDocsBaseUrl(APPLICATION_DEFAULT_DOCS_BASE_URL)
  })

  it('builds URLs under the docs root', () => {
    expect(applicationDocsUrl(APPLICATION_DOCS_PATH_MAGNIFIER)).toBe(
      `${normalizeDocsBaseUrl(APPLICATION_DEFAULT_DOCS_BASE_URL)}/guide/magnifier.html`
    )
  })

  it('respects a configured docs base URL', () => {
    applicationSetDocsBaseUrl('https://example.com/help/')
    expect(applicationGetDocsBaseUrl()).toBe('https://example.com/help')
    expect(applicationDocsUrl(APPLICATION_DOCS_PATH_MAGNIFIER)).toBe(
      'https://example.com/help/guide/magnifier.html'
    )
  })
})
