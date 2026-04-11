import { escapeCsvValue, generateCsv, downloadCsv } from '../src';

describe('csv helpers', () => {
  describe('escapeCsvValue', () => {
    it('should return simple strings as-is', () => {
      expect(escapeCsvValue('hello')).toBe('hello');
    });

    it('should wrap values with commas in quotes', () => {
      expect(escapeCsvValue('hello, world')).toBe('"hello, world"');
    });

    it('should escape double quotes by doubling them', () => {
      expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    });

    it('should wrap values with newlines in quotes', () => {
      expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should join arrays with semicolons', () => {
      expect(escapeCsvValue(['id1', 'id2'])).toBe('id1; id2');
    });

    it('should handle null and undefined', () => {
      expect(escapeCsvValue(null)).toBe('');
      expect(escapeCsvValue(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(escapeCsvValue('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(escapeCsvValue(42)).toBe('42');
    });

    it('should handle arrays with commas in values', () => {
      expect(escapeCsvValue(['a, b', 'c'])).toBe('"a, b; c"');
    });

    describe('formula injection prevention', () => {
      it('should prefix values starting with = to prevent formula injection', () => {
        expect(escapeCsvValue('=1+1')).toBe("'=1+1");
      });

      it('should prefix and quote values starting with = that contain special chars', () => {
        // quotes trigger CSV quoting on top of the sanitization prefix
        expect(escapeCsvValue('=CMD("hack")')).toBe('"\'=CMD(""hack"")"');
      });

      it('should prefix values starting with +', () => {
        expect(escapeCsvValue('+1234')).toBe("'+1234");
      });

      it('should prefix values starting with -', () => {
        expect(escapeCsvValue('-1234')).toBe("'-1234");
      });

      it('should prefix values starting with @', () => {
        expect(escapeCsvValue('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      });

      it('should prefix values starting with tab character', () => {
        expect(escapeCsvValue('\t=evil')).toBe("'\t=evil");
      });

      it('should prefix values starting with carriage return', () => {
        expect(escapeCsvValue('\r=evil')).toBe("'\r=evil");
      });

      it('should not prefix normal values', () => {
        expect(escapeCsvValue('normal')).toBe('normal');
        expect(escapeCsvValue('127.0.0.1')).toBe('127.0.0.1');
        expect(escapeCsvValue('user@example.com')).toBe('user@example.com');
      });

      it('should handle formula injection in arrays', () => {
        expect(escapeCsvValue(['=evil', 'normal'])).toBe("'=evil; normal");
      });

      it('should sanitize =HYPERLINK attack', () => {
        const result = escapeCsvValue('=HYPERLINK("http://evil.com","click")');
        // prefix is added, then CSV quoting wraps and doubles internal quotes
        expect(result).toBe('"\'=HYPERLINK(""http://evil.com"",""click"")"');
      });
    });
  });

  describe('generateCsv', () => {
    const columns = [
      { header: 'Name', path: 'name' },
      { header: 'Email', path: 'email' },
      { header: 'Role', path: 'role' },
    ];

    it('should generate header row only for empty data', () => {
      const csv = generateCsv([], columns);
      expect(csv).toBe('Name,Email,Role');
    });

    it('should generate correct CSV rows', () => {
      const records = [
        { name: 'Alice', email: 'alice@example.com', role: 'Admin' },
        { name: 'Bob', email: 'bob@example.com', role: 'User' },
      ];
      const csv = generateCsv(records, columns);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('Name,Email,Role');
      expect(lines[1]).toBe('Alice,alice@example.com,Admin');
      expect(lines[2]).toBe('Bob,bob@example.com,User');
    });

    it('should handle missing fields as empty strings', () => {
      const records = [{ name: 'Alice' }];
      const csv = generateCsv(records, columns);
      const lines = csv.split('\n');
      expect(lines[1]).toBe('Alice,,');
    });

    it('should escape values with special characters', () => {
      const records = [
        { name: 'O"Brien', email: 'a, b', role: 'line1\nline2' },
      ];
      const csv = generateCsv(records, columns);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('"O""Brien"');
      expect(lines[1]).toContain('"a, b"');
    });

    it('should handle array values', () => {
      const records = [
        { name: 'Alice', email: 'a@b.com', role: ['Admin', 'User'] },
      ];
      const csv = generateCsv(records, columns);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('Admin; User');
    });
  });

  describe('downloadCsv', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should create a blob URL and trigger download', () => {
      const clickSpy = jest.fn();
      const setAttributeSpy = jest.fn();
      jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        setAttribute: setAttributeSpy,
        click: clickSpy,
      } as unknown as HTMLAnchorElement);
      const appendChildSpy = jest
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node);
      const removeChildSpy = jest
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => node);

      downloadCsv('header\nrow1', 'test.csv');

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(setAttributeSpy).toHaveBeenCalledWith('download', 'test.csv');
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      (document.createElement as jest.Mock).mockRestore();
    });
  });
});
