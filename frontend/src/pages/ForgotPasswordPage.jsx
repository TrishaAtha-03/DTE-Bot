import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import { FormInput, SubmitButton } from '../components/FormInput'
import api from '../utils/api'

export function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) return toast.error('Enter your username')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { username })
      setSent(true)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <AuthLayout title="Check Your Email" subtitle="Password reset link has been sent">
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
        <p style={{ color:'var(--gray-600)', fontSize:14, lineHeight:1.7 }}>
          If an account with that username exists, a password reset link has been sent to the registered college email address.
        </p>
        <div style={{ marginTop:24 }}>
          <Link to="/admin/signin" style={{
            display:'inline-block',padding:'10px 24px',
            borderRadius:10,background:'linear-gradient(135deg,#FF6B00,#FF8C33)',
            color:'white',fontWeight:600,fontSize:14
          }}>Back to Sign In</Link>
        </div>
      </div>
    </AuthLayout>
  )

  return (
    <AuthLayout title="Forgot Password" subtitle="We'll send a reset link to your college email">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Username"
          placeholder="Enter your admin username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <SubmitButton loading={loading}>Send Reset Link</SubmitButton>
        <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--gray-500)' }}>
          <Link to="/admin/signin" style={{ color:'var(--saffron)', fontWeight:600 }}>Back to Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default ForgotPasswordPage

// ResetPasswordPage — imported separately
export function ResetPasswordPage() {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const token = new URLSearchParams(window.location.search).get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.password || form.password.length < 8) return toast.error('Password must be at least 8 characters')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    if (!token) return toast.error('Invalid reset link')

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: form.password })
      setDone(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <AuthLayout title="Password Reset!" subtitle="Your password has been changed">
      <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <p style={{ color:'var(--gray-600)', fontSize:14 }}>
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <div style={{ marginTop:24 }}>
          <Link to="/admin/signin" style={{
            display:'inline-block',padding:'10px 24px',
            borderRadius:10,background:'linear-gradient(135deg,#FF6B00,#FF8C33)',
            color:'white',fontWeight:600,fontSize:14
          }}>Sign In Now</Link>
        </div>
      </div>
    </AuthLayout>
  )

  return (
    <AuthLayout title="Reset Password" subtitle="Choose a new password for your account">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="New Password"
          type="password"
          placeholder="Enter new password (min 8 chars)"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
        />
        <FormInput
          label="Confirm Password"
          type="password"
          placeholder="Confirm new password"
          value={form.confirm}
          onChange={e => setForm({...form, confirm: e.target.value})}
        />
        <SubmitButton loading={loading}>Reset Password</SubmitButton>
      </form>
    </AuthLayout>
  )
}