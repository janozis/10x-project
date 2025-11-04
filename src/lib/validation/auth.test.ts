import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, resetPasswordSchema } from './auth';

describe('auth validation', () => {
  describe('registerSchema', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'ValidPass123',
      confirmPassword: 'ValidPass123',
    };

    it('should accept valid password with min 8 chars and reject shorter', () => {
      // Arrange
      const validPassword = { ...validRegisterData, password: 'Valid123', confirmPassword: 'Valid123' };
      const tooShort = { ...validRegisterData, password: 'Valid12', confirmPassword: 'Valid12' }; // 7 chars

      // Act
      const resultValid = registerSchema.safeParse(validPassword);
      const resultTooShort = registerSchema.safeParse(tooShort);

      // Assert
      expect(resultValid.success).toBe(true);
      expect(resultTooShort.success).toBe(false);
      
      if (!resultTooShort.success) {
        const error = resultTooShort.error.issues.find((issue) => issue.path[0] === 'password');
        expect(error?.message).toContain('co najmniej 8 znaków');
      }
    });

    it('should enforce password regex rules (lowercase, uppercase, digit)', () => {
      // Arrange - Missing lowercase
      const noLowercase = { ...validRegisterData, password: 'VALIDPASS123', confirmPassword: 'VALIDPASS123' };
      
      // Missing uppercase
      const noUppercase = { ...validRegisterData, password: 'validpass123', confirmPassword: 'validpass123' };
      
      // Missing digit
      const noDigit = { ...validRegisterData, password: 'ValidPass', confirmPassword: 'ValidPass' };
      
      // Valid - all requirements met
      const allValid = validRegisterData;

      // Act
      const resultNoLowercase = registerSchema.safeParse(noLowercase);
      const resultNoUppercase = registerSchema.safeParse(noUppercase);
      const resultNoDigit = registerSchema.safeParse(noDigit);
      const resultAllValid = registerSchema.safeParse(allValid);

      // Assert - Missing requirements should fail
      expect(resultNoLowercase.success).toBe(false);
      expect(resultNoUppercase.success).toBe(false);
      expect(resultNoDigit.success).toBe(false);
      
      // Assert - Valid should pass
      expect(resultAllValid.success).toBe(true);

      // Check specific error messages
      if (!resultNoLowercase.success) {
        const error = resultNoLowercase.error.issues.find((issue) => issue.message.includes('mała litera'));
        expect(error).toBeDefined();
      }
      
      if (!resultNoUppercase.success) {
        const error = resultNoUppercase.error.issues.find((issue) => issue.message.includes('wielka litera'));
        expect(error).toBeDefined();
      }
      
      if (!resultNoDigit.success) {
        const error = resultNoDigit.error.issues.find((issue) => issue.message.includes('cyfra'));
        expect(error).toBeDefined();
      }
    });

    it('should reject when password and confirmPassword do not match', () => {
      // Arrange
      const mismatchedPasswords = {
        email: 'test@example.com',
        password: 'ValidPass123',
        confirmPassword: 'DifferentPass456',
      };

      const matchingPasswords = validRegisterData;

      // Act
      const resultMismatch = registerSchema.safeParse(mismatchedPasswords);
      const resultMatch = registerSchema.safeParse(matchingPasswords);

      // Assert
      expect(resultMismatch.success).toBe(false);
      expect(resultMatch.success).toBe(true);

      // Check error path and message
      if (!resultMismatch.success) {
        const error = resultMismatch.error.issues.find((issue) => issue.path[0] === 'confirmPassword');
        expect(error).toBeDefined();
        expect(error?.message).toContain('muszą się zgadzać');
      }
    });

    it('should reject passwords containing spaces', () => {
      // Arrange
      const passwordWithSpaces = {
        email: 'test@example.com',
        password: 'Valid Pass123', // contains space
        confirmPassword: 'Valid Pass123',
      };

      const passwordWithLeadingSpace = {
        email: 'test@example.com',
        password: ' ValidPass123',
        confirmPassword: ' ValidPass123',
      };

      const passwordWithTrailingSpace = {
        email: 'test@example.com',
        password: 'ValidPass123 ',
        confirmPassword: 'ValidPass123 ',
      };

      // Act
      const resultWithSpaces = registerSchema.safeParse(passwordWithSpaces);
      const resultLeadingSpace = registerSchema.safeParse(passwordWithLeadingSpace);
      const resultTrailingSpace = registerSchema.safeParse(passwordWithTrailingSpace);

      // Assert - All should fail
      expect(resultWithSpaces.success).toBe(false);
      expect(resultLeadingSpace.success).toBe(false);
      expect(resultTrailingSpace.success).toBe(false);

      // Check error message
      if (!resultWithSpaces.success) {
        const error = resultWithSpaces.error.issues.find(
          (issue) => issue.message.includes('spacji')
        );
        expect(error).toBeDefined();
      }
    });

    it('should validate email format', () => {
      // Arrange - Invalid email formats
      const invalidEmails = [
        { ...validRegisterData, email: 'notanemail' },
        { ...validRegisterData, email: 'missing@domain' },
        { ...validRegisterData, email: '@nodomain.com' },
        { ...validRegisterData, email: 'spaces in@email.com' },
        { ...validRegisterData, email: '' },
      ];

      const validEmail = validRegisterData;

      // Act & Assert - Invalid emails should fail
      invalidEmails.forEach((data) => {
        const result = registerSchema.safeParse(data);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const error = result.error.issues.find((issue) => issue.path[0] === 'email');
          expect(error).toBeDefined();
        }
      });

      // Valid email should pass
      const resultValid = registerSchema.safeParse(validEmail);
      expect(resultValid.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('should require valid email and non-empty password', () => {
      // Arrange
      const validLogin = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const invalidEmail = {
        email: 'notanemail',
        password: 'anypassword',
      };

      const emptyPassword = {
        email: 'test@example.com',
        password: '',
      };

      const missingPassword = {
        email: 'test@example.com',
      };

      // Act
      const resultValid = loginSchema.safeParse(validLogin);
      const resultInvalidEmail = loginSchema.safeParse(invalidEmail);
      const resultEmptyPassword = loginSchema.safeParse(emptyPassword);
      const resultMissingPassword = loginSchema.safeParse(missingPassword);

      // Assert
      expect(resultValid.success).toBe(true);
      expect(resultInvalidEmail.success).toBe(false);
      expect(resultEmptyPassword.success).toBe(false);
      expect(resultMissingPassword.success).toBe(false);

      // Check error messages
      if (!resultInvalidEmail.success) {
        const error = resultInvalidEmail.error.issues.find((issue) => issue.path[0] === 'email');
        expect(error?.message).toContain('email');
      }

      if (!resultEmptyPassword.success) {
        const error = resultEmptyPassword.error.issues.find((issue) => issue.path[0] === 'password');
        expect(error?.message).toContain('wymagane');
      }
    });
  });
});

