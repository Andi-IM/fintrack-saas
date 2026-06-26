import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { loginWithCredentials } from '@/features/auth/actions/auth'
import React from 'react'

// Mock next router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock auth actions
vi.mock('@/features/auth/actions/auth', () => ({
  loginWithCredentials: vi.fn(),
  signUpWithCredentials: vi.fn(),
}))

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with default values', () => {
    render(<LoginForm defaultEmail="user@example.com" />)

    const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/^kata sandi$/i) as HTMLInputElement

    expect(emailInput.value).toBe('user@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  it('renders empty email by default if no defaultEmail prop is provided', () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement
    expect(emailInput.value).toBe('')
  })

  it('toggles password visibility when eye button is clicked', () => {
    render(<LoginForm />)

    const passwordInput = screen.getByLabelText(/^kata sandi$/i) as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    // Click show password
    const toggleButton = screen.getByRole('button', { name: /Tampilkan kata sandi/i })
    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('text')
    expect(toggleButton).toHaveAttribute('aria-label', 'Sembunyikan kata sandi')

    // Click hide password
    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('password')
    expect(toggleButton).toHaveAttribute('aria-label', 'Tampilkan kata sandi')
  })

  it('shows validation error when email is invalid', async () => {
    render(<LoginForm defaultEmail="" />)

    const emailInput = screen.getByLabelText(/^email$/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const submitBtn = screen.getByRole('button', { name: /Masuk ke Vault/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Format email tidak valid')).toBeInTheDocument()
    })
  })

  it('shows validation error when password is less than 6 characters', async () => {
    render(<LoginForm defaultEmail="user@example.com" />)

    const passwordInput = screen.getByLabelText(/^kata sandi$/i)
    fireEvent.change(passwordInput, { target: { value: '12345' } })

    const submitBtn = screen.getByRole('button', { name: /Masuk ke Vault/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Kata sandi minimal harus 6 karakter')).toBeInTheDocument()
    })
  })

  it('successfully submits form with valid credentials', async () => {
    vi.mocked(loginWithCredentials).mockResolvedValue({ success: true, data: undefined as any })

    render(<LoginForm defaultEmail="user@example.com" />)

    const emailInput = screen.getByLabelText(/^email$/i)
    fireEvent.change(emailInput, { target: { value: 'authorized@example.com' } })

    const passwordInput = screen.getByLabelText(/^kata sandi$/i)
    fireEvent.change(passwordInput, { target: { value: 'secretpassword' } })

    const submitBtn = screen.getByRole('button', { name: /Masuk ke Vault/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(loginWithCredentials).toHaveBeenCalledWith({
        email: 'authorized@example.com',
        password: 'secretpassword',
      })
    })
  })

  it('shows server error when login fails', async () => {
    vi.mocked(loginWithCredentials).mockResolvedValue({
      success: false,
      error: 'Kombinasi email dan kata sandi salah.',
    })

    render(<LoginForm defaultEmail="user@example.com" />)

    const submitBtn = screen.getByRole('button', { name: /Masuk ke Vault/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Kombinasi email dan kata sandi salah.')
    })
  })

  it('shows unexpected error message if login action throws', async () => {
    // Prevent console.error from polluting test logs
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(loginWithCredentials).mockRejectedValue(new Error('Unexpected crash') as any)

    render(<LoginForm defaultEmail="user@example.com" />)

    const submitBtn = screen.getByRole('button', { name: /Masuk ke Vault/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Terjadi kesalahan yang tidak terduga.')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('shows loading spinner and disables submit button during submission', async () => {
    let resolvePromise: (val: any) => void = () => {}
    const loginPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(loginWithCredentials).mockImplementation(() => loginPromise as any)

    render(<LoginForm defaultEmail="user@example.com" />)

    const submitBtn = screen.getByRole('button', { name: /Masuk ke Vault/i })
    fireEvent.click(submitBtn)

    // Verify loading spinner is present and button is disabled
    await waitFor(() => {
      expect(submitBtn.querySelector('.animate-spin')).toBeInTheDocument()
      expect(submitBtn).toBeDisabled()
    })

    // Resolve the promise to finish the test cleanly, wrapped in act()
    await act(async () => {
      resolvePromise({ success: true, data: undefined })
    })
  })
})
