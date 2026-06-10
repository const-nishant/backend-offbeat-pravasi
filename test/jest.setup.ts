// This file runs before each test suite in the e2e test config.
// It mocks ESM modules that Jest can't parse.

jest.mock('@thallesp/nestjs-better-auth', () => ({
  AuthService: class AuthService {
    api = { signInSocial: jest.fn(), getSession: jest.fn() };
  },
  AuthModule: { forRoot: () => ({ module: class {} }) },
}));
jest.mock('better-auth/node', () => ({ fromNodeHeaders: jest.fn() }));
jest.mock('better-auth', () => ({ betterAuth: jest.fn() }));
jest.mock('better-auth/minimal', () => ({ betterAuth: jest.fn() }));
