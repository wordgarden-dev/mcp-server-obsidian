/**
 * Tests for kanban item operation tools
 * Tests: add, remove, move, update, complete, reorder
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { kanbanItemAdd } from '../../../src/tools/kanban/items/add.js';
import { kanbanItemRemove } from '../../../src/tools/kanban/items/remove.js';
import { kanbanItemMove } from '../../../src/tools/kanban/items/move.js';
import { kanbanItemUpdate } from '../../../src/tools/kanban/items/update.js';
import { kanbanItemComplete } from '../../../src/tools/kanban/items/complete.js';
import { kanbanItemReorder } from '../../../src/tools/kanban/items/reorder.js';
import { readKanbanFile } from '../../../src/utils/file-ops.js';

/**
 * Create a test board with standard structure
 */
const createTestBoardContent = () => `---

kanban-plugin: basic

---

## Backlog

- [ ] Task 1
- [ ] Task 2
- [x] Completed task

## In Progress

- [ ] Active task

## Done

- [x] Finished task

%% kanban:settings
\`\`\`
{"kanban-plugin":"basic"}
\`\`\`
%%
`;

describe('kanban item operations', () => {
  describe('kanban_item_add', () => {
    test('should add uncompleted item to column', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemAdd({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'New task',
          completed: false
        });
        
        assert.strictEqual(result.column, 'Backlog');
        assert.strictEqual(result.item.text, 'New task');
        assert.strictEqual(result.item.completed, false);
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        assert.strictEqual(backlog?.items.length, 4);
        assert.strictEqual(backlog?.items[3]?.text, 'New task');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should throw error for non-existent column', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      await writeFile(join(tempDir, boardPath), createTestBoardContent(), 'utf-8');
      
      try {
        await assert.rejects(
          kanbanItemAdd({
            vault: tempDir,
            board: boardPath,
            column: 'Invalid',
            text: 'Task'
          }),
          /Column "Invalid" not found/
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('kanban_item_remove', () => {
    test('should remove item by text match', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemRemove({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'Task 2'
        });
        
        assert.strictEqual(result.removed.text, 'Task 2');
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        assert.strictEqual(backlog?.items.length, 2);
        assert.strictEqual(backlog?.items.find(i => i.text === 'Task 2'), undefined);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should throw error for non-existent item', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      await writeFile(join(tempDir, boardPath), createTestBoardContent(), 'utf-8');
      
      try {
        await assert.rejects(
          kanbanItemRemove({
            vault: tempDir,
            board: boardPath,
            column: 'Backlog',
            text: 'Non-existent'
          }),
          /Item "Non-existent" not found/
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('kanban_item_move', () => {
    test('should move item between columns', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemMove({
          vault: tempDir,
          board: boardPath,
          text: 'Task 1',
          sourceColumn: 'Backlog',
          targetColumn: 'In Progress'
        });
        
        assert.strictEqual(result.sourceColumn, 'Backlog');
        assert.strictEqual(result.targetColumn, 'In Progress');
        assert.strictEqual(result.item.text, 'Task 1');
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        const inProgress = board.columns.find(c => c.name === 'In Progress');
        
        assert.strictEqual(backlog?.items.length, 2);
        assert.strictEqual(inProgress?.items.length, 2);
        assert.strictEqual(inProgress?.items[1]?.text, 'Task 1');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should preserve item completion status when moving', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemMove({
          vault: tempDir,
          board: boardPath,
          text: 'Completed task',
          sourceColumn: 'Backlog',
          targetColumn: 'Done'
        });
        
        assert.strictEqual(result.item.completed, true);
        
        const board = await readKanbanFile(fullPath);
        const done = board.columns.find(c => c.name === 'Done');
        assert.strictEqual(done?.items[1]?.completed, true);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('kanban_item_update', () => {
    test('should update item text', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemUpdate({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          oldText: 'Task 1',
          newText: 'Updated Task 1'
        });
        
        assert.strictEqual(result.oldItem.text, 'Task 1');
        assert.strictEqual(result.newItem.text, 'Updated Task 1');
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        assert.strictEqual(backlog?.items[0]?.text, 'Updated Task 1');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should preserve completed status when updating', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemUpdate({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          oldText: 'Completed task',
          newText: 'Updated completed task'
        });
        
        assert.strictEqual(result.oldItem.completed, true);
        assert.strictEqual(result.newItem.completed, true);
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        const item = backlog?.items.find(i => i.text === 'Updated completed task');
        assert.strictEqual(item?.completed, true);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('kanban_item_complete', () => {
    test('should toggle completion status when completed param omitted', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        // Toggle uncompleted -> completed
        const result1 = await kanbanItemComplete({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'Task 1'
        });
        
        assert.strictEqual(result1.wasCompleted, false);
        assert.strictEqual(result1.isCompleted, true);
        
        // Toggle completed -> uncompleted
        const result2 = await kanbanItemComplete({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'Task 1'
        });
        
        assert.strictEqual(result2.wasCompleted, true);
        assert.strictEqual(result2.isCompleted, false);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should set to completed when completed=true', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemComplete({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'Task 1',
          completed: true
        });
        
        assert.strictEqual(result.wasCompleted, false);
        assert.strictEqual(result.isCompleted, true);
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        assert.strictEqual(backlog?.items[0]?.completed, true);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('kanban_item_reorder', () => {
    test('should move item to new position', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemReorder({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'Completed task',
          position: 0
        });
        
        assert.strictEqual(result.oldPosition, 2);
        assert.strictEqual(result.newPosition, 0);
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        assert.strictEqual(backlog?.items[0]?.text, 'Completed task');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should clamp position to maximum index', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        const result = await kanbanItemReorder({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'Task 1',
          position: 999
        });
        
        // Should be clamped to last position (2, after removal)
        assert.strictEqual(result.newPosition, 2);
        
        const board = await readKanbanFile(fullPath);
        const backlog = board.columns.find(c => c.name === 'Backlog');
        assert.strictEqual(backlog?.items[2]?.text, 'Task 1');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('integration workflows', () => {
    test('should support add -> move -> complete workflow', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const boardPath = 'test.md';
      const fullPath = join(tempDir, boardPath);
      
      await writeFile(fullPath, createTestBoardContent(), 'utf-8');
      
      try {
        // Add task to Backlog
        await kanbanItemAdd({
          vault: tempDir,
          board: boardPath,
          column: 'Backlog',
          text: 'New feature',
          completed: false
        });
        
        // Move to In Progress
        await kanbanItemMove({
          vault: tempDir,
          board: boardPath,
          text: 'New feature',
          sourceColumn: 'Backlog',
          targetColumn: 'In Progress'
        });
        
        // Update text
        await kanbanItemUpdate({
          vault: tempDir,
          board: boardPath,
          column: 'In Progress',
          oldText: 'New feature',
          newText: 'New feature (90% done)'
        });
        
        // Complete
        await kanbanItemComplete({
          vault: tempDir,
          board: boardPath,
          column: 'In Progress',
          text: 'New feature (90% done)',
          completed: true
        });
        
        // Move to Done
        await kanbanItemMove({
          vault: tempDir,
          board: boardPath,
          text: 'New feature (90% done)',
          sourceColumn: 'In Progress',
          targetColumn: 'Done'
        });
        
        // Verify final state
        const board = await readKanbanFile(fullPath);
        const done = board.columns.find(c => c.name === 'Done');
        const item = done?.items.find(i => i.text === 'New feature (90% done)');
        
        assert.strictEqual(item?.text, 'New feature (90% done)');
        assert.strictEqual(item?.completed, true);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
