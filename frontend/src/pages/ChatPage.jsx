import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Bot, User, LogIn, Mic, RotateCcw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
// import styles from './ChatPage.module.css'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `Hi, I'm **EduBot**, your AI assistant for the Department of Technical Education, Government of Rajasthan.

I can help you with:
- 🎓 College information & admission process
- 💰 Fee structure & scholarships  
- 📊 Previous year cutoff ranks
- 🏠 Hostel facilities
- 📅 Admission schedules & important dates
- 🔬 Available courses & branches

What would you like to know today?`
}

const SUGGESTED = [
  "What are the top engineering colleges in Rajasthan?",
  "Show me cutoff ranks for CSE branch",
  "What is the fee structure for B.Tech?",
  "When does admission start for 2024-25?",
]

function TypingIndicator() {
  return (
    <div style={{display:'flex',gap:5,alignItems:'center',padding:'12px 16px'}}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:8,height:8,borderRadius:'50%',background:'#FF6B00',display:'block',
          animation:`typingDot 1.2s ease ${i*0.2}s infinite`
        }} />
      ))}
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const text = msg.content

  // Simple markdown bold parser
  const renderText = (t) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  return (
    <div style={{
      display:'flex',gap:10,alignItems:'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
      animation: 'fadeIn 0.3s ease',
      marginBottom:16,
    }}>
      <div style={{
        width:36,height:36,borderRadius:'50%',flexShrink:0,
        background: isUser ? 'linear-gradient(135deg,#1A3A6B,#2A5298)' : 'linear-gradient(135deg,#FF6B00,#FF8C33)',
        display:'flex',alignItems:'center',justifyContent:'center',
        boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
      }}>
        {isUser ? <User size={18} color="white" /> : <Bot size={18} color="white" />}
      </div>
      <div style={{
        maxWidth:'75%',
        background: isUser ? 'linear-gradient(135deg,#1A3A6B,#2A5298)' : 'white',
        color: isUser ? 'white' : '#1F2937',
        padding:'12px 16px',
        borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
        fontSize:14,lineHeight:1.65,
        whiteSpace:'pre-wrap',wordBreak:'break-word'
      }}>
        {text.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {renderText(line)}
            {i < text.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await api.post('/chat', { message: msg, session_id: sessionId })
      setSessionId(res.data.session_id)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE])
    setSessionId(null)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'var(--off-white)'}}>
      {/* Header */}
      <header style={{
        background:'white',
        borderBottom:'1px solid var(--gray-200)',
        padding:'0 20px',
        height:64,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        flexShrink:0,
        boxShadow:'0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {/* Logo/Emblem */}
          <div style={{
            width:44,height:44,borderRadius:'50%',
            background:'linear-gradient(135deg,#FF6B00 0%,#FF8C33 50%,#1A3A6B 100%)',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 2px 8px rgba(255,107,0,0.3)'
          }}>
            <Bot size={22} color="white" />
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:'var(--royal-blue)',fontFamily:'var(--font-display)'}}>
              EduBot
            </div>
            <div style={{fontSize:11,color:'var(--gray-500)',marginTop:-2}}>
              DTE Rajasthan · AI Assistant
            </div>
          </div>
          {/* India flag stripe decoration */}
          <div style={{display:'flex',gap:2,marginLeft:8}}>
            {['#FF6B00','#FFFFFF','#138808'].map((c,i) => (
              <div key={i} style={{width:3,height:24,background:c,borderRadius:2,opacity:0.7}} />
            ))}
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button
            onClick={handleReset}
            title="New conversation"
            style={{
              display:'flex',alignItems:'center',gap:6,
              padding:'7px 12px',borderRadius:8,
              background:'var(--gray-100)',color:'var(--gray-600)',
              fontSize:13,fontWeight:500,transition:'var(--transition)'
            }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--gray-200)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--gray-100)'}
          >
            <RotateCcw size={14} /> New Chat
          </button>

          {user ? (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button
                onClick={() => navigate('/admin/dashboard')}
                style={{
                  padding:'7px 14px',borderRadius:8,
                  background:'var(--royal-blue)',color:'white',
                  fontSize:13,fontWeight:600,transition:'var(--transition)'
                }}
              >Dashboard</button>
              <button
                onClick={logout}
                style={{
                  padding:'7px 14px',borderRadius:8,
                  background:'var(--gray-100)',color:'var(--gray-600)',
                  fontSize:13,fontWeight:500
                }}
              >Logout</button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/admin/signin')}
              style={{
                display:'flex',alignItems:'center',gap:8,
                padding:'8px 18px',borderRadius:8,
                background:'linear-gradient(135deg,#FF6B00,#FF8C33)',
                color:'white',fontSize:13,fontWeight:600,
                boxShadow:'0 2px 8px rgba(255,107,0,0.3)',
                transition:'var(--transition)'
              }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(255,107,0,0.4)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(255,107,0,0.3)'}
            >
              <LogIn size={15} /> Admin Sign In
            </button>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',maxWidth:860,width:'100%',margin:'0 auto',padding:'0 16px'}}>
        <div style={{flex:1,overflowY:'auto',padding:'20px 0 10px'}}>
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
          {loading && (
            <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:16}}>
              <div style={{
                width:36,height:36,borderRadius:'50%',flexShrink:0,
                background:'linear-gradient(135deg,#FF6B00,#FF8C33)',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                <Bot size={18} color="white" />
              </div>
              <div style={{
                background:'white',borderRadius:'4px 18px 18px 18px',
                boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
              }}>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div style={{
            display:'flex',flexWrap:'wrap',gap:8,padding:'10px 0',
            animation:'fadeIn 0.5s ease'
          }}>
            {SUGGESTED.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                style={{
                  padding:'8px 14px',borderRadius:20,
                  border:'1.5px solid var(--gray-200)',
                  background:'white',color:'var(--gray-700)',
                  fontSize:12,fontWeight:500,cursor:'pointer',
                  transition:'var(--transition)',whiteSpace:'nowrap'
                }}
                onMouseEnter={e=>{
                  e.currentTarget.style.borderColor='#FF6B00'
                  e.currentTarget.style.color='#FF6B00'
                }}
                onMouseLeave={e=>{
                  e.currentTarget.style.borderColor='var(--gray-200)'
                  e.currentTarget.style.color='var(--gray-700)'
                }}
              >{q}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          display:'flex',gap:10,padding:'12px 0 16px',
          background:'var(--off-white)'
        }}>
          <div style={{
            flex:1,display:'flex',alignItems:'center',gap:10,
            background:'white',borderRadius:14,
            border:'1.5px solid var(--gray-200)',
            padding:'10px 16px',
            boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
            transition:'border-color 0.2s',
          }}
            onFocusCapture={e=>e.currentTarget.style.borderColor='#FF6B00'}
            onBlurCapture={e=>e.currentTarget.style.borderColor='var(--gray-200)'}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about colleges, fees, cutoffs, admissions... (Type in English or हिंदी)"
              style={{
                flex:1,border:'none',outline:'none',
                fontSize:14,color:'var(--gray-800)',background:'transparent'
              }}
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width:48,height:48,borderRadius:14,flexShrink:0,
              background: (input.trim() && !loading) ? 'linear-gradient(135deg,#FF6B00,#FF8C33)' : 'var(--gray-200)',
              color: (input.trim() && !loading) ? 'white' : 'var(--gray-400)',
              display:'flex',alignItems:'center',justifyContent:'center',
              transition:'var(--transition)',
              boxShadow: (input.trim() && !loading) ? '0 2px 8px rgba(255,107,0,0.3)' : 'none'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign:'center',fontSize:11,color:'var(--gray-400)',
        padding:'8px',background:'white',
        borderTop:'1px solid var(--gray-100)'
      }}>
        Department of Technical Education, Government of Rajasthan · VidyaSaarthi AI Assistant
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}