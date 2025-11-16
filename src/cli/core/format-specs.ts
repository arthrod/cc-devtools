/**
 * Format specification helpers for validation error messages
 * Provides TypeScript-like format descriptions for expected inputs
 */

/**
 * Format a validation error with expected format specification
 */
export function formatValidationError(
	message: string,
	formatSpec: string,
	additionalContext?: string
): string {
	let error = message;

	error += '\n\nExpected format:\n' + formatSpec;

	if (additionalContext) {
		error += '\n\n' + additionalContext;
	}

	return error;
}
