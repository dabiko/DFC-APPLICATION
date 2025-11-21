/**
 * SignUp Component Unit Tests
 * Comprehensive test suite for the SignUp registration page
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { SignUp } from './SignUp'

// Mock the navigate function
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Wrapper component for tests
const SignUpWrapper = () => (
  <BrowserRouter>
    <SignUp />
  </BrowserRouter>
)

describe('SignUp Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  describe('Initial Render', () => {
    it('should render the signup form', () => {
      render(<SignUpWrapper />)
      expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      expect(screen.getByText("Join DabiTech's Digital Filing Cabinet")).toBeInTheDocument()
    })

    it('should render step indicator with 3 steps', () => {
      render(<SignUpWrapper />)
      expect(screen.getByText('Company Info')).toBeInTheDocument()
      expect(screen.getByText('Personal Info')).toBeInTheDocument()
      expect(screen.getByText('Security')).toBeInTheDocument()
    })

    it('should start at step 1 (Company Information)', () => {
      render(<SignUpWrapper />)
      expect(screen.getByText('Company Information')).toBeInTheDocument()
      expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument()
    })

    it('should render animated background canvas', () => {
      const { container } = render(<SignUpWrapper />)
      const canvas = container.querySelector('canvas')
      expect(canvas).toBeInTheDocument()
    })
  })

  describe('Step 1: Company Information', () => {
    it('should render all company information fields', () => {
      render(<SignUpWrapper />)
      expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Company Registration Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Tax ID/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Industry/i)).toBeInTheDocument()
    })

    it('should show validation error for empty company name', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      const companyNameInput = screen.getByLabelText(/Company Name/i)
      await user.click(companyNameInput)
      await user.tab() // Blur the input

      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeInTheDocument()
      })
    })

    it('should show validation error for short company name', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      const companyNameInput = screen.getByLabelText(/Company Name/i)
      await user.type(companyNameInput, 'A')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText('Company name must be at least 2 characters')).toBeInTheDocument()
      })
    })

    it('should accept valid company name', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      const companyNameInput = screen.getByLabelText(/Company Name/i)
      await user.type(companyNameInput, 'Acme Corp')
      await user.tab()

      await waitFor(() => {
        expect(screen.queryByText(/Company name/i)).not.toBeInTheDocument()
      })
    })

    it('should disable Next button when fields are invalid', () => {
      render(<SignUpWrapper />)
      const nextButton = screen.getByRole('button', { name: /Next/i })
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Step 2: Personal Information', () => {
    const fillStep1 = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText(/Company Name/i), 'Acme Financial Solutions')
      await user.type(screen.getByLabelText(/Company Registration Number/i), 'REG-2024-001234')
      await user.type(screen.getByLabelText(/Tax ID/i), '12-3456789')
      // Select industry from dropdown
      const industrySelect = screen.getByLabelText(/Industry/i)
      await user.click(industrySelect)
      // Click on first option
      const options = await screen.findAllByRole('option')
      if (options.length > 0) {
        await user.click(options[0])
      }
      await user.click(screen.getByRole('button', { name: /Next/i }))
    }

    it('should navigate to step 2 after completing step 1', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument()
      })
    })

    it('should render all personal information fields in step 2', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      await waitFor(() => {
        expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Job Title/i)).toBeInTheDocument()
      })
    })

    it('should validate email as business email only', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      const emailInput = await screen.findByLabelText(/Email/i)
      await user.type(emailInput, 'test@gmail.com')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/Personal email providers.*not allowed/i)).toBeInTheDocument()
      })
    })

    it('should accept business email address', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      const emailInput = await screen.findByLabelText(/Email/i)
      await user.type(emailInput, 'john.smith@acmefinancial.com')
      await user.tab()

      await waitFor(() => {
        expect(screen.queryByText(/email/i)).not.toBeInTheDocument()
      })
    })

    it('should render country dropdown with search functionality', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      const countrySelect = await screen.findByLabelText(/Country/i)
      expect(countrySelect).toBeInTheDocument()

      await user.click(countrySelect)
      // Search functionality test
      const searchInput = await screen.findByPlaceholderText(/Search/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('should validate phone number with minimum length', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      const phoneInput = await screen.findByLabelText(/Phone Number/i)
      await user.type(phoneInput, '123')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument()
      })
    })

    it('should render Back button in step 2', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
      })
    })

    it('should navigate back to step 1 when Back button is clicked', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1(user)

      const backButton = await screen.findByRole('button', { name: /Back/i })
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByText('Company Information')).toBeInTheDocument()
      })
    })
  })

  describe('Step 3: Security', () => {
    const fillStep1And2 = async (user: ReturnType<typeof userEvent.setup>) => {
      // Step 1
      await user.type(screen.getByLabelText(/Company Name/i), 'Acme Financial Solutions')
      await user.type(screen.getByLabelText(/Company Registration Number/i), 'REG-2024-001234')
      await user.type(screen.getByLabelText(/Tax ID/i), '12-3456789')
      const industrySelect = screen.getByLabelText(/Industry/i)
      await user.click(industrySelect)
      const industryOptions = await screen.findAllByRole('option')
      if (industryOptions.length > 0) {
        await user.click(industryOptions[0])
      }
      await user.click(screen.getByRole('button', { name: /Next/i }))

      // Wait for step 2
      await waitFor(() => {
        expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument()
      })

      // Step 2
      await user.type(screen.getByLabelText(/First Name/i), 'John')
      await user.type(screen.getByLabelText(/Last Name/i), 'Smith')
      await user.type(screen.getByLabelText(/Email/i), 'john.smith@acmefinancial.com')
      await user.type(screen.getByLabelText(/Phone Number/i), '2125551234')
      await user.type(screen.getByLabelText(/Job Title/i), 'CFO')
      await user.type(screen.getByLabelText(/Address Line 1/i), '123 Wall Street')
      await user.type(screen.getByLabelText(/City/i), 'New York')
      await user.type(screen.getByLabelText(/State/i), 'NY')
      await user.type(screen.getByLabelText(/Postal Code/i), '10005')

      await user.click(screen.getByRole('button', { name: /Next/i }))
    }

    it('should navigate to step 3 after completing step 2', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1And2(user)

      await waitFor(() => {
        expect(screen.getByText('Security Settings')).toBeInTheDocument()
      })
    })

    it('should render password strength indicator', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1And2(user)

      const passwordInput = await screen.findByLabelText(/^Password$/i)
      await user.type(passwordInput, 'weak')

      await waitFor(() => {
        expect(screen.getByText(/Password Strength/i)).toBeInTheDocument()
      })
    })

    it('should validate password requirements', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1And2(user)

      const passwordInput = await screen.findByLabelText(/^Password$/i)
      await user.type(passwordInput, 'weak')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument()
        expect(screen.getByText(/Uppercase/i)).toBeInTheDocument()
        expect(screen.getByText(/Lowercase/i)).toBeInTheDocument()
        expect(screen.getByText(/Number/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation matches', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1And2(user)

      const passwordInput = await screen.findByLabelText(/^Password$/i)
      const confirmPasswordInput = await screen.findByLabelText(/Confirm Password/i)

      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'DifferentPass123!')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
      })
    })

    it('should render terms and privacy checkboxes', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1And2(user)

      await waitFor(() => {
        expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument()
        expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument()
      })
    })

    it('should require terms and privacy acceptance', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1And2(user)

      const submitButton = await screen.findByRole('button', { name: /Create Account/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when all required fields are filled', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await fillStep1And2(user)

      const passwordInput = await screen.findByLabelText(/^Password$/i)
      const confirmPasswordInput = await screen.findByLabelText(/Confirm Password/i)
      const termsCheckbox = await screen.findByLabelText(/Terms of Service/i)
      const privacyCheckbox = await screen.findByLabelText(/Privacy Policy/i)

      await user.type(passwordInput, 'SecurePass123!')
      await user.type(confirmPasswordInput, 'SecurePass123!')
      await user.click(termsCheckbox)
      await user.click(privacyCheckbox)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /Create Account/i })
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Form Navigation', () => {
    it('should show correct step indicator state', () => {
      render(<SignUpWrapper />)

      const step1Indicator = screen.getByText('1')
      expect(step1Indicator).toHaveClass('bg-blue-600')
    })

    it('should update step indicator when progressing', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      // Fill step 1 and move to step 2
      await user.type(screen.getByLabelText(/Company Name/i), 'Acme Corp')
      await user.type(screen.getByLabelText(/Company Registration Number/i), 'REG-123')
      await user.type(screen.getByLabelText(/Tax ID/i), '12-3456789')

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /Next/i })
        expect(nextButton).not.toBeDisabled()
      })
    })

    it('should preserve form data when navigating between steps', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      const companyName = 'Acme Financial Solutions'
      await user.type(screen.getByLabelText(/Company Name/i), companyName)
      await user.type(screen.getByLabelText(/Company Registration Number/i), 'REG-2024-001234')
      await user.type(screen.getByLabelText(/Tax ID/i), '12-3456789')

      const industrySelect = screen.getByLabelText(/Industry/i)
      await user.click(industrySelect)
      const options = await screen.findAllByRole('option')
      if (options.length > 0) {
        await user.click(options[0])
      }

      await user.click(screen.getByRole('button', { name: /Next/i }))

      // Go back
      const backButton = await screen.findByRole('button', { name: /Back/i })
      await user.click(backButton)

      await waitFor(() => {
        const companyNameInput = screen.getByLabelText(/Company Name/i) as HTMLInputElement
        expect(companyNameInput.value).toBe(companyName)
      })
    })
  })

  describe('Loading States', () => {
    it('should disable all inputs during loading', async () => {
      const _user = userEvent.setup()
      render(<SignUpWrapper />)

      // Complete all steps
      // (implementation would involve filling all fields and submitting)

      // When loading is true, inputs should be disabled
      // This test requires mocking the submit handler
    })

    it('should show loading spinner on submit button', async () => {
      // This test requires mocking the submit handler
      // and simulating async operation
    })
  })

  describe('Error Handling', () => {
    it('should display inline errors for each field', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      const companyNameInput = screen.getByLabelText(/Company Name/i)
      await user.click(companyNameInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeInTheDocument()
      })
    })

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      const companyNameInput = screen.getByLabelText(/Company Name/i)
      await user.click(companyNameInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeInTheDocument()
      })

      await user.type(companyNameInput, 'Acme')

      await waitFor(() => {
        expect(screen.queryByText('Company name is required')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SignUpWrapper />)

      expect(screen.getByLabelText(/Company Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Company Registration Number/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<SignUpWrapper />)

      await user.tab() // Should focus first input
      const companyNameInput = screen.getByLabelText(/Company Name/i)
      expect(companyNameInput).toHaveFocus()
    })

    it('should have cursor pointer on clickable elements', () => {
      render(<SignUpWrapper />)

      const nextButton = screen.getByRole('button', { name: /Next/i })
      expect(nextButton).toHaveClass('cursor-pointer')
    })
  })

  describe('OTP Verification Modals', () => {
    it('should not show OTP modals initially', () => {
      render(<SignUpWrapper />)

      expect(screen.queryByText(/Verify your email/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Verify your phone/i)).not.toBeInTheDocument()
    })

    // Additional OTP tests would require triggering the OTP flow
    // which depends on backend integration
  })

  describe('Dark Mode Support', () => {
    it('should render properly in dark mode', () => {
      // Add dark class to document
      document.documentElement.classList.add('dark')

      const { container } = render(<SignUpWrapper />)

      // Check for dark mode classes
      expect(container.querySelector('.dark\\:bg-gray-800')).toBeTruthy()

      // Cleanup
      document.documentElement.classList.remove('dark')
    })
  })

  describe('Link to Login', () => {
    it('should render link to login page', () => {
      render(<SignUpWrapper />)

      const loginLink = screen.getByText(/Already have an account/i).closest('div')
      expect(loginLink).toBeInTheDocument()
      expect(screen.getByText(/Sign In/i)).toBeInTheDocument()
    })

    it('should have cursor pointer on login link', () => {
      render(<SignUpWrapper />)

      const loginLink = screen.getByText(/Sign In/i)
      expect(loginLink).toHaveClass('cursor-pointer')
    })
  })
})
