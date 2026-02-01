import { AuthService } from '../authService';
import { UserModel } from '../../models/User';
import { hashPassword } from '../../utils/password';

// Mock UserModel
jest.mock('../../models/User');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      (UserModel.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register('testuser', 'Test123!', 'test@example.com');

      expect(result).toEqual(mockUser);
      expect(UserModel.create).toHaveBeenCalledWith(
        'testuser',
        expect.any(String), // hashed password
        'test@example.com'
      );
    });

    it('should throw error if username exists', async () => {
      (UserModel.create as jest.Mock).mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      await expect(
        AuthService.register('existinguser', 'Test123!')
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const password = 'Test123!';
      const hashedPassword = await hashPassword(password);

      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: hashedPassword,
      };

      (UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.login('testuser', password);

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
      });
    });

    it('should throw error with incorrect password', async () => {
      const hashedPassword = await hashPassword('CorrectPassword');

      const mockUser = {
        id: 1,
        username: 'testuser',
        password_hash: hashedPassword,
      };

      (UserModel.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        AuthService.login('testuser', 'WrongPassword')
      ).rejects.toThrow('Invalid username or password');
    });

    it('should throw error if user not found', async () => {
      (UserModel.findByUsername as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthService.login('nonexistent', 'password')
      ).rejects.toThrow('Invalid username or password');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(UserModel.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if user not found', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.getUserById(999);

      expect(result).toBeNull();
    });
  });
});
