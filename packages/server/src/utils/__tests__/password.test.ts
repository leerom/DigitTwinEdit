import { hashPassword, verifyPassword } from '../password';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'Test123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'Test123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'Test123!';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Test123!';
      const hash = await hashPassword(password);

      const result = await verifyPassword('WrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('test');
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });
});
