/**
 * Tests for vault management tools
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultRegister } from '../../../src/tools/vault/register.js';
import { vaultInit } from '../../../src/tools/vault/init.js';
import { pluginEnable } from '../../../src/tools/vault/plugin_enable.js';
import { loadObsidianConfig } from '../../../src/utils/vault-ops.js';

describe('vault_register', () => {
  test('should register a vault in obsidian.json', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      const result = await vaultRegister({
        path: testVaultPath,
        id: 'test-vault'
      });

      assert.strictEqual(result.vaultId, 'test-vault');

      // Verify config was updated
      const config = await loadObsidianConfig();
      assert.ok(config.vaults['test-vault']);
      assert.ok(config.vaults['test-vault'].path.includes('test-vault'));
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should use folder name as default ID', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      const result = await vaultRegister({
        path: testVaultPath
      });

      assert.ok(result.vaultId.match(/test-vault-\d+/));
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should throw on invalid parameters', async () => {
    await assert.rejects(vaultRegister({ path: '' }));
    await assert.rejects(vaultRegister({}));
  });
});

describe('vault_init', () => {
  test('should create .obsidian folder structure', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      const result = await vaultInit({
        path: testVaultPath
      });

      assert.strictEqual(result.obsidianDir, join(testVaultPath, '.obsidian'));

      // Verify config files were created
      const appJson = await readFile(join(testVaultPath, '.obsidian', 'app.json'), 'utf-8');
      assert.deepStrictEqual(JSON.parse(appJson), {});

      const communityPlugins = await readFile(
        join(testVaultPath, '.obsidian', 'community-plugins.json'), 
        'utf-8'
      );
      assert.deepStrictEqual(JSON.parse(communityPlugins), []);
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should not overwrite existing config files', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      // Create existing config
      await mkdir(join(testVaultPath, '.obsidian'), { recursive: true });
      const customConfig = { custom: 'value' };
      await writeFile(
        join(testVaultPath, '.obsidian', 'app.json'),
        JSON.stringify(customConfig),
        'utf-8'
      );

      // Initialize vault
      await vaultInit({ path: testVaultPath });

      // Verify custom config was preserved
      const appJson = await readFile(join(testVaultPath, '.obsidian', 'app.json'), 'utf-8');
      assert.deepStrictEqual(JSON.parse(appJson), customConfig);
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should throw on invalid parameters', async () => {
    await assert.rejects(vaultInit({ path: '' }));
    await assert.rejects(vaultInit({}));
  });
});

describe('plugin_enable', () => {
  test('should enable a plugin in community-plugins.json', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      // Initialize vault first
      await vaultInit({ path: testVaultPath });

      const result = await pluginEnable({
        vault: testVaultPath,
        pluginId: 'obsidian-kanban'
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.pluginId, 'obsidian-kanban');

      // Verify plugin was added
      const configPath = join(testVaultPath, '.obsidian', 'community-plugins.json');
      const plugins = JSON.parse(await readFile(configPath, 'utf-8'));
      assert.ok(plugins.includes('obsidian-kanban'));
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should not duplicate plugins', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      await vaultInit({ path: testVaultPath });

      // Enable twice
      await pluginEnable({ vault: testVaultPath, pluginId: 'obsidian-kanban' });
      await pluginEnable({ vault: testVaultPath, pluginId: 'obsidian-kanban' });

      // Verify only one entry
      const configPath = join(testVaultPath, '.obsidian', 'community-plugins.json');
      const plugins = JSON.parse(await readFile(configPath, 'utf-8'));
      const count = plugins.filter((p: string) => p === 'obsidian-kanban').length;
      assert.strictEqual(count, 1);
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should handle legacy format (object with booleans)', async () => {
    const tempDir = tmpdir();
    const testVaultPath = join(tempDir, `test-vault-${Date.now()}`);
    await mkdir(testVaultPath, { recursive: true });

    try {
      await vaultInit({ path: testVaultPath });

      // Create legacy format
      const configPath = join(testVaultPath, '.obsidian', 'community-plugins.json');
      await writeFile(
        configPath,
        JSON.stringify({ 'other-plugin': true, 'disabled-plugin': false }),
        'utf-8'
      );

      // Enable new plugin
      await pluginEnable({ vault: testVaultPath, pluginId: 'obsidian-kanban' });

      // Verify conversion to array format
      const plugins = JSON.parse(await readFile(configPath, 'utf-8'));
      assert.ok(Array.isArray(plugins));
      assert.ok(plugins.includes('other-plugin'));
      assert.ok(plugins.includes('obsidian-kanban'));
      assert.ok(!plugins.includes('disabled-plugin'));
    } finally {
      await rm(testVaultPath, { recursive: true, force: true });
    }
  });

  test('should throw on invalid parameters', async () => {
    await assert.rejects(pluginEnable({ vault: '', pluginId: 'test' }));
    await assert.rejects(pluginEnable({ vault: '/fake/path', pluginId: '' }));
    await assert.rejects(pluginEnable({}));
  });
});
