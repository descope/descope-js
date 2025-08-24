import { inject } from 'vue';
import { useOptions, useDescope, useSession, useUser } from '../src/hooks';

jest.mock('vue', () => ({
  ...jest.requireActual('vue'),
  inject: jest.fn(),
  ref: jest.fn((v) => v),
  computed: (f) => f(),
  watch: (_, f) => f(),
}));

const injectMock = inject as jest.Mock;

describe('hooks', () => {
  beforeEach(() => {
    injectMock.mockReturnValue({
      sdk: 'sdk',
      options: 'options',
      user: {
        user: 'user',
        isLoading: { value: true },
        isFetchUserWasNeverCalled: { value: true },
        fetchUser: jest.fn(),
      },
      session: {
        session: { value: 'session' },
        isLoading: { value: true },
        isFetchSessionWasNeverCalled: true,
        isAuthenticated: { value: true },
      },
    });
  });
  describe('useDescope', () => {
    it('should return the sdk', () => {
      expect(useDescope()).toBe('sdk');
    });
    it('should throw error when no context', () => {
      injectMock.mockReturnValueOnce(undefined);
      expect(useDescope).toThrow();
    });
  });
  describe('useOptions', () => {
    it('should return the options', () => {
      expect(useOptions()).toBe('options');
    });
    it('should throw error when no context', () => {
      injectMock.mockReturnValueOnce(undefined);
      expect(useOptions).toThrow();
    });
  });

  describe('useSession', () => {
    it('should return the session', () => {
      expect(useSession()).toEqual({
        isLoading: true,
        sessionToken: { value: 'session' },
        isAuthenticated: { value: true },
      });
    });

    it('should fetch session if not fetched before', () => {
      const fetchSession = jest.fn();
      injectMock.mockReturnValue({
        session: {
          isLoading: {},
          session: 'session',
          fetchSession,
          isFetchSessionWasNeverCalled: { value: true },
        },
      });

      useSession();

      expect(fetchSession).toHaveBeenCalled();
      expect(fetchSession).toHaveBeenCalledWith(true);
    });
    it('should throw error when no context', () => {
      injectMock.mockReturnValueOnce(undefined);
      expect(useSession).toThrow();
    });
  });

  describe('useUser', () => {
    it('should return the user', () => {
      expect(useUser()).toEqual({ isLoading: true, user: 'user' });
    });

    it('should fetch user if not fetched before', () => {
      const fetchUser = jest.fn();
      injectMock.mockReturnValue({
        user: {
          isLoading: {},
          user: 'user',
          fetchUser,
          isFetchUserWasNeverCalled: { value: true },
        },
        session: {
          session: { value: 'session' },
        },
      });

      useUser();

      expect(fetchUser).toHaveBeenCalled();
    });
    it('should throw error when no context', () => {
      injectMock.mockReturnValueOnce(undefined);
      expect(useUser).toThrow();
    });
  });
});
