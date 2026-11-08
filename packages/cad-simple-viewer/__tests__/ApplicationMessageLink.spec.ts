/** @jest-environment jsdom */

import {
  APPLICATION_DWG_PARSER_PRODUCT_URL,
  applicationAppendLinkedText,
  applicationEscapeHtml,
  applicationFormatMessageHtml,
  applicationMarkdownLink
} from '../src/util/ApplicationMessageLink'

describe('ApplicationMessageLink', () => {
  it('exports the commercial DWG parser product URL', () => {
    expect(APPLICATION_DWG_PARSER_PRODUCT_URL).toBe(
      'https://mlightcad.com/dwg-parser.html'
    )
  })

  it('escapes HTML special characters', () => {
    expect(applicationEscapeHtml('a <b> & "c"')).toBe(
      'a &lt;b&gt; &amp; &quot;c&quot;'
    )
  })

  it('builds a markdown link', () => {
    expect(applicationMarkdownLink('this page', APPLICATION_DWG_PARSER_PRODUCT_URL)).toBe(
      `[this page](${APPLICATION_DWG_PARSER_PRODUCT_URL})`
    )
  })

  it('formats markdown links as safe HTML anchors', () => {
    const html = applicationFormatMessageHtml(
      `Failed. Click [this page](${APPLICATION_DWG_PARSER_PRODUCT_URL}) to buy.`
    )
    expect(html).toBe(
      `Failed. Click <a href="${APPLICATION_DWG_PARSER_PRODUCT_URL}" target="_blank" rel="noopener noreferrer">this page</a> to buy.`
    )
  })

  it('escapes surrounding text when formatting HTML', () => {
    expect(applicationFormatMessageHtml('a <b> & c')).toBe('a &lt;b&gt; &amp; c')
  })

  it('escapes quotes in href when formatting HTML', () => {
    const html = applicationFormatMessageHtml(
      'Click [x](https://evil.example/"onclick="alert(1)) now.'
    )
    expect(html).toContain(
      'href="https://evil.example/&quot;onclick=&quot;alert(1"'
    )
    expect(html).not.toContain('href="https://evil.example/"onclick="')
  })

  it('appends linked text as DOM nodes', () => {
    const container = document.createElement('div')
    applicationAppendLinkedText(
      container,
      `Click [this page](${APPLICATION_DWG_PARSER_PRODUCT_URL}) now.`
    )
    expect(container.childNodes).toHaveLength(3)
    expect(container.childNodes[0].textContent).toBe('Click ')
    const anchor = container.childNodes[1] as HTMLAnchorElement
    expect(anchor.tagName).toBe('A')
    expect(anchor.href).toBe(APPLICATION_DWG_PARSER_PRODUCT_URL)
    expect(anchor.target).toBe('_blank')
    expect(anchor.rel).toBe('noopener noreferrer')
    expect(anchor.textContent).toBe('this page')
    expect(container.childNodes[2].textContent).toBe(' now.')
  })
})
