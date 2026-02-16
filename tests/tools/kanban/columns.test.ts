/**
 * Tests for kanban column operation tools
 * Tests: add, remove, rename, move
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { kanbanColumnAdd } from '../../../src/tools/kanban/columns/add.js';
import { kanbanColumnRemove } from '../../../src/tools/kanban/columns/remove.js';
import { kanbanColumnRename } from '../../../src/tools/kanban/columns/rename.js';
import { kanbanColumnMove } from '../../../src/tools/kanban/columns/move.js';
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

describe('kanban column operations', () => {
  describe('kanban_column_add', () => {
    test('should add column at end by default', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnAdd({
          vault: tmpDir,
          board: 'board.md',
          name: 'Review'
        });

        assert.strictEqual(result.board, 'board.md');
        assert.strictEqual(result.column.name, 'Review');
        assert.strictEqual(result.position, 3);
        assert.deepStrictEqual(result.column.items, []);

        // Verify in file
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns.length, 4);
        assert.strictEqual(board.columns[3]?.name, 'Review');
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should add column at specific position', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnAdd({
          vault: tmpDir,
          board: 'board.md',
          name: 'Review',
          position: 1
        });

        assert.strictEqual(result.position, 1);

        // Verify order
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'Backlog');
        assert.strictEqual(board.columns[1]?.name, 'Review');
        assert.strictEqual(board.columns[2]?.name, 'In Progress');
        assert.strictEqual(board.columns[3]?.name, 'Done');
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should add column at position 0', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnAdd({
          vault: tmpDir,
          board: 'board.md',
          name: 'Triage',
          position: 0
        });

        assert.strictEqual(result.position, 0);

        // Verify order
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'Triage');
        assert.strictEqual(board.columns[1]?.name, 'Backlog');
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject duplicate column name', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnAdd({
              vault: tmpDir,
              board: 'board.md',
              name: 'Backlog'
            });
          },
          /already exists/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject position out of bounds', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnAdd({
              vault: tmpDir,
              board: 'board.md',
              name: 'Review',
              position: 10
            });
          },
          /out of bounds/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject invalid parameters', async () => {
      await assert.rejects(
        async () => {
          await kanbanColumnAdd({
            vault: '',
            board: 'board.md',
            name: 'Review'
          });
        },
        /Vault path cannot be empty/
      );

      await assert.rejects(
        async () => {
          await kanbanColumnAdd({
            vault: '/vault',
            board: 'board.md',
            name: ''
          });
        },
        /Column name cannot be empty/
      );
    });
  });

  describe('kanban_column_remove', () => {
    test('should remove empty column', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        const content = `---

kanban-plugin: basic

---

## Backlog

## In Progress

## Done

%% kanban:settings
\`\`\`
{"kanban-plugin":"basic"}
\`\`\`
%%
`;
        await writeFile(boardPath, content);

        const result = await kanbanColumnRemove({
          vault: tmpDir,
          board: 'board.md',
          name: 'In Progress'
        });

        assert.strictEqual(result.removedColumn, 'In Progress');
        assert.strictEqual(result.itemsRemoved, 0);
        assert.strictEqual(result.targetColumn, undefined);

        // Verify removal
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns.length, 2);
        assert.strictEqual(board.columns.find(c => c.name === 'In Progress'), undefined);
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should remove column and move items to target', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnRemove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Backlog',
          targetColumn: 'In Progress'
        });

        assert.strictEqual(result.removedColumn, 'Backlog');
        assert.strictEqual(result.itemsRemoved, 3);
        assert.strictEqual(result.targetColumn, 'In Progress');
        assert.strictEqual(result.itemsMoved, 3);

        // Verify items moved
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns.length, 2);
        const inProgress = board.columns.find(c => c.name === 'In Progress');
        assert.strictEqual(inProgress?.items.length, 4); // 1 original + 3 moved
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject removing column with items without target', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnRemove({
              vault: tmpDir,
              board: 'board.md',
              name: 'Backlog'
            });
          },
          /contains.*item.*Specify targetColumn/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject invalid target column', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnRemove({
              vault: tmpDir,
              board: 'board.md',
              name: 'Backlog',
              targetColumn: 'NonExistent'
            });
          },
          /Target column.*not found/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject moving items to self', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnRemove({
              vault: tmpDir,
              board: 'board.md',
              name: 'Backlog',
              targetColumn: 'Backlog'
            });
          },
          /Cannot move items to the same column/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject nonexistent column', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnRemove({
              vault: tmpDir,
              board: 'board.md',
              name: 'NonExistent'
            });
          },
          /not found/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('kanban_column_rename', () => {
    test('should rename column', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnRename({
          vault: tmpDir,
          board: 'board.md',
          oldName: 'Backlog',
          newName: 'Todo'
        });

        assert.strictEqual(result.oldName, 'Backlog');
        assert.strictEqual(result.newName, 'Todo');
        assert.strictEqual(result.column.name, 'Todo');
        assert.strictEqual(result.column.items.length, 3);

        // Verify in file
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'Todo');
        assert.strictEqual(board.columns[0]?.items.length, 3); // Items preserved
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should preserve all items when renaming', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        // Get original items
        const before = await readKanbanFile(boardPath);
        const originalItems = before.columns.find(c => c.name === 'Backlog')?.items;

        await kanbanColumnRename({
          vault: tmpDir,
          board: 'board.md',
          oldName: 'Backlog',
          newName: 'Todo'
        });

        // Verify items unchanged
        const after = await readKanbanFile(boardPath);
        const renamedItems = after.columns.find(c => c.name === 'Todo')?.items;
        assert.deepStrictEqual(renamedItems, originalItems);
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject duplicate name', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnRename({
              vault: tmpDir,
              board: 'board.md',
              oldName: 'Backlog',
              newName: 'Done'
            });
          },
          /already exists/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject nonexistent column', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnRename({
              vault: tmpDir,
              board: 'board.md',
              oldName: 'NonExistent',
              newName: 'Todo'
            });
          },
          /not found/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject invalid parameters', async () => {
      await assert.rejects(
        async () => {
          await kanbanColumnRename({
            vault: '/vault',
            board: 'board.md',
            oldName: '',
            newName: 'Todo'
          });
        },
        /Old column name cannot be empty/
      );

      await assert.rejects(
        async () => {
          await kanbanColumnRename({
            vault: '/vault',
            board: 'board.md',
            oldName: 'Backlog',
            newName: ''
          });
        },
        /New column name cannot be empty/
      );
    });
  });

  describe('kanban_column_move', () => {
    test('should move column to start', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnMove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Done',
          position: 0
        });

        assert.strictEqual(result.columnName, 'Done');
        assert.strictEqual(result.oldPosition, 2);
        assert.strictEqual(result.newPosition, 0);

        // Verify order
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'Done');
        assert.strictEqual(board.columns[1]?.name, 'Backlog');
        assert.strictEqual(board.columns[2]?.name, 'In Progress');
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should move column to middle', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnMove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Backlog',
          position: 1
        });

        assert.strictEqual(result.oldPosition, 0);
        assert.strictEqual(result.newPosition, 1);

        // Verify order
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'In Progress');
        assert.strictEqual(board.columns[1]?.name, 'Backlog');
        assert.strictEqual(board.columns[2]?.name, 'Done');
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should move column to end', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnMove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Backlog',
          position: 2
        });

        assert.strictEqual(result.oldPosition, 0);
        assert.strictEqual(result.newPosition, 2);

        // Verify order
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'In Progress');
        assert.strictEqual(board.columns[1]?.name, 'Done');
        assert.strictEqual(board.columns[2]?.name, 'Backlog');
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should no-op when already at target position', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const result = await kanbanColumnMove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Backlog',
          position: 0
        });

        assert.strictEqual(result.oldPosition, 0);
        assert.strictEqual(result.newPosition, 0);

        // Verify order unchanged
        const board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'Backlog');
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should preserve items when moving', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        const before = await readKanbanFile(boardPath);
        const originalItems = before.columns.find(c => c.name === 'Backlog')?.items;

        await kanbanColumnMove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Backlog',
          position: 2
        });

        const after = await readKanbanFile(boardPath);
        const movedItems = after.columns.find(c => c.name === 'Backlog')?.items;
        assert.deepStrictEqual(movedItems, originalItems);
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject position out of bounds', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnMove({
              vault: tmpDir,
              board: 'board.md',
              name: 'Backlog',
              position: 10
            });
          },
          /out of bounds/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject nonexistent column', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        await assert.rejects(
          async () => {
            await kanbanColumnMove({
              vault: tmpDir,
              board: 'board.md',
              name: 'NonExistent',
              position: 0
            });
          },
          /not found/
        );
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    test('should reject negative position', async () => {
      await assert.rejects(
        async () => {
          await kanbanColumnMove({
            vault: '/vault',
            board: 'board.md',
            name: 'Backlog',
            position: -1
          });
        },
        /Position must be non-negative/
      );
    });
  });

  describe('column operations integration', () => {
    test('should support complex column workflow', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      try {
        const boardPath = join(tmpDir, 'board.md');
        await writeFile(boardPath, createTestBoardContent());

        // 1. Add new column
        await kanbanColumnAdd({
          vault: tmpDir,
          board: 'board.md',
          name: 'Review',
          position: 2
        });

        let board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns.length, 4);
        assert.strictEqual(board.columns[2]?.name, 'Review');

        // 2. Rename column
        await kanbanColumnRename({
          vault: tmpDir,
          board: 'board.md',
          oldName: 'Backlog',
          newName: 'Todo'
        });

        board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[0]?.name, 'Todo');

        // 3. Move column
        await kanbanColumnMove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Review',
          position: 1
        });

        board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns[1]?.name, 'Review');

        // 4. Remove column with items migration
        await kanbanColumnRemove({
          vault: tmpDir,
          board: 'board.md',
          name: 'Todo',
          targetColumn: 'Review'
        });

        board = await readKanbanFile(boardPath);
        assert.strictEqual(board.columns.length, 3);
        assert.strictEqual(board.columns.find(c => c.name === 'Todo'), undefined);
        const review = board.columns.find(c => c.name === 'Review');
        assert.strictEqual(review?.items.length, 3); // Items from Todo
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
