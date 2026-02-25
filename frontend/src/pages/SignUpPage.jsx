import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import AuthLayout from '../components/AuthLayout'
import { FormInput, SubmitButton } from '../components/FormInput'
import api from '../utils/api'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [colleges, setColleges] = useState([])
  const [form, setForm] = useState({ username: '', password: '', confirm: '', college_code: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    api.get('/public/colleges').then(r => setColleges(r.data)).catch(() => {})
  }, [])

  const validate = () => {
    const e = {}
    if (!form.username.trim() || form.username.length < 4) e.username = 'Username must be at least 4 characters'
    if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    if (!form.college_code) e.college_code = 'Please select your college'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) return setErrors(errs)

    setLoading(true)
    try {
      await api.post('/auth/signup', {
        username: form.username,
        password: form.password,
        college_code: form.college_code
      })
      toast.success('Account created! Please sign in.')
      navigate('/admin/signin')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Admin Registration" subtitle="Register as your college administrator">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--gray-700)', marginBottom:6 }}>
            Select Your College
          </label>
          <select
            value={form.college_code}
            onChange={e => setForm({...form, college_code: e.target.value})}
            style={{
              width:'100%',padding:'10px 14px',borderRadius:10,fontSize:14,
              border: errors.college_code ? '1.5px solid #EF4444' : '1.5px solid var(--gray-200)',
              background:'white',color:'var(--gray-800)',outline:'none',cursor:'pointer'
            }}
          >
            <option value="">-- Select College --</option>
            {colleges.map(c => (
              <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
          {errors.college_code && <p style={{ fontSize:12, color:'#EF4444', marginTop:4 }}>{errors.college_code}</p>}
        </div>

        <FormInput
          label="Username"
          placeholder="Choose a username (min 4 chars)"
          value={form.username}
          onChange={e => setForm({...form, username: e.target.value})}
          error={errors.username}
        />
        <FormInput
          label="Password"
          type="password"
          placeholder="Choose a strong password"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
          error={errors.password}
        />
        <FormInput
          label="Confirm Password"
          type="password"
          placeholder="Confirm your password"
          value={form.confirm}
          onChange={e => setForm({...form, confirm: e.target.value})}
          error={errors.confirm}
        />

        <div style={{
          background:'var(--saffron-pale)',border:'1px solid rgba(255,107,0,0.2)',
          borderRadius:8,padding:'10px 12px',marginBottom:18,fontSize:12,color:'#7C3900'
        }}>
          ⚠️ Only one admin per college is allowed. Ensure you are the authorized person.
        </div>

        <SubmitButton loading={loading}>Create Admin Account</SubmitButton>

        <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--gray-500)' }}>
          Already registered?{' '}
          <Link to="/admin/signin" style={{ color:'var(--saffron)', fontWeight:600 }}>Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  )
}