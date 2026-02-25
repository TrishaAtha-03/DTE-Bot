import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import { FormInput, SubmitButton } from '../components/FormInput'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export default function SignInPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.username.trim()) errs.username = 'Username is required'
    if (!form.password.trim()) errs.password = 'Password is required'
    if (Object.keys(errs).length) return setErrors(errs)

    setLoading(true)
    try {
      const res = await api.post('/auth/signin', form)
      login(res.data.access_token, res.data.user)
      toast.success(`Welcome back, ${res.data.user.college_name || res.data.user.username}!`)
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Admin Sign In" subtitle="Access your college dashboard">
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Username"
          placeholder="Enter your username"
          value={form.username}
          onChange={e => setForm({...form, username: e.target.value})}
          error={errors.username}
        />
        <FormInput
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          error={errors.password}
        />

        <div style={{ textAlign:'right', marginBottom:20, marginTop:-8 }}>
          <Link to="/admin/forgot-password" style={{
            fontSize:13, color:'var(--saffron)', fontWeight:500,
            textDecoration:'underline'
          }}>
            Forgot password?
          </Link>
        </div>

        <SubmitButton loading={loading}>Sign In to Dashboard</SubmitButton>

        <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--gray-500)' }}>
          Don't have an account?{' '}
          <Link to="/admin/signup" style={{ color:'var(--saffron)', fontWeight:600 }}>
            Sign Up
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}