/**
 * Tests for file operations utility
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readKanbanFile, writeKanbanFile, listKanbanFiles } from '../../src/utils/file-ops.js';
import type { Board } from '../../src/types/board.js';

describe('file-ops', () => {
  describe('readKanbanFile', () => {
    test('should read and parse a valid kanban file', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const testFile = join(tempDir, 'test.md');
      
      const content = `---
kanban-plugin: basic
---

## Backlog

- [ ] Task 1
- [ ] Task 2

## Done

- [x] Completed task

%% kanban:settings
\`\`\`
{"kanban-plugin":"basic"}
\`\`\`
%%
`;
      
      await writeFile(testFile, content, 'utf-8');
      
      try {
        const board = await readKanbanFile(testFile);
        
        assert.strictEqual(board.path, testFile);
        assert.strictEqual(board.settings['kanban-plugin'], 'basic');
        assert.strictEqual(board.columns.length, 2);
        assert.strictEqual(board.columns[0]!.name, 'Backlog');
        assert.strictEqual(board.columns[0]!.items.length, 2);
        assert.strictEqual(board.columns[1]!.name, 'Done');
        assert.strictEqual(board.columns[1]!.items[0]!.completed, true);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should throw error if file does not exist', async () => {
      await assert.rejects(
        async () => await readKanbanFile('/nonexistent/file.md'),
        /Failed to read kanban file/
      );
    });
    
    test('should handle UTF-8 encoding properly', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const testFile = join(tempDir, 'unicode.md');
      
      const content = `---
kanban-plugin: basic
---

## 📋 Backlog

- [ ] Task with emoji 🚀
- [ ] Unicode chars: αβγ δεζ
`;
      
      await writeFile(testFile, content, 'utf-8');
      
      try {
        const board = await readKanbanFile(testFile);
        
        assert.strictEqual(board.columns[0]!.name, '📋 Backlog');
        assert.strictEqual(board.columns[0]!.items[0]!.text, 'Task with emoji 🚀');
        assert.ok(board.columns[0]!.items[1]!.text.includes('αβγ'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
  
  describe('writeKanbanFile', () => {
    test('should write board with atomic pattern', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const testFile = join(tempDir, 'test.md');
      
      const board: Board = {
        path: testFile,
        settings: { 'kanban-plugin': 'basic' },
        columns: [
          {
            name: 'Backlog',
            items: [
              { text: 'Task 1', completed: false }
            ]
          }
        ]
      };
      
      try {
        await writeKanbanFile(testFile, board);
        
        const content = await readFile(testFile, 'utf-8');
        
        assert.ok(content.includes('kanban-plugin: basic'));
        assert.ok(content.includes('## Backlog'));
        assert.ok(content.includes('- [ ] Task 1'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should overwrite existing file', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const testFile = join(tempDir, 'test.md');
      
      // Write first version
      const board1: Board = {
        path: testFile,
        settings: { 'kanban-plugin': 'basic' },
        columns: [{ name: 'Col1', items: [] }]
      };
      await writeKanbanFile(testFile, board1);
      
      // Overwrite with second version
      const board2: Board = {
        path: testFile,
        settings: { 'kanban-plugin': 'basic' },
        columns: [{ name: 'Col2', items: [] }]
      };
      await writeKanbanFile(testFile, board2);
      
      try {
        const content = await readFile(testFile, 'utf-8');
        
        assert.ok(content.includes('## Col2'));
        assert.ok(!content.includes('## Col1'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should handle UTF-8 encoding properly', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const testFile = join(tempDir, 'unicode.md');
      
      const board: Board = {
        path: testFile,
        settings: { 'kanban-plugin': 'basic' },
        columns: [
          {
            name: '📋 Tasks',
            items: [
              { text: 'Unicode test: αβγ δεζ 🚀', completed: false }
            ]
          }
        ]
      };
      
      try {
        await writeKanbanFile(testFile, board);
        
        const content = await readFile(testFile, 'utf-8');
        
        assert.ok(content.includes('📋 Tasks'));
        assert.ok(content.includes('αβγ δεζ 🚀'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should create parent directories if needed', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      const testFile = join(tempDir, 'nested', 'deep', 'test.md');
      
      const board: Board = {
        path: testFile,
        settings: { 'kanban-plugin': 'basic' },
        columns: []
      };
      
      try {
        // Create parent directory structure first
        await mkdir(join(tempDir, 'nested', 'deep'), { recursive: true });
        await writeKanbanFile(testFile, board);
        
        const content = await readFile(testFile, 'utf-8');
        assert.ok(content.includes('kanban-plugin'));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
  
  describe('listKanbanFiles', () => {
    test('should list all kanban files in directory', async () => {
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
      await writeFile(join(tempDir, 'notes.md'), '# Regular notes\n', 'utf-8');
      
      // Create non-.md file
      await writeFile(join(tempDir, 'data.json'), '{}', 'utf-8');
      
      try {
        const files = await listKanbanFiles(tempDir);
        
        assert.strictEqual(files.length, 2);
        assert.ok(files.some(f => f.endsWith('board1.md')));
        assert.ok(files.some(f => f.endsWith('board2.md')));
        assert.ok(!files.some(f => f.endsWith('notes.md')));
        assert.ok(!files.some(f => f.endsWith('data.json')));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should return empty array if no kanban files found', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      await writeFile(join(tempDir, 'notes.md'), '# Regular notes\n', 'utf-8');
      
      try {
        const files = await listKanbanFiles(tempDir);
        assert.strictEqual(files.length, 0);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
    
    test('should throw error if directory does not exist', async () => {
      await assert.rejects(
        async () => await listKanbanFiles('/nonexistent/directory'),
        /Failed to list kanban files/
      );
    });
    
    test('should only search direct children (non-recursive)', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'kanban-test-'));
      
      // Create kanban file in root
      await writeFile(join(tempDir, 'root.md'), `---
kanban-plugin: basic
---
## Col1
`, 'utf-8');
      
      // Create subdirectory with kanban file
      await mkdir(join(tempDir, 'subdir'));
      await writeFile(join(tempDir, 'subdir', 'nested.md'), `---
kanban-plugin: basic
---
## Col2
`, 'utf-8');
      
      try {
        const files = await listKanbanFiles(tempDir);
        
        assert.strictEqual(files.length, 1);
        assert.ok(files[0]!.endsWith('root.md'));
        assert.ok(!files.some(f => f.includes('nested.md')));
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
