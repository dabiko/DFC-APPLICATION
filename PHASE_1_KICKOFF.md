# Phase 1 Kickoff: Ingestion & Storage UI
## Digital Filing Cabinet - Weeks 5-10 Implementation Plan

**Start Date**: 2025-11-17
**Duration**: 6 weeks
**Phase**: Phase 1 - Ingestion & Storage UI
**Prerequisite**: Phase 0 Complete ✅

---

## 🎯 Phase 1 Objectives

Build the core document management features:
1. **Folder Management**: Complete folder hierarchy system with CRUD operations
2. **Metadata Management**: Dynamic forms for document classification
3. **Version Control**: Document versioning with history tracking
4. **File Upload**: Drag-and-drop upload with progress tracking
5. **File Preview**: Preview system for documents (PDF, images, Office docs)
6. **Bulk Operations**: Multi-select and batch operations

---

## 📅 Week-by-Week Breakdown

### **Week 5-6: Folder Management UI** (Current Week)
**Estimated Effort**: 6-7 days
**Priority**: HIGH - Foundation for document organization

#### Key Deliverables:
- ✅ Enhanced folder tree component (10,000+ folder support)
- ✅ Context menu (right-click) operations
- ✅ Drag-and-drop folder reorganization
- ✅ Folder operation modals (Create, Rename, Move, Delete)
- ✅ Folder templates system
- ✅ Enhanced breadcrumb navigation

---

### **Week 7: Metadata Input Forms**
**Estimated Effort**: 5-6 days
**Priority**: HIGH - Required for document classification

#### Key Deliverables:
- ✅ Dynamic metadata form component
- ✅ Document type-specific validation
- ✅ Bulk metadata editor
- ✅ Tag management with autocomplete
- ✅ Metadata display component

---

### **Week 8: Version History UI**
**Estimated Effort**: 4-5 days
**Priority**: MEDIUM - Important for audit trail

#### Key Deliverables:
- ✅ Version history timeline
- ✅ Version upload modal
- ✅ Version comparison view
- ✅ Version restore functionality

---

### **Week 9: Drag-and-Drop Upload**
**Estimated Effort**: 5 days
**Priority**: HIGH - Core functionality

#### Key Deliverables:
- ✅ Enhanced upload zone with visual feedback
- ✅ Upload progress tracking (per file + overall)
- ✅ Metadata input during upload
- ✅ Chunked upload for large files (>100MB)
- ✅ Batch upload support

---

### **Week 10: File List, Preview & Bulk Operations**
**Estimated Effort**: 5 days
**Priority**: HIGH - User interaction layer

#### Key Deliverables:
- ✅ Grid/List view toggle
- ✅ File preview modal (PDF, images, Office docs)
- ✅ Bulk operations toolbar
- ✅ Smart folders feature
- ✅ File sorting and filtering

---

## 🚀 Week 5-6: Folder Management - Detailed Plan

### Day 1-2: Enhanced Folder Tree Component

**Goal**: Create a production-ready folder tree that can handle 10,000+ folders

#### Tasks:
1. **Enhance existing TreeView component** (`src/components/Navigation/TreeView.tsx`)
   - Add virtualization for performance (react-window or react-virtual)
   - Implement infinite-depth nesting
   - Add expand/collapse animations
   - Add folder icons (open/closed states)
   - Add locked folder indicators

2. **Add context menu** (right-click)
   - Install/use context menu library or build custom
   - Menu options:
     - New Folder
     - Rename
     - Move
     - Delete
     - Properties
   - Context menu positioning logic

