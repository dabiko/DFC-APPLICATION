# Drag & Drop Fix - useSortable Import Error

**Date:** November 23, 2025
**Status:** ✅ FIXED

---

## Error

```
useFolderDragDrop.ts:262 Uncaught ReferenceError: useSortable is not defined
    at useSortableFolder (useFolderDragDrop.ts:262:5)
    at FolderTreeItem (FolderTreeItem.tsx:62:9)
```

---

## Root Cause

The `useSortable` hook from `@dnd-kit/sortable` was being used in the `useSortableFolder` function (line 262) but was not imported at the top of the file.

**File:** `frontend/src/hooks/useFolderDragDrop.ts`

**Line 262:**
```typescript
export const useSortableFolder = (folderId: string) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: folderId }) // ❌ useSortable not imported
  // ...
}
```

---

## Fix Applied

Added the missing import statement:

**Before:**
```typescript
import { useState, useCallback } from 'react'
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Folder, FolderDragData, FolderDropResult } from '@/types/folder'
import { canMoveFolder, findFolderById } from '@/utils/folderTree'
```

**After:**
```typescript
import { useState, useCallback } from 'react'
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable' // ✅ Added import
import { CSS } from '@dnd-kit/utilities'
import type { Folder, FolderDragData, FolderDropResult } from '@/types/folder'
import { canMoveFolder, findFolderById } from '@/utils/folderTree'
```

---

## Verification

### Package Installation
Verified that `@dnd-kit/sortable` is installed:
```bash
npm list @dnd-kit/sortable
```

**Result:**
```
└── @dnd-kit/sortable@10.0.0 ✅
```

### Import Statement
The `useSortable` hook is now properly imported from `@dnd-kit/sortable` package.

---

## How the Hook Works

### useSortableFolder Hook

This hook provides drag-and-drop functionality for folder items in the tree:

```typescript
export const useSortableFolder = (folderId: string) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: folderId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return {
    attributes,    // Accessibility attributes
    listeners,     // Event listeners for drag interactions
    setNodeRef,    // Ref to attach to the draggable element
    style,         // CSS styles for drag visual feedback
    isDragging,    // Boolean indicating if this item is being dragged
    isOver,        // Boolean indicating if another item is over this one
  }
}
```

### Usage in FolderTreeItem

**File:** `frontend/src/components/Folder/FolderTreeItem.tsx` (line 62)

```typescript
const FolderTreeItem = ({ folder, ... }) => {
  // Use the sortable hook for drag-and-drop
  const { attributes, listeners, setNodeRef, style, isDragging } =
    useSortableFolder(folder.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {/* Folder content */}
    </div>
  )
}
```

---

## Related Files

1. ✅ `frontend/src/hooks/useFolderDragDrop.ts` - Fixed import
2. ✅ `frontend/src/components/Folder/FolderTreeItem.tsx` - Uses the hook
3. ✅ `frontend/src/components/Folder/FolderTree.tsx` - Implements DndContext

---

## Dependencies

### @dnd-kit Packages Required

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

All packages are installed and up to date. ✅

---

## Testing

### Manual Test Steps

1. **Load the application** - Navigate to a page with folder tree
2. **Check console** - Verify no "useSortable is not defined" error
3. **Test drag-and-drop** (if enabled):
   - Try dragging a folder
   - Visual feedback should appear (opacity change)
   - Drop the folder to reorder or move it

### Expected Behavior

- ✅ No console errors
- ✅ Folder tree renders correctly
- ✅ Drag handles appear (if drag-and-drop is enabled)
- ✅ Visual feedback during drag operations

---

## Additional Notes

### Drag-and-Drop Architecture

The folder drag-and-drop system uses a three-layer architecture:

1. **@dnd-kit/core** - Core drag-and-drop primitives
   - `DndContext` - Wraps the draggable area
   - `useSensor` - Detects pointer/keyboard interactions
   - Drag events: `onDragStart`, `onDragOver`, `onDragEnd`

2. **@dnd-kit/sortable** - Sortable list functionality
   - `useSortable` - Makes items sortable within a list
   - `SortableContext` - Defines sortable boundaries
   - Handles reordering logic

3. **Custom Hooks** - Business logic layer
   - `useFolderDragDrop` - Folder-specific drag logic
   - `useSortableFolder` - Wrapper around `useSortable`
   - Validation: `canMoveFolder()` checks if move is valid

### When Drag-and-Drop is Active

Drag-and-drop is enabled when `enableDragDrop={true}` prop is passed to `FolderTree`:

```typescript
<FolderTree
  folders={folders}
  onFolderSelect={handleSelect}
  enableDragDrop={true}  // ✅ Enable drag-and-drop
  onFolderOperation={handleOperation}
/>
```

---

## Status

✅ **FIXED** - Import added, error resolved

The folder tree should now work without the "useSortable is not defined" error.

---

**Fix Applied By:** Claude Code Assistant
**Date:** 2025-11-23
**File Modified:** `frontend/src/hooks/useFolderDragDrop.ts`
