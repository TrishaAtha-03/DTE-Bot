import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot } from 'lucide-react'

export default function AuthLayout({ title, subtitle, children }) {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg,#1A3A6B 0%,#2A5298 50%,#1A3A6B 100%)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:24,position:'relative',overflow:'hidden'
    }}>
      {/* Background decorations */}
      <div style={{
        position:'absolute',top:-100,right:-100,
        width:400,height:400,borderRadius:'50%',
        background:'rgba(255,107,0,0.08)',pointerEvents:'none'
      }}/>
      <div style={{
        position:'absolute',bottom:-80,left:-80,
        width:300,height:300,borderRadius:'50%',
        background:'rgba(255,107,0,0.06)',pointerEvents:'none'
      }}/>

      {/* Flag stripe top */}
      <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',height:4}}>
        {['#FF6B00','#FFFFFF','#138808'].map((c,i) => (
          <div key={i} style={{flex:1,background:c}} />
        ))}
      </div>

      <div style={{
        background:'white',borderRadius:20,
        padding:40,width:'100%',maxWidth:440,
        boxShadow:'0 25px 50px rgba(0,0,0,0.25)',
        animation:'fadeIn 0.4s ease'
      }}>
        {/* Back to chat */}
        <button
          onClick={() => navigate('/')}
          style={{
            display:'flex',alignItems:'center',gap:6,
            color:'var(--gray-500)',fontSize:13,background:'none',
            marginBottom:24,transition:'color 0.2s',fontWeight:500
          }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--saffron)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--gray-500)'}
        >
          <ArrowLeft size={14} /> Back to Chat
        </button>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{
            width:60,height:60,borderRadius:'50%',
            background:'linear-gradient(135deg,#FF6B00,#FF8C33)',
            display:'flex',alignItems:'center',justifyContent:'center',
            margin:'0 auto 14px',
            boxShadow:'0 4px 15px rgba(255,107,0,0.3)'
          }}>
            <Bot size={28} color="white" />
          </div>
          <h1 style={{fontSize:22,fontWeight:700,color:'var(--royal-blue)',fontFamily:'var(--font-display)'}}>
            {title}
          </h1>
          {subtitle && <p style={{fontSize:13,color:'var(--gray-500)',marginTop:4}}>{subtitle}</p>}
        </div>

        {children}
      </div>

      <div style={{marginTop:16,fontSize:12,color:'rgba(255,255,255,0.5)',textAlign:'center'}}>
        Department of Technical Education · Government of Rajasthan
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}