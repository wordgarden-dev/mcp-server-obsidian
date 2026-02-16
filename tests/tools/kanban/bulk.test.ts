/**
 * Tests for bulk kanban operations
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm, writeFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { kanbanClone } from '../../../src/tools/kanban/bulk/clone.js';
import { kanbanMerge } from '../../../src/tools/kanban/bulk/merge.js';
import { kanbanArchiveDone } from '../../../src/tools/kanban/bulk/archive.js';
import { readKanbanFile } from '../../../src/utils/file-ops.js';

describe('kanban_clone', () => {
  test('should clone a board to a new file', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });
    
    // Get canonical path to avoid path resolution issues
    const canonicalVaultPath = await realpath(testVaultPath);

    try {
      // Create source board
      const sourceBoard = join(canonicalVaultPath, 'source.md');
      await writeFile(sourceBoard, `---
kanban-plugin: basic
---

## To Do

- [ ] Task 1
- [ ] Task 2

## Done

- [x] Completed task

`, 'utf-8');

      // Clone board
      const result = await kanbanClone({
        vault: canonicalVaultPath,
        sourceBoard: 'source.md',
        targetBoard: 'clone.md'
      });

      // Verify clone
      assert.strictEqual(result.columns.length, 2);
      assert.strictEqual(result.columns[0]?.name, 'To Do');
      assert.strictEqual(result.columns[0]?.items.length, 2);
      assert.strictEqual(result.columns[1]?.name, 'Done');
      assert.strictEqual(result.columns[1]?.items.length, 1);
      assert.strictEqual(result.columns[1]?.items[0]?.completed, true);

      // Verify file was created
      const clonedBoard = await readKanbanFile(join(canonicalVaultPath, 'clone.md'));
      assert.strictEqual(clonedBoard.columns.length, 2);
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should throw on invalid parameters', async () => {
    await assert.rejects(kanbanClone({
      vault: '',
      sourceBoard: 'source.md',
      targetBoard: 'target.md'
    }));
  });
});

describe('kanban_merge', () => {
  test('should merge items from multiple boards', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      // Create board A
      await writeFile(join(testVaultPath, 'board-a.md'), `---
kanban-plugin: basic
---

## To Do

- [ ] Task A1
- [ ] Task A2

## In Progress

- [ ] Task A3

`, 'utf-8');

      // Create board B
      await writeFile(join(testVaultPath, 'board-b.md'), `---
kanban-plugin: basic
---

## To Do

- [ ] Task B1

## Done

- [x] Task B2

`, 'utf-8');

      // Merge boards
      const result = await kanbanMerge({
        vault: testVaultPath,
        sourceBoards: ['board-a.md', 'board-b.md'],
        targetBoard: 'merged.md'
      });

      // Verify merge
      assert.strictEqual(result.columns.length, 3);
      
      const todoColumn = result.columns.find(c => c.name === 'To Do');
      assert.ok(todoColumn);
      assert.strictEqual(todoColumn.items.length, 3);
      assert.ok(todoColumn.items.map(i => i.text).includes('Task A1'));
      assert.ok(todoColumn.items.map(i => i.text).includes('Task B1'));

      const inProgressColumn = result.columns.find(c => c.name === 'In Progress');
      assert.ok(inProgressColumn);
      assert.strictEqual(inProgressColumn.items.length, 1);

      const doneColumn = result.columns.find(c => c.name === 'Done');
      assert.ok(doneColumn);
      assert.strictEqual(doneColumn.items.length, 1);
      assert.strictEqual(doneColumn.items[0]?.completed, true);
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should avoid duplicate items', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      // Create boards with duplicate items
      await writeFile(join(testVaultPath, 'board-a.md'), `---
kanban-plugin: basic
---

## To Do

- [ ] Shared task
- [ ] Unique task A

`, 'utf-8');

      await writeFile(join(testVaultPath, 'board-b.md'), `---
kanban-plugin: basic
---

## To Do

- [ ] Shared task
- [ ] Unique task B

`, 'utf-8');

      // Merge
      const result = await kanbanMerge({
        vault: testVaultPath,
        sourceBoards: ['board-a.md', 'board-b.md'],
        targetBoard: 'merged.md'
      });

      // Verify no duplicates
      const todoColumn = result.columns.find(c => c.name === 'To Do');
      assert.ok(todoColumn);
      assert.strictEqual(todoColumn.items.length, 3);
      const sharedTasks = todoColumn.items.filter(i => i.text === 'Shared task');
      assert.strictEqual(sharedTasks.length, 1);
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });
});

describe('kanban_archive_done', () => {
  test('should move completed items to Archive column', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      await writeFile(join(testVaultPath, 'board.md'), `---
kanban-plugin: basic
---

## To Do

- [ ] Active task 1
- [x] Done task 1
- [ ] Active task 2

## In Progress

- [x] Done task 2
- [ ] Active task 3

## Done

- [x] Already done task

`, 'utf-8');

      // Archive completed items
      const result = await kanbanArchiveDone({
        vault: testVaultPath,
        board: 'board.md'
      });

      // Verify items were moved
      const todoColumn = result.columns.find(c => c.name === 'To Do');
      assert.ok(todoColumn);
      assert.strictEqual(todoColumn.items.length, 2);
      assert.ok(todoColumn.items.every(i => !i.completed));

      const inProgressColumn = result.columns.find(c => c.name === 'In Progress');
      assert.ok(inProgressColumn);
      assert.strictEqual(inProgressColumn.items.length, 1);
      assert.strictEqual(inProgressColumn.items[0]?.completed, false);

      const archiveColumn = result.columns.find(c => c.name === 'Archive');
      assert.ok(archiveColumn);
      assert.strictEqual(archiveColumn.items.length, 3);
      assert.ok(archiveColumn.items.every(i => i.completed));
      
      const archivedTexts = archiveColumn.items.map(i => i.text);
      assert.ok(archivedTexts.includes('Done task 1'));
      assert.ok(archivedTexts.includes('Done task 2'));
      assert.ok(archivedTexts.includes('Already done task'));
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should use custom archive column name', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      await writeFile(join(testVaultPath, 'board.md'), `---
kanban-plugin: basic
---

## To Do

- [x] Done task

`, 'utf-8');

      const result = await kanbanArchiveDone({
        vault: testVaultPath,
        board: 'board.md',
        archiveColumn: 'Completed'
      });

      const archiveColumn = result.columns.find(c => c.name === 'Completed');
      assert.ok(archiveColumn);
      assert.strictEqual(archiveColumn.items.length, 1);
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should throw on invalid parameters', async () => {
    await assert.rejects(kanbanArchiveDone({
      vault: '',
      board: 'board.md'
    }));
  });
});