3. **Implement drag-and-drop**
   - Use react-dnd or @dnd-kit/core
   - Drag visual feedback
   - Drop zones highlighting
   - Prevent invalid drops (can't drop parent into child)
   - API integration for folder move

**Files to Create/Modify:**
```
src/components/Folder/
├── FolderTree.tsx           (NEW - enhanced tree)
├── FolderTreeItem.tsx       (NEW - individual folder node)
├── FolderContextMenu.tsx    (NEW - right-click menu)
├── useFolderDragDrop.ts     (NEW - drag-drop logic)
└── FolderTree.stories.tsx   (NEW - Storybook)
```

**Technical Requirements:**
- Virtual scrolling for 10,000+ folders
- Lazy loading (load children on expand)
- Optimistic UI updates
- Error handling with rollback

---

### Day 3: Folder Operation Modals

**Goal**: Create all folder CRUD modals

#### Tasks:
1. **Create Folder Modal**
   - Folder name input with validation
   - Parent folder selector (optional, defaults to current)
   - Folder template dropdown (if applicable)
   - Create button with loading state

2. **Rename Folder Modal**
   - Display current name
   - New name input with validation
   - Save button

3. **Move Folder Modal**
   - Current location breadcrumb
   - Destination folder tree (filtere d - can't move into self or children)
   - Move button with confirmation

4. **Delete Folder Confirmation**
   - Folder name and full path display
   - Warning if folder contains documents/subfolders
   - "Type folder name to confirm" input
   - Checkbox: "I understand this cannot be undone"
   - Delete button (red, disabled until confirmation)

**Files to Create:**
```
src/components/Folder/Modals/
├── CreateFolderModal.tsx
├── RenameFolderModal.tsx
├── MoveFolderModal.tsx
├── DeleteFolderModal.tsx
└── FolderModals.stories.tsx
```

**Component Pattern:**
```tsx
interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  parentFolder?: Folder
  onSuccess: (folder: Folder) => void
}

export const CreateFolderModal: FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  parentFolder,
  onSuccess,
}) => {
  // Implementation
}
```

---

### Day 4: Folder Templates

**Goal**: Implement folder template system

#### Tasks:
1. **Template Selector Component**
   - Dropdown with predefined templates
   - Template preview (shows structure)
   - "Use Template" button

2. **Common Templates** (hardcoded for now, backend later):
   - Project Folder
     ```
     ProjectName/
     ├── Planning/
     ├── Documents/
     ├── Reports/
     └── Archive/
     ```
   - Employee File
     ```
     EmployeeName/
     ├── Personal/
     ├── Contracts/
     ├── Performance/
     └── Training/
     ```
   - Client Folder
     ```
     ClientName/
     ├── Contracts/
     ├── Invoices/
     ├── Communications/
     └── KYC Documents/
     ```

3. **Apply Template Function**
   - Create folder structure recursively
   - Progress indicator during creation
   - Success notification with folder count

**Files to Create:**
```
src/components/Folder/Templates/
├── FolderTemplateSelector.tsx
├── TemplatePreview.tsx
├── folderTemplates.ts (template definitions)
└── useFolderTemplate.ts (template application logic)
```

---

### Day 5: Enhanced Breadcrumb Navigation

**Goal**: Upgrade breadcrumb component for folder navigation

#### Tasks:
1. **Enhance Breadcrumbs Component**
   - Dynamic path based on current folder
   - Clickable segments (navigate up hierarchy)
   - Ellipsis for long paths (e.g., "Home / ... / Parent / Current")
   - Copy full path button (clipboard)
   - Dropdown for collapsed segments

2. **Integration with Folder Tree**
   - Sync breadcrumbs with selected folder
   - Click breadcrumb → update tree selection
   - Update breadcrumbs on folder navigation

**Files to Modify:**
```
src/components/Navigation/Breadcrumbs.tsx (enhance existing)
src/hooks/useFolderNavigation.ts (NEW - navigation state)
```

**Features:**
```tsx
<Breadcrumbs
  path={[
    { id: '1', name: 'Home', href: '/' },
    { id: '2', name: 'Documents', href: '/folder/2' },
    { id: '3', name: 'Financial', href: '/folder/3' },
    { id: '4', name: 'Reports 2024', href: null }, // current
  ]}
  maxItems={4}  // Collapse if more
  onNavigate={handleFolderClick}
  showCopyButton
/>
```

---

### Day 6-7: Integration & Testing

**Goal**: Integrate all components and test thoroughly

#### Tasks:
1. **Create Folder Management Page**
   - Left panel: Folder tree
   - Top: Breadcrumbs + actions
   - Center: Folder contents (empty for now)
   - Connect all components

2. **API Integration**
   - Create folder API service
   - CRUD operations (create, read, update, delete, move)
   - Error handling
   - Loading states

3. **State Management**
   - Redux slice for folders
   - Optimistic updates
   - Cache folder tree
   - Real-time updates (if needed)

4. **Testing**
   - Unit tests for each component
   - Integration tests for folder operations
   - Test with 1000+ folders (performance)
   - Test drag-and-drop edge cases
   - Test all modal flows

**Files to Create:**
```
src/pages/FolderManagementPage.tsx
src/services/folderService.ts
src/store/slices/folderSlice.ts
src/hooks/useFolders.ts
src/__tests__/FolderManagement.test.tsx
```

---

## 📦 Required Dependencies (Week 5-6)

Add these to `package.json`:

```bash
# Virtual scrolling for large lists
npm install react-window
npm install @types/react-window --save-dev

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Context menu (optional, can build custom)
npm install react-contexify

# Clipboard
npm install copy-to-clipboard
```

---

## 🎨 Design Specifications

### Folder Tree Styling:
- **Indent**: 20px per level
- **Folder Icon**: Closed (📁), Open (📂)
- **Locked Icon**: 🔒 (red color)
- **Hover**: Light gray background
- **Selected**: Primary color background
- **Drag**: Semi-transparent overlay

### Context Menu:
- **Background**: White (dark mode: gray-800)
- **Border**: 1px gray-200
- **Shadow**: Drop shadow
- **Items**: Hover effect, icons

### Modals:
- **Width**: 500px (small), 700px (large)
- **Padding**: 24px
- **Buttons**: Right-aligned
- **Cancel**: Secondary button
- **Confirm**: Primary/Danger button

---

## 🔌 API Endpoints (to integrate)

Ensure backend has these endpoints ready:

```typescript
// Folder CRUD
GET    /api/v1/folders/              // List all folders
POST   /api/v1/folders/              // Create folder
GET    /api/v1/folders/:id/          // Get folder details
PUT    /api/v1/folders/:id/          // Update folder (rename)
DELETE /api/v1/folders/:id/          // Delete folder
POST   /api/v1/folders/:id/move/     // Move folder
GET    /api/v1/folders/:id/children/ // Get child folders (lazy load)

// Folder tree
GET    /api/v1/folders/tree/         // Get entire folder tree
GET    /api/v1/folders/:id/path/     // Get folder path (for breadcrumbs)

// Folder templates (optional, can be frontend-only for now)
GET    /api/v1/folder-templates/
POST   /api/v1/folders/apply-template/
```

---

## ✅ Week 5-6 Success Criteria

### Functional Requirements:
- [ ] Can create folders at any level
- [ ] Can rename folders
- [ ] Can move folders via drag-and-drop
- [ ] Can move folders via Move modal
- [ ] Can delete folders (with confirmation)
- [ ] Context menu works on right-click
- [ ] Folder tree supports 10,000+ folders without lag
- [ ] Breadcrumbs update on navigation
- [ ] Can copy folder path to clipboard
- [ ] Folder templates create structure correctly

### Performance Requirements:
- [ ] Folder tree renders in <2 seconds (10,000 folders)
- [ ] Drag-and-drop feels smooth (60fps)
- [ ] API calls complete in <500ms
- [ ] UI remains responsive during operations

### Quality Requirements:
- [ ] All components have Storybook stories
- [ ] Unit tests for all components (>80% coverage)
- [ ] No console errors or warnings
- [ ] Accessibility: keyboard navigation works
- [ ] Mobile responsive (if applicable)

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Performance with Large Trees
**Problem**: Tree becomes slow with 10,000+ folders
**Solution**:
- Use virtualization (react-window)
- Lazy load children on expand
- Cache rendered components (React.memo)

### Pitfall 2: Drag-Drop Conflicts
**Problem**: Dragging causes folder to expand/collapse
**Solution**:
- Add drag threshold (5px movement before drag starts)
- Disable expand/collapse during drag
- Clear hover state on drag start

### Pitfall 3: Folder Path Issues
**Problem**: Moving folder breaks paths
**Solution**:
- Recalculate paths on backend after move
- Refresh folder tree after move operation
- Use folder IDs, not paths, for references

### Pitfall 4: Modal State Management
**Problem**: Modal state persists between opens
**Solution**:
- Reset form state on modal close
- Use `key` prop to force remount: `<Modal key={folderId} />`

---

## 📝 Daily Checklist

### Every Day:
- [ ] Commit code at end of day
- [ ] Update Storybook with new components
- [ ] Write/update unit tests
- [ ] Test in browser (Chrome, Firefox)
- [ ] Check console for errors
- [ ] Update progress in PHASE_1_PROGRESS.md (create this)

### End of Week 5-6:
- [ ] All Week 5-6 tasks complete
- [ ] All components in Storybook
- [ ] Demo to stakeholders (optional)
- [ ] Create Week 7 task list
- [ ] Commit with tag: `git tag week-5-6-complete`

---

## 📚 Resources

### Documentation:
- **React Window**: https://react-window.vercel.app/
- **dnd-kit**: https://docs.dndkit.com/
- **Headless UI**: https://headlessui.com/ (for modals)

### Design References:
- **Google Drive**: Folder tree UI
- **Dropbox**: Drag-drop interactions
- **Windows Explorer**: Context menu
- **Finder (macOS)**: Breadcrumb navigation

### Code Examples:
- Check `src/components/Navigation/TreeView.tsx` for base implementation
- Check `src/components/Modal/Modal.tsx` for modal patterns

---

## 🎯 Next Steps After Week 5-6

1. **Week 7**: Metadata Input Forms
   - Start building dynamic metadata forms
   - Document type dropdowns
   - Tag management with autocomplete

2. **Week 8**: Version History
   - Version timeline UI
   - Version comparison view

3. **Week 9**: File Upload
   - Drag-drop upload zone
   - Progress tracking
   - Chunked uploads

---

## 🤝 Need Help?

- **Questions about implementation**: Review CLAUDE.md and PROJECT_IMPLEMENTATION_PLAN_FRONTEND.md
- **Component patterns**: Check existing components in Storybook
- **API integration**: Review backend API documentation
- **Design decisions**: Consult COMPONENT_LIBRARY.md

---

**Ready to start Week 5-6! Let's build amazing folder management. 🚀**

**First Task**: Enhance FolderTree component with virtualization and context menu.

Would you like me to start implementing the enhanced FolderTree component now?
