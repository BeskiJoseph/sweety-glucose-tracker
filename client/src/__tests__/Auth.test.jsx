import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import { AuthContext } from '../context/AuthContextValue';
import { MainApp } from '../App';

describe('Frontend Component: Authentication & Route Protection', () => {
  it('should validate required fields and email format on login page', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn();

    render(
      <AuthContext.Provider value={{ login: mockLogin, user: null, loading: false }}>
        <LoginPage onNavigateToSignup={vi.fn()} />
      </AuthContext.Provider>
    );

    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
    await user.click(submitBtn);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();

    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    await user.type(emailInput, 'invalid-email');
    await user.click(submitBtn);
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  it('should validate name, email, password length, and password match on register page', async () => {
    const user = userEvent.setup();
    const mockRegister = vi.fn();

    render(
      <AuthContext.Provider value={{ register: mockRegister, user: null, loading: false }}>
        <RegisterPage onNavigateToLogin={vi.fn()} />
      </AuthContext.Provider>
    );

    const submitBtn = screen.getByRole('button', { name: /^Create Account$/i });
    await user.click(submitBtn);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e\.g\. Jane Doe/i);
    const emailInput = screen.getByPlaceholderText(/you@example.com/i);
    const pwInput = screen.getByPlaceholderText(/At least 8 characters/i);
    const confirmPwInput = screen.getByPlaceholderText(/Repeat your password/i);

    await user.type(nameInput, 'Alice Smith');
    await user.type(emailInput, 'alice@example.com');
    await user.type(pwInput, 'short');
    await user.type(confirmPwInput, 'mismatch');
    await user.click(submitBtn);

    expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should render Login page when user is unauthenticated', () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), logout: vi.fn() }}>
        <MainApp />
      </AuthContext.Provider>
    );

    expect(screen.getByRole('heading', { name: 'Sweety' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeInTheDocument();
  });

  it('should render Protected Dashboard when patient is authenticated', () => {
    const mockPatient = {
      id: 'patient-uuid-1',
      name: 'Alice Patient',
      email: 'alice@sweety.local',
      role: 'patient'
    };

    render(
      <AuthContext.Provider
        value={{
          user: mockPatient,
          loading: false,
          login: vi.fn(),
          logout: vi.fn()
        }}
      >
        <MainApp />
      </AuthContext.Provider>
    );

    expect(screen.getAllByText(/Alice Patient/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Welcome back, Alice Patient/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Log Reading/i })).toBeInTheDocument();
  });

  it('should render Doctor Dashboard when doctor is authenticated', () => {
    const mockDoctor = {
      id: 'doctor-uuid-1',
      name: 'Dr. Gregory House',
      email: 'doctor@sweety.local',
      role: 'doctor'
    };

    render(
      <AuthContext.Provider
        value={{
          user: mockDoctor,
          loading: false,
          login: vi.fn(),
          logout: vi.fn()
        }}
      >
        <MainApp />
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Dr\. Gregory House/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Healthcare Professional Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Assigned Patients/i })).toBeInTheDocument();
  });
});
