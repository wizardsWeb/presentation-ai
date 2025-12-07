/* eslint-disable @typescript-eslint/no-unsafe-return */
"use client";

import {
  useEditorRef,
  useEditorSelector,
} from "@udecode/plate-common/react";
import { forwardRef } from "react";
import { Redo2Icon, Undo2Icon } from "lucide-react";

import { ToolbarButton } from "./toolbar";

// Type definition for the editor with history
interface EditorWithHistory {
  history?: {
    redos?: unknown[];
    undos?: unknown[];
  };
}

// Type-safe selector functions
function selectRedoDisabled(editor: unknown): boolean {
  const editorWithHistory = editor as EditorWithHistory;
  return (editorWithHistory.history?.redos?.length ?? 0) === 0;
}

function selectUndoDisabled(editor: unknown): boolean {
  const editorWithHistory = editor as EditorWithHistory;
  return (editorWithHistory.history?.undos?.length ?? 0) === 0;
}

export const RedoToolbarButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof ToolbarButton>
>((props, ref) => {
  const editor = useEditorRef();
  const selectorResult = useEditorSelector(selectRedoDisabled, []);
  const disabled = Boolean(selectorResult);

  return (
    <ToolbarButton
      ref={ref}
      disabled={disabled}
      onClick={() => editor.redo()}
      onMouseDown={(e) => e.preventDefault()}
      tooltip="Redo"
      {...props}
    >
      <Redo2Icon />
    </ToolbarButton>
  );
});
RedoToolbarButton.displayName = "RedoToolbarButton";

export const UndoToolbarButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof ToolbarButton>
>((props, ref) => {
  const editor = useEditorRef();
  const selectorResult = useEditorSelector(selectUndoDisabled, []);
  const disabled = Boolean(selectorResult);

  return (
    <ToolbarButton
      ref={ref}
      disabled={disabled}
      onClick={() => editor.undo()}
      onMouseDown={(e) => e.preventDefault()}
      tooltip="Undo"
      {...props}
    >
      <Undo2Icon />
    </ToolbarButton>
  );
});
UndoToolbarButton.displayName = "UndoToolbarButton";
