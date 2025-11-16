import type { Suggestion } from './types.js';

/**
 * Calculate Levenshtein distance between two strings
 * Used for finding similar command/option names when user makes typos
 */
function levenshteinDistance(a: string, b: string): number {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	const matrix: number[][] = [];

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				);
			}
		}
	}

	return matrix[b.length][a.length];
}

/**
 * Find the closest matching string from a list of candidates
 * Returns null if no reasonable match is found
 */
export function findClosestMatch(
	input: string,
	candidates: string[],
	options: {
		maxDistance?: number;
		caseSensitive?: boolean;
	} = {}
): Suggestion | null {
	const { maxDistance = 3, caseSensitive = false } = options;

	const normalizedInput = caseSensitive ? input : input.toLowerCase();

	let bestMatch: Suggestion | null = null;

	for (const candidate of candidates) {
		const normalizedCandidate = caseSensitive ? candidate : candidate.toLowerCase();
		const distance = levenshteinDistance(normalizedInput, normalizedCandidate);

		if (distance <= maxDistance) {
			if (!bestMatch || distance < bestMatch.distance) {
				let confidence: 'high' | 'medium' | 'low';
				if (distance === 1) {
					confidence = 'high';
				} else if (distance === 2) {
					confidence = 'medium';
				} else {
					confidence = 'low';
				}

				bestMatch = {
					match: candidate,
					distance,
					confidence,
				};
			}
		}
	}

	return bestMatch;
}

/**
 * Format a suggestion message for CLI output
 */
export function formatSuggestion(suggestion: Suggestion | null): string {
	if (!suggestion) {
		return '';
	}

	let message = `\n\nDid you mean '${suggestion.match}'?`;

	if (suggestion.confidence === 'low') {
		message += ' (low confidence match)';
	}

	return message;
}

/**
 * Format error message with suggestions and available options
 */
export function formatErrorWithSuggestions(
	input: string,
	candidates: string[],
	context: {
		type: 'command' | 'subcommand' | 'flag' | 'feature' | 'value';
		helpCommand?: string;
		additionalInfo?: string;
	}
): string {
	const suggestion = findClosestMatch(input, candidates);

	let message = `Unknown ${context.type}: '${input}'`;

	message += formatSuggestion(suggestion);

	if (!suggestion && candidates.length <= 10) {
		message += `\n\nAvailable ${context.type}s: ${candidates.join(', ')}`;
	}

	if (context.helpCommand) {
		message += `\n\nRun '${context.helpCommand}' for more information.`;
	}

	if (context.additionalInfo) {
		message += `\n\n${context.additionalInfo}`;
	}

	return message;
}
