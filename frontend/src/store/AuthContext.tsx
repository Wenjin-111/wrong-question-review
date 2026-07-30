import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { AuthState, User } from '../types';

type AuthAction =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; isLoading: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.user, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  login: (tokenData: { access_token: string; refresh_token: string; user: User }) => void;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const cached = localStorage.getItem('user');
      if (cached) {
        try {
          dispatch({ type: 'LOGIN', user: JSON.parse(cached) });
        } catch {
          localStorage.removeItem('user');
        }
      }
      authApi
        .me()
        .then((res) => {
          const user = res.data;
          localStorage.setItem('user', JSON.stringify(user));
          dispatch({ type: 'LOGIN', user });
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          dispatch({ type: 'LOGOUT' });
        });
    } else {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, []);

  const login = (tokenData: { access_token: string; refresh_token: string; user: User }) => {
    localStorage.setItem('access_token', tokenData.access_token);
    localStorage.setItem('refresh_token', tokenData.refresh_token);
    localStorage.setItem('user', JSON.stringify(tokenData.user));
    dispatch({ type: 'LOGIN', user: tokenData.user });
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
