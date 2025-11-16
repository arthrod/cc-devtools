/**
 * MobileKeyboard Component
 *
 * Custom on-screen QWERTY keyboard for mobile terminal input.
 * Features:
 * - iOS-style QWERTY layout with dedicated top row
 * - Modifier toggle behavior (Ctrl, Alt, Shift)
 * - Extended keyboard page (numbers + symbols)
 * - Done button for manual dismissal
 * - Salmon brand color for active modifiers
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { KeyboardInputEvent } from '@/web/shared/types/console';

export interface MobileKeyboardProps {
  /**
   * Callback when key is pressed
   */
  onKeyPress: (event: KeyboardInputEvent) => void;

  /**
   * Callback when Done button is pressed (to dismiss keyboard)
   */
  onDismiss?: () => void;

  /**
   * Visibility state
   */
  visible?: boolean;

  /**
   * Enable desktop mode (60% width, centered, with backdrop)
   */
  desktopMode?: boolean;
}

interface ModifierState {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

type KeyboardPage = 'alpha' | 'numbers' | 'symbols';

/**
 * MobileKeyboard - On-screen keyboard for mobile terminal
 */
export function MobileKeyboard({
  onKeyPress,
  onDismiss,
  visible = true,
  desktopMode = false,
}: MobileKeyboardProps) {
  const [modifiers, setModifiers] = useState<ModifierState>({
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  });

  const [page, setPage] = useState<KeyboardPage>('alpha');

  // Toggle modifier key
  const toggleModifier = useCallback((modifier: keyof ModifierState) => {
    setModifiers((prev) => ({
      ...prev,
      [modifier]: !prev[modifier],
    }));
  }, []);

  // Send key press with current modifiers
  const handleKeyPress = useCallback(
    (key: string, special = false) => {
      const event: KeyboardInputEvent = {
        key,
        modifiers: { ...modifiers },
        special,
      };

      onKeyPress(event);

      // Dim Ctrl, Alt, and Meta after use (but not Shift - it should stay until toggled)
      if (modifiers.ctrl || modifiers.alt || modifiers.meta) {
        setModifiers((prev) => ({
          ...prev,
          ctrl: false,
          alt: false,
          meta: false,
        }));
      }

      // Shift only dims after a letter key (not special keys)
      if (modifiers.shift && !special && key.length === 1) {
        setModifiers((prev) => ({
          ...prev,
          shift: false,
        }));
      }
    },
    [modifiers, onKeyPress]
  );

  // Keyboard page navigation
  const goToNumbers = useCallback(() => setPage('numbers'), []);
  const goToSymbols = useCallback(() => setPage('symbols'), []);
  const goToAlpha = useCallback(() => setPage('alpha'), []);

  if (!visible) {
    return null;
  }

  // iOS-style keyboard layout styles (matching native iOS dark mode)
  const keyClass = 'flex-1 py-3 bg-white dark:bg-[#505053] text-black dark:text-white rounded shadow-[0_1px_0_rgba(0,0,0,0.3)] text-xl font-normal hover:bg-[#F5F5F5] dark:hover:bg-[#606063] active:bg-[#E8E8E8] dark:active:bg-[#404043] transition-colors flex items-center justify-center';
  const specialKeyClass = 'py-3 bg-[#ADB1B6] dark:bg-[#3A3A3C] text-black dark:text-white rounded shadow-[0_1px_0_rgba(0,0,0,0.3)] text-base font-normal hover:bg-[#9DA1A6] dark:hover:bg-[#4A4A4C] active:bg-[#8D9196] dark:active:bg-[#2A2A2C] transition-colors flex items-center justify-center';
  const modifierActiveClass = 'bg-[#f16b5a] hover:bg-[#e05a49] active:bg-[#d04938] text-white';
  const accessoryKeyClass = 'px-3 py-1.5 bg-[#8B8D91] dark:bg-[#3A3A3C] text-white dark:text-[#EBEBF5] rounded-sm text-sm font-medium hover:bg-[#7B7D81] dark:hover:bg-[#4A4A4C] active:bg-[#6B6D71] dark:active:bg-[#2A2A2C] transition-colors min-w-[36px] flex items-center justify-center shadow-[0_1px_0_rgba(0,0,0,0.4)]';

  // Desktop mode: wrap keyboard in backdrop with centered positioning
  if (desktopMode) {
    return (
      <>
        {/* Semi-transparent backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={onDismiss}
          role="button"
          tabIndex={0}
          aria-label="Close keyboard"
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
              onDismiss?.();
            }
          }}
        />

        {/* Keyboard container (centered, 60% width) */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[60%] max-w-3xl z-50 animate-slide-up">
          <div className="bg-[#CDCDD2] dark:bg-[#1C1C1E] border-t border-x border-[#B8B8BD] dark:border-[#38383A] rounded-t-xl shadow-2xl p-4">
            {renderKeyboardContent()}
          </div>
        </div>
      </>
    );
  }

  // Mobile mode: full-width keyboard at bottom
  return (
    <div
      className="w-full bg-[#CDCDD2] dark:bg-[#1C1C1E] border-t border-[#B8B8BD] dark:border-[#38383A] p-2"
      style={{
        paddingBottom: '40px', // iOS safe area bottom (typical iPhone notch/home indicator)
      }}
    >
      {renderKeyboardContent()}
    </div>
  );

  // Helper function to render keyboard content (shared between desktop and mobile modes)
  function renderKeyboardContent() {
    return (
      <>
      {/* Accessory bar: Esc, Tab, Arrows, Modifiers, Close */}
      <div className="bg-[#CBCBCF] dark:bg-[#28282A] -mx-2 px-2 py-2 mb-3 rounded-t-lg border-b border-[#B8B8BD] dark:border-[#38383A]">
        <div className="flex gap-2 justify-between">
          <button
            onClick={() => handleKeyPress('Escape', true)}
            className={accessoryKeyClass}
            type="button"
          >
            Esc
          </button>
          <button
            onClick={() => handleKeyPress('Tab', true)}
            className={accessoryKeyClass}
            type="button"
          >
            Tab
          </button>
          <button
            onClick={() => handleKeyPress('ArrowUp', true)}
            className={accessoryKeyClass}
            type="button"
          >
            ↑
          </button>
          <button
            onClick={() => handleKeyPress('ArrowDown', true)}
            className={accessoryKeyClass}
            type="button"
          >
            ↓
          </button>
          <button
            onClick={() => handleKeyPress('ArrowLeft', true)}
            className={accessoryKeyClass}
            type="button"
          >
            ←
          </button>
          <button
            onClick={() => handleKeyPress('ArrowRight', true)}
            className={accessoryKeyClass}
            type="button"
          >
            →
          </button>
          <button
            onClick={() => toggleModifier('ctrl')}
            className={`${accessoryKeyClass} ${modifiers.ctrl ? modifierActiveClass : ''}`}
            type="button"
          >
            Ctrl
          </button>
          <button
            onClick={() => toggleModifier('alt')}
            className={`${accessoryKeyClass} ${modifiers.alt ? modifierActiveClass : ''}`}
            type="button"
          >
            Alt
          </button>
          <button
            onClick={() => toggleModifier('meta')}
            className={`${accessoryKeyClass} ${modifiers.meta ? modifierActiveClass : ''}`}
            type="button"
          >
            ⌘
          </button>
        </div>
      </div>

      {/* Alpha page (QWERTY) */}
      {page === 'alpha' && (
        <>
          {/* Row 1: Q-P */}
          <div className="flex gap-1 mb-2">
            {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(modifiers.shift ? key.toUpperCase() : key)}
                className={keyClass}
                type="button"
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Row 2: A-L (slightly indented like iOS) */}
          <div className="flex gap-1 mb-2 px-3">
            {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(modifiers.shift ? key.toUpperCase() : key)}
                className={keyClass}
                type="button"
              >
                {key.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Row 3: Shift, Z-M, Backspace */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => toggleModifier('shift')}
              className={`${specialKeyClass} flex-[1.5] ${modifiers.shift ? modifierActiveClass : ''}`}
              type="button"
            >
              {modifiers.shift ? '⇧' : '⇧'}
            </button>
            {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(modifiers.shift ? key.toUpperCase() : key)}
                className={keyClass}
                type="button"
              >
                {key.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('Backspace', true)}
              className={`${specialKeyClass} flex-[1.5]`}
              type="button"
            >
              ⌫
            </button>
          </div>

          {/* Row 4: 123, Space, Return */}
          <div className="flex gap-1">
            <button
              onClick={goToNumbers}
              className={`${specialKeyClass} flex-[1.2]`}
              type="button"
            >
              123
            </button>
            <button
              onClick={() => handleKeyPress(' ')}
              className={`${keyClass} flex-[4]`}
              type="button"
            >
              {' '}
            </button>
            <button
              onClick={() => handleKeyPress('Enter', true)}
              className={`${specialKeyClass} flex-[1.2] bg-[#007AFF] hover:bg-[#0051D5] active:bg-[#003399] text-white dark:bg-[#2C5C7C] dark:hover:bg-[#3C6C8C] dark:active:bg-[#1C4C6C]`}
              type="button"
            >
              return
            </button>
          </div>
        </>
      )}

      {/* Numbers page */}
      {page === 'numbers' && (
        <>
          {/* Row 1: Numbers 1-0 */}
          <div className="flex gap-1 mb-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={keyClass}
                type="button"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Row 2: - / : ; ( ) $ & @ " */}
          <div className="flex gap-1 mb-2 px-3">
            {['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={keyClass}
                type="button"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Row 3: Symbols button, ., ! ? ' */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={goToSymbols}
              className={`${specialKeyClass} flex-[1.5]`}
              type="button"
            >
              #+=
            </button>
            {['.', ',', '?', '!', "'"].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={keyClass}
                type="button"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('Backspace', true)}
              className={`${specialKeyClass} flex-[1.5]`}
              type="button"
            >
              ⌫
            </button>
          </div>

          {/* Row 4: ABC, Space, Return */}
          <div className="flex gap-1">
            <button
              onClick={goToAlpha}
              className={`${specialKeyClass} flex-[1.2]`}
              type="button"
            >
              ABC
            </button>
            <button
              onClick={() => handleKeyPress(' ')}
              className={`${keyClass} flex-[4]`}
              type="button"
            >
              {' '}
            </button>
            <button
              onClick={() => handleKeyPress('Enter', true)}
              className={`${specialKeyClass} flex-[1.2] bg-[#007AFF] hover:bg-[#0051D5] active:bg-[#003399] text-white dark:bg-[#2C5C7C] dark:hover:bg-[#3C6C8C] dark:active:bg-[#1C4C6C]`}
              type="button"
            >
              return
            </button>
          </div>
        </>
      )}

      {/* Symbols page - iOS keyboard layout */}
      {page === 'symbols' && (
        <>
          {/* Row 1: [ ] { } # % ^ * + = */}
          <div className="flex gap-1 mb-2">
            {['[', ']', '{', '}', '#', '%', '^', '*', '+', '='].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={keyClass}
                type="button"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Row 2: _ \ | ~ < > $ € £ ¥ (iOS symbol layout, indented) */}
          <div className="flex gap-1 mb-2 px-3">
            {['_', '\\', '|', '~', '<', '>', '$', '€', '£', '¥'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={keyClass}
                type="button"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Row 3: 123 button, . , ? ! ' + backspace */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={goToNumbers}
              className={`${specialKeyClass} flex-[1.5]`}
              type="button"
            >
              123
            </button>
            {['.', ',', '?', '!', "'", '`'].map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={keyClass}
                type="button"
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('Backspace', true)}
              className={`${specialKeyClass} flex-[1.5]`}
              type="button"
            >
              ⌫
            </button>
          </div>

          {/* Row 4: ABC, Space, Return */}
          <div className="flex gap-1">
            <button
              onClick={goToAlpha}
              className={`${specialKeyClass} flex-[1.2]`}
              type="button"
            >
              ABC
            </button>
            <button
              onClick={() => handleKeyPress(' ')}
              className={`${keyClass} flex-[4]`}
              type="button"
            >
              {' '}
            </button>
            <button
              onClick={() => handleKeyPress('Enter', true)}
              className={`${specialKeyClass} flex-[1.2] bg-[#007AFF] hover:bg-[#0051D5] active:bg-[#003399] text-white dark:bg-[#2C5C7C] dark:hover:bg-[#3C6C8C] dark:active:bg-[#1C4C6C]`}
              type="button"
            >
              return
            </button>
          </div>
        </>
      )}
      </>
    );
  }
}
