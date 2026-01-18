import { mergeCSPDirectives } from '../src/merge';
import type { CSPDirectives } from '../src/types';

describe('mergeCSPDirectives', () => {
  it('should merge multiple policies', () => {
    const policy1: CSPDirectives = {
      'script-src': ["'self'"],
    };

    const policy2: CSPDirectives = {
      'script-src': ['https://cdn.example.com'],
    };

    const merged = mergeCSPDirectives(policy1, policy2);

    expect(merged['script-src']).toContain("'self'");
    expect(merged['script-src']).toContain('https://cdn.example.com');
  });

  it('should deduplicate sources', () => {
    const policy1: CSPDirectives = {
      'script-src': ["'self'", 'https://cdn.example.com'],
    };

    const policy2: CSPDirectives = {
      'script-src': ["'self'", 'https://other.com'],
    };

    const merged = mergeCSPDirectives(policy1, policy2);

    const selfCount = merged['script-src']!.filter(
      (s) => s === "'self'",
    ).length;
    expect(selfCount).toBe(1);
  });

  it('should merge multiple directives', () => {
    const policy1: CSPDirectives = {
      'script-src': ["'self'"],
      'style-src': ["'self'"],
    };

    const policy2: CSPDirectives = {
      'img-src': ['https://images.com'],
      'font-src': ['https://fonts.com'],
    };

    const merged = mergeCSPDirectives(policy1, policy2);

    expect(merged['script-src']).toBeDefined();
    expect(merged['style-src']).toBeDefined();
    expect(merged['img-src']).toBeDefined();
    expect(merged['font-src']).toBeDefined();
  });

  it('should handle empty policies', () => {
    const policy1: CSPDirectives = {};
    const policy2: CSPDirectives = {
      'script-src': ["'self'"],
    };

    const merged = mergeCSPDirectives(policy1, policy2);

    expect(merged['script-src']).toContain("'self'");
  });

  it('should handle empty source arrays', () => {
    const policy1: CSPDirectives = {
      'script-src': [],
    };

    const policy2: CSPDirectives = {
      'script-src': ["'self'"],
    };

    const merged = mergeCSPDirectives(policy1, policy2);

    expect(merged['script-src']).toContain("'self'");
  });

  it('should merge more than two policies', () => {
    const policy1: CSPDirectives = { 'script-src': ['https://a.com'] };
    const policy2: CSPDirectives = { 'script-src': ['https://b.com'] };
    const policy3: CSPDirectives = { 'script-src': ['https://c.com'] };

    const merged = mergeCSPDirectives(policy1, policy2, policy3);

    expect(merged['script-src']).toHaveLength(3);
    expect(merged['script-src']).toContain('https://a.com');
    expect(merged['script-src']).toContain('https://b.com');
    expect(merged['script-src']).toContain('https://c.com');
  });

  it('should preserve order of sources', () => {
    const policy1: CSPDirectives = {
      'script-src': ["'self'", 'https://first.com'],
    };

    const policy2: CSPDirectives = {
      'script-src': ['https://second.com'],
    };

    const merged = mergeCSPDirectives(policy1, policy2);

    expect(merged['script-src']![0]).toBe("'self'");
    expect(merged['script-src']![1]).toBe('https://first.com');
    expect(merged['script-src']![2]).toBe('https://second.com');
  });
});
