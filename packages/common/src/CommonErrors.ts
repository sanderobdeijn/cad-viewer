/**
 * @fileoverview Standard error definitions for the AutoCAD Common library.
 *
 * This module provides a centralized collection of commonly used error types
 * with descriptive messages for consistent error handling across the library.
 *
 * @module CommonErrors
 * @version 1.0.0
 */

/**
 * Collection of standard error types used throughout the AutoCAD Common library.
 *
 * Each error getter returns a new instance of the error to prevent shared state issues.
 * Use these predefined errors for consistent error handling and messaging.
 *
 * @example
 * ```typescript
 * import { CommonErrors } from './CommonErrors'
 *
 * // Throw standard errors
 * throw CommonErrors.ILLEGAL_PARAMETERS
 * throw CommonErrors.NOT_IMPLEMENTED
 *
 * // Check error types
 * try {
 *   // some operation
 * } catch (error) {
 *   if (error.message === CommonErrors.ZERO_DIVISION.message) {
 *     // handle division by zero
 *   }
 * }
 * ```
 */
export const CommonErrors = {
  /**
   * Throw error ILLEGAL_PARAMETERS when cannot instantiate from given parameter
   */
  get ILLEGAL_PARAMETERS() {
    return new ReferenceError('Illegal Parameters')
  },

  /**
   * Throw error ZERO_DIVISION to catch situation of zero division
   */
  get ZERO_DIVISION() {
    return new Error('Zero division')
  },

  /**
   * Error to throw from BooleanOperations module in case when fixBoundaryConflicts not capable to fix it
   */
  get UNRESOLVED_BOUNDARY_CONFLICT() {
    return new Error('Unresolved boundary conflict in boolean operation')
  },

  /**
   * Error to throw from LinkedList:testInfiniteLoop static method
   * in case when circular loop detected in linked list
   */
  get INFINITE_LOOP() {
    return new Error('Infinite loop')
  },

  get CANNOT_INVOKE_ABSTRACT_METHOD() {
    return new Error('Abstract method cannot be invoked')
  },

  get OPERATION_IS_NOT_SUPPORTED() {
    return new Error('Operation is not supported')
  },

  get NOT_IMPLEMENTED() {
    return new Error('Not implemented yet')
  }
}
