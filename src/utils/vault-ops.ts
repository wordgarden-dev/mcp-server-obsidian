/**
 * Vault operations for Obsidian vault management
 * Cross-platform utilities for vault registration, initialization, and plugin management
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir, platform } from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import https from 'node:https';

const execAsync = promisify(exec);

/**
 * Get the Obsidian config directory based on platform
 */
export function getObsidianConfigDir(): string {
  const plat = platform();
  
  if (plat === 'win32') {
    return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'obsidian');
  } else if (plat === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'obsidian');
  } else {
    // Linux
    return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'obsidian');
  }
}

/**
 * Get the path to obsidian.json config file
 */
export function getObsidianConfigPath(): string {
  return join(getObsidianConfigDir(), 'obsidian.json');
}

/**
 * ObsidianConfig type
 */
export interface ObsidianConfig {
  vaults: Record<string, {
    path: string;
    ts: number;
    open?: boolean;
  }>;
}

/**
 * Load Obsidian's vault configuration
 */
export async function loadObsidianConfig(): Promise<ObsidianConfig> {
  try {
    const configPath = getObsidianConfigPath();
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Return empty config if file doesn't exist
    return { vaults: {} };
  }
}

/**
 * Save Obsidian's vault configuration
 */
export async function saveObsidianConfig(config: ObsidianConfig): Promise<void> {
  const configPath = getObsidianConfigPath();
  const configDir = getObsidianConfigDir();
  
  // Ensure config directory exists
  await mkdir(configDir, { recursive: true });
  
  // Write config file
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Register a vault in Obsidian's global config
 */
export async function registerVault(vaultPath: string, vaultId?: string): Promise<string> {
  const config = await loadObsidianConfig();
  const id = vaultId || basename(vaultPath);
  
  // Normalize path for the platform
  const normalizedPath = platform() === 'win32' 
    ? vaultPath.replace(/\//g, '\\')
    : vaultPath;
  
  config.vaults[id] = {
    path: normalizedPath,
    ts: Date.now()
  };
  
  await saveObsidianConfig(config);
  return id;
}

/**
 * Initialize a vault's .obsidian folder with required config files
 */
export async function initializeVault(vaultPath: string): Promise<string> {
  const obsidianDir = join(vaultPath, '.obsidian');
  const pluginsDir = join(obsidianDir, 'plugins');
  
  // Create directories
  await mkdir(obsidianDir, { recursive: true });
  await mkdir(pluginsDir, { recursive: true });
  
  // Create minimal config files
  const configs: Record<string, any> = {
    'app.json': {},
    'appearance.json': {},
    'community-plugins.json': [],
    'workspace.json': {}
  };
  
  for (const [file, content] of Object.entries(configs)) {
    const filePath = join(obsidianDir, file);
    try {
      // Only create if doesn't exist
      await readFile(filePath);
    } catch {
      await writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
    }
  }
  
  return obsidianDir;
}

/**
 * Plugin registry - maps plugin IDs to GitHub repos
 */
export const PLUGIN_REGISTRY: Record<string, {
  repo: string;
  files: string[];
}> = {
  'obsidian-kanban': {
    repo: 'mgmeyers/obsidian-kanban',
    files: ['main.js', 'manifest.json', 'styles.css']
  }
};

/**
 * GitHub release asset
 */
interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

/**
 * GitHub release
 */
interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

/**
 * Download a file from URL to destination
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(dest);
    
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        const location = response.headers.location;
        if (location) {
          downloadFile(location, dest).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      require('fs').unlink(dest, () => {});
      reject(err);
    });
  });
}

/**
 * Get latest release from GitHub
 */
async function getLatestRelease(repo: string): Promise<GitHubRelease> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/latest`,
      headers: { 
        'User-Agent': 'mcp-server-obsidian',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Install a plugin from GitHub releases
 */
export async function installPlugin(vaultPath: string, pluginId: string): Promise<string> {
  const pluginInfo = PLUGIN_REGISTRY[pluginId];
  if (!pluginInfo) {
    throw new Error(`Unknown plugin: ${pluginId}. Available plugins: ${Object.keys(PLUGIN_REGISTRY).join(', ')}`);
  }
  
  const pluginDir = join(vaultPath, '.obsidian', 'plugins', pluginId);
  await mkdir(pluginDir, { recursive: true });
  
  // Fetch latest release
  const release = await getLatestRelease(pluginInfo.repo);
  
  // Download required files
  for (const fileName of pluginInfo.files) {
    const asset = release.assets.find(a => a.name === fileName);
    if (!asset) {
      // Skip optional files like styles.css
      continue;
    }
    
    const destPath = join(pluginDir, fileName);
    await downloadFile(asset.browser_download_url, destPath);
  }
  
  return pluginDir;
}

/**
 * Enable a plugin in the vault's community-plugins.json
 */
export async function enablePlugin(vaultPath: string, pluginId: string): Promise<void> {
  const configPath = join(vaultPath, '.obsidian', 'community-plugins.json');
  
  let plugins: string[] = [];
  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Handle legacy format (object with booleans)
    if (!Array.isArray(parsed)) {
      plugins = Object.keys(parsed).filter(k => parsed[k]);
    } else {
      plugins = parsed;
    }
  } catch {
    // File doesn't exist, start with empty array
    plugins = [];
  }
  
  // Add plugin if not already enabled
  if (!plugins.includes(pluginId)) {
    plugins.push(pluginId);
  }
  
  await writeFile(configPath, JSON.stringify(plugins, null, 2), 'utf-8');
}

/**
 * Open Obsidian with a specific vault/file using obsidian:// URI
 */
export async function openVault(vaultId: string, filePath?: string): Promise<void> {
  const encodedVault = encodeURIComponent(vaultId);
  let uri = `obsidian://open?vault=${encodedVault}`;
  
  if (filePath) {
    const encodedFile = encodeURIComponent(filePath);
    uri += `&file=${encodedFile}`;
  }
  
  // Open URI based on platform
  const plat = platform();
  
  try {
    if (plat === 'win32') {
      await execAsync(`start "" "${uri}"`);
    } else if (plat === 'darwin') {
      await execAsync(`open "${uri}"`);
    } else {
      // Linux - try xdg-open
      await execAsync(`xdg-open "${uri}"`);
    }
  } catch (error) {
    throw new Error(`Failed to open Obsidian: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all registered vaults
 */
export async function listVaults(): Promise<Array<{ id: string; path: string; ts: number }>> {
  const config = await loadObsidianConfig();
  return Object.entries(config.vaults).map(([id, vault]) => ({
    id,
    path: vault.path,
    ts: vault.ts
  }));
}
