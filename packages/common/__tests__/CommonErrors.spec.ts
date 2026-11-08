import { CommonErrors } from '../src'

describe('CommonErrors', () => {
  it('returns typed errors with expected messages and fresh instances', () => {
    const illegal1 = CommonErrors.ILLEGAL_PARAMETERS
    const illegal2 = CommonErrors.ILLEGAL_PARAMETERS
    expect(illegal1).toBeInstanceOf(ReferenceError)
    expect(illegal1.message).toBe('Illegal Parameters')
    expect(illegal1).not.toBe(illegal2)

    expect(CommonErrors.ZERO_DIVISION.message).toBe('Zero division')
    expect(CommonErrors.UNRESOLVED_BOUNDARY_CONFLICT.message).toContain(
      'Unresolved boundary conflict'
    )
    expect(CommonErrors.INFINITE_LOOP.message).toBe('Infinite loop')
    expect(CommonErrors.CANNOT_INVOKE_ABSTRACT_METHOD.message).toBe(
      'Abstract method cannot be invoked'
    )
    expect(CommonErrors.OPERATION_IS_NOT_SUPPORTED.message).toBe(
      'Operation is not supported'
    )
    expect(CommonErrors.NOT_IMPLEMENTED.message).toBe('Not implemented yet')
  })
})
