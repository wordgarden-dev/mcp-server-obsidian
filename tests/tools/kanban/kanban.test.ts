/**
 * Tests for kanban CRUD tools
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { kanbanRead } from '../../../src/tools/kanban/read.js';
import { kanbanList } from '../../../src/tools/kanban/list.js';
import { kanbanCreate } from '../../../src/tools/kanban/create.js';
import { kanbanDelete } from '../../../src/tools/kanban/delete.js';

describe('kanban tools', () => {
  describe('kanban_read', () => {
    test('should read a kanban board', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      const content = `---
kanban-plugin: basic
---

## Backlog

- [ ] Task 1
- [ ] Task 2

## Done

- [x] Completed
`;
      
      await writeFile(join(tempDir, 'test.md'), content, 'utf-8');
      
      try {
        const board = await kanbanRead({
          vault: tempDir,
          board: 'test.md'
        });
        
        assert.strictEqual(board.settings['kanban-plugin'], 'basic');
        assert.strictEqual(board.columns.length, 2);
        assert.strictEqual(board.columns[0]!.name, 'Backlog');
        assert.strictEqual(board.columns[0]!.items.length, 2);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should validate parameters', async () => {
      await assert.rejects(
        async () => await kanbanRead({}),
        (error: Error) => error.name === 'ZodError'
      );
      
      await assert.rejects(
        async () => await kanbanRead({ vault: '/tmp' }),
        (error: Error) => error.name === 'ZodError'
      );
    });
    
    test('should throw error if board does not exist', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      try {
        await assert.rejects(
          async () => await kanbanRead({
            vault: tempDir,
            board: 'nonexistent.md'
          }),
          /Failed to read kanban file/
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should handle nested paths', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      await mkdir(join(tempDir, 'projects'), { recursive: true });
      await writeFile(join(tempDir, 'projects', 'board.md'), `---
kanban-plugin: basic
---
## Col1
`, 'utf-8');
      
      try {
        const board = await kanbanRead({
          vault: tempDir,
          board: 'projects/board.md'
        });
        
        assert.ok(board.path.includes('projects'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
  
  describe('kanban_list', () => {
    test('should list all kanban boards in vault root', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      // Create kanban files
      await writeFile(join(tempDir, 'board1.md'), `---
kanban-plugin: basic
---
## Col1
`, 'utf-8');
      
      await writeFile(join(tempDir, 'board2.md'), `---
kanban-plugin: basic
---
## Col2
`, 'utf-8');
      
      // Create non-kanban file
      await writeFile(join(tempDir, 'notes.md'), '# Notes\n', 'utf-8');
      
      try {
        const result = await kanbanList({ vault: tempDir });
        
        assert.strictEqual(result.boards.length, 2);
        assert.ok(result.boards.includes('board1.md'));
        assert.ok(result.boards.includes('board2.md'));
        assert.ok(!result.boards.includes('notes.md'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should list boards in subdirectory', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      await mkdir(join(tempDir, 'projects'), { recursive: true });
      await writeFile(join(tempDir, 'projects', 'board.md'), `---
kanban-plugin: basic
---
## Col1
`, 'utf-8');
      
      try {
        const result = await kanbanList({
          vault: tempDir,
          path: 'projects'
        });
        
        assert.strictEqual(result.boards.length, 1);
        assert.ok(result.boards[0]!.includes('projects'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should return empty array if no boards found', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      try {
        const result = await kanbanList({ vault: tempDir });
        
        assert.strictEqual(result.boards.length, 0);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should validate parameters', async () => {
      await assert.rejects(
        async () => await kanbanList({}),
        (error: Error) => error.name === 'ZodError'
      );
    });
  });
  
  describe('kanban_create', () => {
    test('should create a new kanban board', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      try {
        const result = await kanbanCreate({
          vault: tempDir,
          path: 'new-board.md',
          columns: ['Backlog', 'In Progress', 'Done']
        });
        
        assert.ok(result.path.includes('new-board.md'));
        assert.strictEqual(result.board.columns.length, 3);
        assert.strictEqual(result.board.columns[0]!.name, 'Backlog');
        assert.strictEqual(result.board.columns[1]!.name, 'In Progress');
        assert.strictEqual(result.board.columns[2]!.name, 'Done');
        assert.strictEqual(result.board.settings['kanban-plugin'], 'basic');
        
        // Verify board can be read back
        const board = await kanbanRead({
          vault: tempDir,
          board: 'new-board.md'
        });
        
        assert.strictEqual(board.columns.length, 3);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should create board with custom settings', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      try {
        const result = await kanbanCreate({
          vault: tempDir,
          path: 'board.md',
          columns: ['Col1'],
          settings: { 'kanban-plugin': 'advanced' }
        });
        
        assert.strictEqual(result.board.settings['kanban-plugin'], 'advanced');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should create nested directories', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      try {
        const result = await kanbanCreate({
          vault: tempDir,
          path: 'projects/work/board.md',
          columns: ['Todo']
        });
        
        assert.ok(result.path.includes('projects'));
        assert.ok(result.path.includes('work'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should throw error if board already exists', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      try {
        await kanbanCreate({
          vault: tempDir,
          path: 'board.md',
          columns: ['Col1']
        });
        
        await assert.rejects(
          async () => await kanbanCreate({
            vault: tempDir,
            path: 'board.md',
            columns: ['Col2']
          }),
          /already exists/
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should validate parameters', async () => {
      await assert.rejects(
        async () => await kanbanCreate({}),
        (error: Error) => error.name === 'ZodError'
      );
      
      await assert.rejects(
        async () => await kanbanCreate({ vault: '/tmp' }),
        (error: Error) => error.name === 'ZodError'
      );
      
      await assert.rejects(
        async () => await kanbanCreate({ vault: '/tmp', path: 'board.md' }),
        (error: Error) => error.name === 'ZodError'
      );
      
      await assert.rejects(
        async () => await kanbanCreate({ vault: '/tmp', path: 'board.md', columns: [] }),
        (error: Error) => error.name === 'ZodError'
      );
    });
  });
  
  describe('kanban_delete', () => {
    test('should delete a kanban board', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      await writeFile(join(tempDir, 'board.md'), `---
kanban-plugin: basic
---
## Col1
`, 'utf-8');
      
      try {
        const result = await kanbanDelete({
          vault: tempDir,
          board: 'board.md'
        });
        
        assert.strictEqual(result.deleted, true);
        assert.ok(result.path.includes('board.md'));
        
        // Verify board is gone
        await assert.rejects(
          async () => await kanbanRead({
            vault: tempDir,
            board: 'board.md'
          }),
          /Failed to read/
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should delete board in subdirectory', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      await mkdir(join(tempDir, 'projects'), { recursive: true });
      await writeFile(join(tempDir, 'projects', 'board.md'), `---
kanban-plugin: basic
---
## Col1
`, 'utf-8');
      
      try {
        const result = await kanbanDelete({
          vault: tempDir,
          board: 'projects/board.md'
        });
        
        assert.strictEqual(result.deleted, true);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should throw error if board does not exist', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      try {
        await assert.rejects(
          async () => await kanbanDelete({
            vault: tempDir,
            board: 'nonexistent.md'
          }),
          /does not exist/
        );
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should validate parameters', async () => {
      await assert.rejects(
        async () => await kanbanDelete({}),
        (error: Error) => error.name === 'ZodError'
      );
      
      await assert.rejects(
        async () => await kanbanDelete({ vault: '/tmp' }),
        (error: Error) => error.name === 'ZodError'
      );
    });
  });
});
