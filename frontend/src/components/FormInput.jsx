import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function FormInput({ label, type = 'text', error, ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--gray-700)', marginBottom:6 }}>{label}</label>}
      <div style={{ position:'relative' }}>
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          style={{
            width:'100%',padding:'10px 14px',
            paddingRight: isPassword ? 42 : 14,
            borderRadius:10,fontSize:14,
            border: error ? '1.5px solid #EF4444' : '1.5px solid var(--gray-200)',
            background: error ? '#FFF5F5' : 'white',
            color:'var(--gray-800)',transition:'border-color 0.2s',
            outline:'none'
          }}
          onFocus={e => !error && (e.target.style.borderColor = '#FF6B00')}
          onBlur={e => !error && (e.target.style.borderColor = 'var(--gray-200)')}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} style={{
            position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
            background:'none',color:'var(--gray-400)',display:'flex',alignItems:'center'
          }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize:12, color:'#EF4444', marginTop:4 }}>{error}</p>}
    </div>
  )
}

export function SubmitButton({ children, loading, ...props }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width:'100%',padding:'12px',borderRadius:10,
        background: loading ? 'var(--gray-300)' : 'linear-gradient(135deg,#FF6B00,#FF8C33)',
        color:'white',fontSize:15,fontWeight:700,
        boxShadow: loading ? 'none' : '0 4px 12px rgba(255,107,0,0.3)',
        transition:'all 0.2s',cursor: loading ? 'not-allowed' : 'pointer'
      }}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  )
}