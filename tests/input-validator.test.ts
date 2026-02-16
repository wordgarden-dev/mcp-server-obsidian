/**
 * Comprehensive tests for input validation
 * Tests security protections, edge cases, and legitimate use cases
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateItemText, validateColumnName, InputValidationError } from '../src/utils/input-validator.js';

describe('validateItemText', () => {
  describe('Valid inputs', () => {
    it('should accept normal text', () => {
      const result = validateItemText('Implement feature X');
      assert.strictEqual(result, 'Implement feature X');
    });

    it('should accept bold markdown', () => {
      const result = validateItemText('**Bold text** and __also bold__');
      assert.strictEqual(result, '**Bold text** and __also bold__');
    });

    it('should accept italic markdown', () => {
      const result = validateItemText('*Italic* and _also italic_');
      assert.strictEqual(result, '*Italic* and _also italic_');
    });

    it('should accept markdown links', () => {
      const result = validateItemText('See [documentation](https://example.com)');
      assert.strictEqual(result, 'See [documentation](https://example.com)');
    });

    it('should accept inline code', () => {
      const result = validateItemText('Run `npm install` command');
      assert.strictEqual(result, 'Run `npm install` command');
    });

    it('should accept emojis', () => {
      const result = validateItemText('Add tests 🧪 for feature 🚀');
      assert.strictEqual(result, 'Add tests 🧪 for feature 🚀');
    });

    it('should accept multilingual text', () => {
      const result = validateItemText('日本語テキスト and Русский текст');
      assert.strictEqual(result, '日本語テキスト and Русский текст');
    });

    it('should accept text with tabs', () => {
      const result = validateItemText('Item\twith\ttabs');
      assert.strictEqual(result, 'Item\twith\ttabs');
    });

    it('should trim leading and trailing whitespace', () => {
      const result = validateItemText('  Trimmed text  ');
      assert.strictEqual(result, 'Trimmed text');
    });

    it('should accept text at maximum length (10KB)', () => {
      const maxText = 'x'.repeat(10240);
      const result = validateItemText(maxText);
      assert.strictEqual(result, maxText);
    });
  });

  describe('Invalid inputs - Security', () => {
    it('should reject null bytes', () => {
      assert.throws(
        () => validateItemText('Text\0with null byte'),
        InputValidationError
      );
      assert.throws(
        () => validateItemText('Text\0with null byte'),
        /null byte/
      );
    });

    it('should reject newlines (LF)', () => {
      assert.throws(
        () => validateItemText('Line 1\nLine 2'),
        InputValidationError
      );
      assert.throws(
        () => validateItemText('Line 1\nLine 2'),
        /newlines/
      );
    });

    it('should reject newlines (CRLF)', () => {
      assert.throws(
        () => validateItemText('Line 1\r\nLine 2'),
        InputValidationError
      );
      assert.throws(
        () => validateItemText('Line 1\r\nLine 2'),
        /newlines/
      );
    });

    it('should reject carriage returns', () => {
      assert.throws(
        () => validateItemText('Text\rWith CR'),
        InputValidationError
      );
    });

    it('should reject control characters (bell)', () => {
      assert.throws(
        () => validateItemText('Text\x07with bell'),
        InputValidationError
      );
      assert.throws(
        () => validateItemText('Text\x07with bell'),
        /control characters/
      );
    });

    it('should reject control characters (escape)', () => {
      assert.throws(
        () => validateItemText('Text\x1Bwith escape'),
        InputValidationError
      );
    });

    it('should reject text exceeding maximum length', () => {
      const tooLong = 'x'.repeat(10241);
      assert.throws(
        () => validateItemText(tooLong),
        InputValidationError
      );
      assert.throws(
        () => validateItemText(tooLong),
        /exceeds maximum length/
      );
    });
  });

  describe('Invalid inputs - Edge cases', () => {
    it('should reject empty string', () => {
      assert.throws(
        () => validateItemText(''),
        InputValidationError
      );
      assert.throws(
        () => validateItemText(''),
        /cannot be empty/
      );
    });

    it('should reject whitespace-only string', () => {
      assert.throws(
        () => validateItemText('   '),
        InputValidationError
      );
      assert.throws(
        () => validateItemText('   '),
        /cannot be empty/
      );
    });

    it('should reject non-string input', () => {
      assert.throws(
        () => validateItemText(123 as any),
        InputValidationError
      );
      assert.throws(
        () => validateItemText(123 as any),
        /must be a string/
      );
    });

    it('should reject string with only newlines', () => {
      assert.throws(
        () => validateItemText('\n\n\n'),
        InputValidationError
      );
    });
  });
});

describe('validateColumnName', () => {
  describe('Valid inputs', () => {
    it('should accept normal column name', () => {
      const result = validateColumnName('In Progress');
      assert.strictEqual(result, 'In Progress');
    });

    it('should accept single word', () => {
      const result = validateColumnName('TODO');
      assert.strictEqual(result, 'TODO');
    });

    it('should accept emojis', () => {
      const result = validateColumnName('Done ✅');
      assert.strictEqual(result, 'Done ✅');
    });

    it('should accept multilingual text', () => {
      const result = validateColumnName('完了 (Complete)');
      assert.strictEqual(result, '完了 (Complete)');
    });

    it('should trim whitespace', () => {
      const result = validateColumnName('  Backlog  ');
      assert.strictEqual(result, 'Backlog');
    });

    it('should accept column name at maximum length (200 chars)', () => {
      const maxName = 'x'.repeat(200);
      const result = validateColumnName(maxName);
      assert.strictEqual(result, maxName);
    });

    it('should accept column name with tabs', () => {
      const result = validateColumnName('Column\tName');
      assert.strictEqual(result, 'Column\tName');
    });
  });

  describe('Invalid inputs - Security', () => {
    it('should reject null bytes', () => {
      assert.throws(
        () => validateColumnName('Column\0Name'),
        InputValidationError
      );
      assert.throws(
        () => validateColumnName('Column\0Name'),
        /null byte/
      );
    });

    it('should reject newlines (LF)', () => {
      assert.throws(
        () => validateColumnName('Column\nName'),
        InputValidationError
      );
      assert.throws(
        () => validateColumnName('Column\nName'),
        /newlines/
      );
    });

    it('should reject newlines (CRLF)', () => {
      assert.throws(
        () => validateColumnName('Column\r\nName'),
        InputValidationError
      );
    });

    it('should reject carriage returns', () => {
      assert.throws(
        () => validateColumnName('Column\rName'),
        InputValidationError
      );
    });

    it('should reject control characters (bell)', () => {
      assert.throws(
        () => validateColumnName('Column\x07Name'),
        InputValidationError
      );
      assert.throws(
        () => validateColumnName('Column\x07Name'),
        /control characters/
      );
    });

    it('should reject control characters (backspace)', () => {
      assert.throws(
        () => validateColumnName('Column\x08Name'),
        InputValidationError
      );
    });

    it('should reject column name exceeding maximum length', () => {
      const tooLong = 'x'.repeat(201);
      assert.throws(
        () => validateColumnName(tooLong),
        InputValidationError
      );
      assert.throws(
        () => validateColumnName(tooLong),
        /exceeds maximum length/
      );
    });
  });

  describe('Invalid inputs - Edge cases', () => {
    it('should reject empty string', () => {
      assert.throws(
        () => validateColumnName(''),
        InputValidationError
      );
      assert.throws(
        () => validateColumnName(''),
        /cannot be empty/
      );
    });

    it('should reject whitespace-only string', () => {
      assert.throws(
        () => validateColumnName('   '),
        InputValidationError
      );
      assert.throws(
        () => validateColumnName('   '),
        /cannot be empty/
      );
    });

    it('should reject non-string input', () => {
      assert.throws(
        () => validateColumnName(null as any),
        InputValidationError
      );
      assert.throws(
        () => validateColumnName(null as any),
        /must be a string/
      );
    });

    it('should reject string with only newlines', () => {
      assert.throws(
        () => validateColumnName('\n\n'),
        InputValidationError
      );
    });
  });
});

describe('InputValidationError', () => {
  it('should have correct error name', () => {
    const error = new InputValidationError('Test error');
    assert.strictEqual(error.name, 'InputValidationError');
  });

  it('should have correct error message', () => {
    const error = new InputValidationError('Test error');
    assert.strictEqual(error.message, 'Test error');
  });

  it('should be instanceof Error', () => {
    const error = new InputValidationError('Test error');
    assert.ok(error instanceof Error);
  });

  it('should be instanceof InputValidationError', () => {
    const error = new InputValidationError('Test error');
    assert.ok(error instanceof InputValidationError);
  });
});

describe('Integration with common attack patterns', () => {
  it('should reject markdown injection via newlines in items', () => {
    // Attacker tries to inject new list items
    const malicious = 'Item 1\n- [ ] Injected item';
    assert.throws(
      () => validateItemText(malicious),
      InputValidationError
    );
  });

  it('should reject header injection in column names', () => {
    // Attacker tries to inject markdown headers
    const malicious = 'Column\n## Injected Header';
    assert.throws(
      () => validateColumnName(malicious),
      InputValidationError
    );
  });

  it('should reject file corruption via null bytes', () => {
    assert.throws(
      () => validateItemText('Normal\0Corrupted'),
      InputValidationError
    );
    assert.throws(
      () => validateColumnName('Normal\0Corrupted'),
      InputValidationError
    );
  });

  it('should reject DOS attack via excessive length in items', () => {
    const dos = 'x'.repeat(50000);
    assert.throws(
      () => validateItemText(dos),
      InputValidationError
    );
  });

  it('should reject DOS attack via excessive length in columns', () => {
    const dos = 'x'.repeat(1000);
    assert.throws(
      () => validateColumnName(dos),
      InputValidationError
    );
  });

  it('should preserve legitimate markdown in items', () => {
    const legitimate = '**Bold** _italic_ `code` [link](url)';
    const result = validateItemText(legitimate);
    assert.strictEqual(result, legitimate);
  });
});

describe('Boundary testing', () => {
  it('should accept item text at exactly 10240 characters', () => {
    const boundary = 'x'.repeat(10240);
    assert.doesNotThrow(() => validateItemText(boundary));
  });

  it('should reject item text at 10241 characters', () => {
    const overBoundary = 'x'.repeat(10241);
    assert.throws(
      () => validateItemText(overBoundary),
      InputValidationError
    );
  });

  it('should accept column name at exactly 200 characters', () => {
    const boundary = 'x'.repeat(200);
    assert.doesNotThrow(() => validateColumnName(boundary));
  });

  it('should reject column name at 201 characters', () => {
    const overBoundary = 'x'.repeat(201);
    assert.throws(
      () => validateColumnName(overBoundary),
      InputValidationError
    );
  });

  it('should accept single character item text', () => {
    const result = validateItemText('x');
    assert.strictEqual(result, 'x');
  });

  it('should accept single character column name', () => {
    const result = validateColumnName('X');
    assert.strictEqual(result, 'X');
  });
});
