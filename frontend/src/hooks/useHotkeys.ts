import { useEffect } from 'react';

type HotkeyHandler = (event: KeyboardEvent) => void;

interface HotkeyConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  handler: HotkeyHandler;
}

export function useHotkeys(hotkeys: HotkeyConfig[], enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      const tag = target.tagName.toLowerCase();
      return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const isPrimaryModifierPressed = (event: KeyboardEvent): boolean => event.ctrlKey || event.metaKey;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      for (const hotkey of hotkeys) {
        const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase();
        const ctrlMatch = (hotkey.ctrlKey || false) === isPrimaryModifierPressed(event);
        const shiftMatch = (hotkey.shiftKey || false) === event.shiftKey;
        const metaMatch = (hotkey.metaKey || false) === event.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && metaMatch) {
          event.preventDefault();
          hotkey.handler(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys, enabled]);
}
