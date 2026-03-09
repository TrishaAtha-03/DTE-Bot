import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import { FormInput, SubmitButton } from '../components/FormInput'
import api from '../utils/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ otp: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return toast.error('Enter a valid email')

    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      toast.success('OTP sent to your email')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!form.otp || form.otp.length !== 6) return toast.error('Enter the 6-digit OTP')
    if (!form.password || form.password.length < 8) return toast.error('Password must be at least 8 characters')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, token: form.otp, password: form.password })
      toast.success('Password reset successfully! Please sign in.')
      navigate('/admin/signin')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP or reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (step === 2) {
    return (
      <AuthLayout title="Reset Password" subtitle={`Enter the OTP sent to ${email}`}>
        <form onSubmit={handleResetPassword}>
          <FormInput
            label="6-Digit OTP"
            placeholder="Enter OTP"
            value={form.otp}
            onChange={e => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          />
          <FormInput
            label="New Password"
            type="password"
            placeholder="Enter new password (min 8 chars)"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <FormInput
            label="Confirm Password"
            type="password"
            placeholder="Confirm new password"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
          />
          <SubmitButton loading={loading}>Reset Password</SubmitButton>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', textDecoration: 'underline' }}>
              Use a different email
            </button>
          </div>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="We'll send a 6-digit OTP to your registered email">
      <form onSubmit={handleSendOtp}>
        <FormInput
          label="Registered Email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <SubmitButton loading={loading}>Send OTP</SubmitButton>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--gray-500)' }}>
          <Link to="/admin/signin" style={{ color: 'var(--saffron)', fontWeight: 600 }}>Back to Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
