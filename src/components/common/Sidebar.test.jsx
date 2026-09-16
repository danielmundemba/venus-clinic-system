// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../firebase/auth', () => ({
  logoutUser: vi.fn(),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('shows Medical Records for receptionists', () => {
    useAuth.mockReturnValue({
      user: { displayName: 'Jane Doe' },
      userRole: 'receptionist',
      isAdmin: false,
      isDoctor: false,
      isReceptionist: true,
      isNurse: false,
    });

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /medical records/i })).toBeInTheDocument();
  });
});
