/**
 * Input validation for user-supplied text content
 * Prevents markdown injection, DOS attacks, and file corruption
 */

/**
 * Error thrown when input validation fails
 */
export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputValidationError';
  }
}

/**
 * Maximum length for kanban item text (10KB)
 * Prevents DOS attacks via excessive memory/storage use
 */
const MAX_ITEM_TEXT_LENGTH = 10240;

/**
 * Maximum length for column names (200 characters)
 * Column names appear in headers and should be reasonably short
 */
const MAX_COLUMN_NAME_LENGTH = 200;

/**
 * Check if string contains null bytes
 * Null bytes can corrupt file content and break parsing
 */
function containsNullByte(text: string): boolean {
  return text.includes('\0');
}

/**
 * Check if string contains control characters (ASCII < 32)
 * Excludes tab (9) and newline (10) which may be legitimate
 * 
 * Control characters can break rendering and parsing:
 * - Bell (7), Backspace (8), Escape (27), etc.
 * - Form feed (12), vertical tab (11)
 * 
 * @param text - Text to check
 * @param allowNewlines - Whether to allow newlines (default: false)
 * @returns true if contains forbidden control characters
 */
function containsControlCharacters(text: string, allowNewlines = false): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    
    // Allow tab (9) in all cases
    if (code === 9) continue;
    
    // Allow newline (10) and carriage return (13) if permitted
    if (allowNewlines && (code === 10 || code === 13)) continue;
    
    // Reject all other control characters (0-31)
    if (code < 32) return true;
  }
  
  return false;
}

/**
 * Validate kanban item text
 * 
 * Security checks:
 * - No null bytes (prevents file corruption)
 * - No control characters except tab (prevents rendering issues)
 * - No newlines (breaks markdown list item structure)
 * - Maximum length 10KB (prevents DOS attacks)
 * - Not empty after trimming (ensures meaningful content)
 * 
 * Preserves legitimate markdown:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Links: [text](url)
 * - Code: `code` or ```code```
 * - All other markdown syntax
 * 
 * @param text - Raw item text from user input
 * @returns Trimmed and validated text
 * @throws InputValidationError if validation fails
 * 
 * @example
 * ```typescript
 * validateItemText("Implement feature X")  // OK
 * validateItemText("**Bold** and _italic_")  // OK (markdown preserved)
 * validateItemText("Line 1\nLine 2")  // THROW (newlines break list items)
 * validateItemText("\0malicious")  // THROW (null byte)
 * ```
 */
export function validateItemText(text: string): string {
  // Type check
  if (typeof text !== 'string') {
    throw new InputValidationError('Item text must be a string');
  }
  
  // Check for null bytes (security: file corruption)
  if (containsNullByte(text)) {
    throw new InputValidationError('Item text contains null byte');
  }
  
  // Check for control characters (security: rendering issues)
  // Allow newlines temporarily for checking, will reject below
  if (containsControlCharacters(text, true)) {
    throw new InputValidationError(
      'Item text contains forbidden control characters (ASCII < 32)'
    );
  }
  
  // Trim whitespace
  const trimmed = text.trim();
  
  // Check for newlines (security: breaks markdown list structure)
  // Must check AFTER trim to catch all newlines
  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    throw new InputValidationError(
      'Item text cannot contain newlines (breaks markdown list items)'
    );
  }
  
  // Check for empty string after trimming
  if (trimmed.length === 0) {
    throw new InputValidationError('Item text cannot be empty');
  }
  
  // Check maximum length (DOS protection)
  if (trimmed.length > MAX_ITEM_TEXT_LENGTH) {
    throw new InputValidationError(
      `Item text exceeds maximum length (${MAX_ITEM_TEXT_LENGTH} characters): ${trimmed.length} characters`
    );
  }
  
  return trimmed;
}

/**
 * Validate column name
 * 
 * Security checks:
 * - No null bytes (prevents file corruption)
 * - No control characters including newlines (prevents header corruption)
 * - Maximum length 200 characters (prevents excessive memory use)
 * - Not empty after trimming (ensures meaningful content)
 * 
 * Column names appear in markdown headers:
 * ```markdown
 * ## Column Name
 * ```
 * 
 * Newlines or control characters would corrupt this structure.
 * 
 * @param name - Raw column name from user input
 * @returns Trimmed and validated name
 * @throws InputValidationError if validation fails
 * 
 * @example
 * ```typescript
 * validateColumnName("In Progress")  // OK
 * validateColumnName("TODO 📝")  // OK (emojis allowed)
 * validateColumnName("Column\nName")  // THROW (newlines corrupt headers)
 * validateColumnName("x".repeat(300))  // THROW (too long)
 * ```
 */
export function validateColumnName(name: string): string {
  // Type check
  if (typeof name !== 'string') {
    throw new InputValidationError('Column name must be a string');
  }
  
  // Check for null bytes (security: file corruption)
  if (containsNullByte(name)) {
    throw new InputValidationError('Column name contains null byte');
  }
  
  // Check for newlines FIRST (more specific error message)
  // Must check BEFORE trimming to catch all newlines
  if (name.includes('\n') || name.includes('\r')) {
    throw new InputValidationError(
      'Column name cannot contain newlines (corrupts markdown headers)'
    );
  }
  
  // Check for control characters (security: header corruption)
  // Do NOT allow newlines in column names
  if (containsControlCharacters(name, false)) {
    throw new InputValidationError(
      'Column name contains forbidden control characters (ASCII < 32)'
    );
  }
  
  // Trim whitespace
  const trimmed = name.trim();
  
  // Check for empty string after trimming
  if (trimmed.length === 0) {
    throw new InputValidationError('Column name cannot be empty');
  }
  
  // Check maximum length (DOS protection + UI considerations)
  if (trimmed.length > MAX_COLUMN_NAME_LENGTH) {
    throw new InputValidationError(
      `Column name exceeds maximum length (${MAX_COLUMN_NAME_LENGTH} characters): ${trimmed.length} characters`
    );
  }
  
  return trimmed;
}
