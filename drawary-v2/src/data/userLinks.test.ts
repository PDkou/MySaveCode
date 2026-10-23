import { describe, expect, it } from 'vitest';
import { normalizeWebLink } from './userLinks';

describe('record link addresses', () => {
  it('opens full and bare web addresses', () => {
    expect(normalizeWebLink('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(normalizeWebLink('  http://example.com ')).toBe('http://example.com/');
    expect(normalizeWebLink('example.com')).toBe('https://example.com/');
    expect(normalizeWebLink('www.naver.com/path')).toBe('https://www.naver.com/path');
    expect(normalizeWebLink('localhost:8080')).toBeNull();
  });
  it('never opens other kinds of address or plain text', () => {
    for (const bad of ['javascript:alert(1)', 'intent://x#Intent;end', 'file:///etc/passwd', 'tel:123', 'mailto:a@b.co', '', '그냥 메모', 'a b.com', 'data:text/html,hi']) {
      expect(normalizeWebLink(bad)).toBeNull();
    }
  });
});
