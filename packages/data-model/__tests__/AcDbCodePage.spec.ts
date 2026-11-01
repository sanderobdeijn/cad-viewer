
import {
  AcDbCodePage,
  acdbDwgCodePageToEncoding,
  acdbNormalizeTextEncoding
} from '../src/misc'

describe('AcDbCodePage', () => {
  it('maps Korean code pages onto the WHATWG euc-kr label', () => {
    expect(acdbDwgCodePageToEncoding(AcDbCodePage.CP949)).toBe('euc-kr')
    expect(acdbDwgCodePageToEncoding(AcDbCodePage.ANSI_949)).toBe('euc-kr')
  })

  it('normalizes common Korean/Chinese code page aliases for TextDecoder', () => {
    expect(acdbNormalizeTextEncoding('cp949')).toBe('euc-kr')
    expect(acdbNormalizeTextEncoding('CP949')).toBe('euc-kr')
    expect(acdbNormalizeTextEncoding('uhc')).toBe('euc-kr')
    expect(acdbNormalizeTextEncoding('cp936')).toBe('gbk')
    // Underscore / mixed-case forms of known labels normalize too.
    expect(acdbNormalizeTextEncoding('euc-kr')).toBe('euc-kr')
    expect(acdbNormalizeTextEncoding('EUC_KR')).toBe('euc-kr')
    expect(acdbNormalizeTextEncoding('windows-949')).toBe('euc-kr')
    // Unrelated supported labels pass through unchanged.
    expect(acdbNormalizeTextEncoding('windows-1252')).toBe('windows-1252')
    expect(acdbNormalizeTextEncoding('utf-8')).toBe('utf-8')
  })
})
