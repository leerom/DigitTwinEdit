import { validate, registerSchema, loginSchema, createProjectSchema } from '../validation';
import { ZodError } from 'zod';

describe('Validation Utils', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        username: 'testuser',
        password: 'Test123!',
        email: 'test@example.com',
      };

      const result = validate(registerSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should reject username shorter than 3 characters', () => {
      const invalidData = {
        username: 'ab',
        password: 'Test123!',
      };

      expect(() => validate(registerSchema, invalidData)).toThrow(ZodError);
    });

    it('should reject username with special characters', () => {
      const invalidData = {
        username: 'test@user',
        password: 'Test123!',
      };

      expect(() => validate(registerSchema, invalidData)).toThrow(ZodError);
    });

    it('should reject password shorter than 6 characters', () => {
      const invalidData = {
        username: 'testuser',
        password: '12345',
      };

      expect(() => validate(registerSchema, invalidData)).toThrow(ZodError);
    });

    it('should accept optional email', () => {
      const validData = {
        username: 'testuser',
        password: 'Test123!',
      };

      const result = validate(registerSchema, validData);
      expect(result.username).toBe('testuser');
      expect(result.email).toBeUndefined();
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        username: 'testuser',
        password: 'Test123!',
        rememberMe: true,
      };

      const result = validate(loginSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should accept login without rememberMe', () => {
      const validData = {
        username: 'testuser',
        password: 'Test123!',
      };

      const result = validate(loginSchema, validData);
      expect(result.rememberMe).toBeUndefined();
    });

    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        password: 'Test123!',
      };

      expect(() => validate(loginSchema, invalidData)).toThrow(ZodError);
    });
  });

  describe('createProjectSchema', () => {
    it('should validate valid project data', () => {
      const validData = {
        name: 'My Project',
        description: 'A test project',
      };

      const result = validate(createProjectSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty project name', () => {
      const invalidData = {
        name: '',
      };

      expect(() => validate(createProjectSchema, invalidData)).toThrow(ZodError);
    });

    it('should accept project without description', () => {
      const validData = {
        name: 'My Project',
      };

      const result = validate(createProjectSchema, validData);
      expect(result.name).toBe('My Project');
      expect(result.description).toBeUndefined();
    });
  });
});
