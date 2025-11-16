import * as rlSync from 'readline';
import readline from 'readline/promises';

/**
 * Ask a yes/no question
 */
export async function confirm(question: string, defaultValue: boolean = true): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const suffix = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await rl.question(`${question} ${suffix}: `);
  rl.close();

  if (!answer.trim()) {
    return defaultValue;
  }

  return answer.toLowerCase().startsWith('y');
}

/**
 * Ask a question with multiple choices (interactive keyboard navigation)
 */
export async function multiSelect(
  question: string,
  choices: Array<{ name: string; value: string; description?: string }>,
  defaults: string[] = [],
  dependencies?: Record<string, string[]>  // Map of value -> required dependencies
): Promise<string[]> {
  return new Promise((resolve) => {
    const selected = new Set(defaults);
    let cursorPos = 0;
    let isFirstRender = true;

    // Clear screen and show initial state
    console.log(`\n${question}`);
    console.log('(Use ↑↓ arrows to navigate, Space to toggle, Enter to confirm)\n');

    const render = (): void => {
      // Move cursor up to redraw (skip on first render)
      if (!isFirstRender) {
        rlSync.moveCursor(process.stdout, 0, -(choices.length));
        rlSync.clearScreenDown(process.stdout);
      }
      isFirstRender = false;

      choices.forEach((choice, index) => {
        const isSelected = selected.has(choice.value);
        const checkbox = isSelected ? '[✓]' : '[ ]';
        const cursor = index === cursorPos ? '›' : ' ';
        const description = choice.description ? ` - ${choice.description}` : '';
        console.log(`  ${cursor} ${checkbox} ${choice.name}${description}`);
      });
    };

    render();

    // Setup raw mode for keyboard input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key: string): void => {
      // Handle Ctrl+C
      if (key === '\u0003') {
        cleanup();
        process.exit(0);
      }

      // Handle Enter
      if (key === '\r' || key === '\n') {
        cleanup();
        console.log(''); // Add newline after selection
        resolve(Array.from(selected));
        return;
      }

      // Handle Space (toggle)
      if (key === ' ') {
        const choice = choices[cursorPos];
        if (selected.has(choice.value)) {
          // Deselecting - remove this and any items that depend on it
          selected.delete(choice.value);

          if (dependencies) {
            // Remove items that depend on this choice
            for (const [dependent, deps] of Object.entries(dependencies)) {
              if (deps.includes(choice.value)) {
                selected.delete(dependent);
              }
            }
          }
        } else {
          // Selecting - add this and its dependencies
          selected.add(choice.value);

          if (dependencies?.[choice.value]) {
            // Auto-select dependencies
            for (const dep of dependencies[choice.value]) {
              selected.add(dep);
            }
          }
        }
        render();
        return;
      }

      // Handle arrow keys
      if (key === '\u001b[A') {
        // Up arrow
        cursorPos = cursorPos > 0 ? cursorPos - 1 : choices.length - 1;
        render();
      } else if (key === '\u001b[B') {
        // Down arrow
        cursorPos = cursorPos < choices.length - 1 ? cursorPos + 1 : 0;
        render();
      }
    };

    const cleanup = (): void => {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}

/**
 * Ask a simple text question
 */
export async function input(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = await rl.question(`${question}${suffix}: `);
  rl.close();

  const trimmedAnswer = answer.trim();
  return trimmedAnswer !== '' ? trimmedAnswer : (defaultValue ?? '');
}

/**
 * Ask user to select one item from a list (interactive keyboard navigation)
 */
export async function select(
  question: string,
  choices: Array<{ name: string; value: string; description?: string }>
): Promise<string> {
  return new Promise((resolve) => {
    let cursorPos = 0;
    let isFirstRender = true;

    // Clear screen and show initial state
    console.log(`\n${question}`);
    console.log('(Use ↑↓ arrows to navigate, Enter to select)\n');

    const render = (): void => {
      // Move cursor up to redraw (skip on first render)
      if (!isFirstRender) {
        rlSync.moveCursor(process.stdout, 0, -(choices.length));
        rlSync.clearScreenDown(process.stdout);
      }
      isFirstRender = false;

      choices.forEach((choice, index) => {
        const cursor = index === cursorPos ? '›' : ' ';
        const description = choice.description ? ` - ${choice.description}` : '';
        console.log(`  ${cursor} ${choice.name}${description}`);
      });
    };

    render();

    // Setup raw mode for keyboard input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key: string): void => {
      // Handle Ctrl+C
      if (key === '\u0003') {
        cleanup();
        process.exit(0);
      }

      // Handle Enter
      if (key === '\r' || key === '\n') {
        cleanup();
        console.log(''); // Add newline after selection
        resolve(choices[cursorPos].value);
        return;
      }

      // Handle arrow keys
      if (key === '\u001b[A') {
        // Up arrow
        cursorPos = cursorPos > 0 ? cursorPos - 1 : choices.length - 1;
        render();
      } else if (key === '\u001b[B') {
        // Down arrow
        cursorPos = cursorPos < choices.length - 1 ? cursorPos + 1 : 0;
        render();
      }
    };

    const cleanup = (): void => {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}
