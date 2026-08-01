import { describe, it, expect } from 'vitest';
import { normalizeMode } from '../src/utils';

describe('normalizeMode', () => {
    it('should return "light" when input is "light"', () => {
        expect(normalizeMode('light')).toBe('light');
    });

    it('should return "dark" when input is "dark"', () => {
        expect(normalizeMode('dark')).toBe('dark');
    });

    it('should default to "light" for undefined', () => {
        expect(normalizeMode(undefined)).toBe('light');
    });

    it('should default to "light" for empty string', () => {
        expect(normalizeMode('')).toBe('light');
    });

    it('should default to "light" for invalid string', () => {
        expect(normalizeMode('invalid')).toBe('light');
        expect(normalizeMode('Light')).toBe('light');
        expect(normalizeMode('DARK')).toBe('light');
    });
});
