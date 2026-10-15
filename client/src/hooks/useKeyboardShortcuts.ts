import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setTool, setSelectedId, resetView, popUndo, popRedo } from '../store/canvasSlice';
import { ToolType } from '../types';

interface ShortcutOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteSelected?: () => void;
  onToggleCommandPalette?: () => void;
}

export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.canvas.selectedId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger tool shortcuts if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Command Palette (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        options.onToggleCommandPalette?.();
        return;
      }

      // Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        options.onUndo?.();
        return;
      }

      // Redo (Ctrl+Shift+Z or Ctrl+Y)
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        options.onRedo?.();
        return;
      }

      // Reset View (Ctrl+0 or 0)
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        dispatch(resetView());
        return;
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          options.onDeleteSelected?.();
        }
        return;
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        dispatch(setSelectedId(null));
        dispatch(setTool('select'));
        return;
      }

      // Tool switching shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          dispatch(setTool('select'));
          break;
        case 'p':
          dispatch(setTool('pen'));
          break;
        case 'r':
          dispatch(setTool('rect'));
          break;
        case 'c':
          dispatch(setTool('circle'));
          break;
        case 't':
          dispatch(setTool('text'));
          break;
        case 'e':
          dispatch(setTool('eraser'));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selectedId, options]);
}

export default useKeyboardShortcuts;
