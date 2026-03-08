import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Building2, BookOpen, IndianRupee, CalendarDays, TrendingDown,
  Hotel, LogOut, ChevronRight, Plus, Pencil, Trash2, Save, X,
  MessageSquare, CheckCircle, Menu
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

// ─── STYLES ─────────────────────────────────────────────────────────────────

const S = {
  sidebarItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', marginBottom: 4,
    background: active ? 'linear-gradient(135deg,#FF6B00,#FF8C33)' : 'transparent',
    color: active ? 'white' : 'rgba(255,255,255,0.7)',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
  }),
  card: {
    background: 'white', borderRadius: 14, padding: 24,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 20
  },
  input: (err) => ({
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: `1.5px solid ${err ? '#EF4444' : 'var(--gray-200)'}`,
    outline: 'none', transition: 'border-color 0.2s',
  }),
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 5 },
  btn: (variant = 'primary') => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    ...(variant === 'primary' ? {
      background: 'linear-gradient(135deg,#FF6B00,#FF8C33)', color: 'white',
      boxShadow: '0 2px 8px rgba(255,107,0,0.3)', border: 'none'
    } : variant === 'danger' ? {
      background: '#FEE2E2', color: '#DC2626', border: '1px solid #FCA5A5'
    } : {
      background: 'var(--gray-100)', color: 'var(--gray-700)', border: '1px solid var(--gray-200)'
    })
  }),
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600,
    color: 'var(--gray-500)', borderBottom: '2px solid var(--gray-100)',
    background: 'var(--gray-50)'
  },
  td: {
    padding: '10px 12px', fontSize: 13, color: 'var(--gray-700)',
    borderBottom: '1px solid var(--gray-100)', verticalAlign: 'middle'
  },
}

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────

function SectionHeader({ title, onAdd, addLabel = 'Add New' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)' }}>{title}</h3>
      {onAdd && (
        <button onClick={onAdd} style={S.btn('primary')}>
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'fadeIn 0.2s ease',
        maxHeight: '90vh', overflow: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--gray-400)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  )
}

// ─── SECTIONS ─────────────────────────────────────────────────────────────────

function CollegeSection({ user }) {
  const [data, setData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/admin/college').then(r => {
      setData(r.data)
      setForm(r.data)
    }).catch(() => { })
  }, [])

  const save = async () => {
    setLoading(true)
    try {
      await api.put('/admin/college', form)
      setData(form)
      setEditing(false)
      toast.success('College details updated!')
    } catch { toast.error('Failed to update') }
    finally { setLoading(false) }
  }

  if (!data) return <div style={{ color: 'var(--gray-400)', fontSize: 13 }}>Loading...</div>

  const fields = [
    { key: 'name', label: 'College Name' },
    { key: 'city', label: 'City' },
    { key: 'district', label: 'District' },
    { key: 'college_type', label: 'College Type', type: 'select', options: ['Government', 'Aided', 'Private', 'Polytechnic'] },
    { key: 'website', label: 'Website' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
  ]

  return (
    <div style={S.card}>
      <SectionHeader title="College Details" />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12,
        marginBottom: editing ? 20 : 0
      }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={S.label}>{f.label}</label>
            {editing ? (
              f.type === 'select' ? (
                <select
                  value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={S.input()}
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={S.input()}
                />
              )
            ) : (
              <div style={{ fontSize: 14, color: 'var(--gray-800)', fontWeight: 500 }}>
                {data[f.key] || <span style={{ color: 'var(--gray-400)' }}>—</span>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {editing ? (
          <>
            <button style={S.btn('primary')} onClick={save} disabled={loading}>
              <Save size={14} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button style={S.btn('secondary')} onClick={() => { setEditing(false); setForm(data) }}>
              <X size={14} /> Cancel
            </button>
          </>
        ) : (
          <button style={S.btn('secondary')} onClick={() => setEditing(true)}>
            <Pencil size={14} /> Edit Details
          </button>
        )}
      </div>
    </div>
  )
}


function CoursesSection() {
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', branch: '', duration_years: 4, intake_capacity: 60 })
  const [showFeeModal, setShowFeeModal] = useState(false)
  const [feeForm, setFeeForm] = useState({ course_id: '', tuition_fee: '', hostel_fee: '', other_fee: '' })

  const load = () => api.get('/admin/courses').then(r => setCourses(r.data)).catch(() => { })
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditItem(null); setForm({ name: '', branch: '', duration_years: 4, intake_capacity: 60 }); setShowModal(true) }
  const openEdit = (c) => { setEditItem(c); setForm(c); setShowModal(true) }
  const openFee = (c) => { setFeeForm({ course_id: c.id, tuition_fee: c.tuition_fee || '', hostel_fee: c.hostel_fee || '', other_fee: c.other_fee || '' }); setShowFeeModal(true) }

  const save = async () => {
    try {
      if (editItem) { await api.put(`/admin/courses/${editItem.id}`, form) }
      else { await api.post('/admin/courses', form) }
      toast.success(editItem ? 'Course updated' : 'Course added')
      setShowModal(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this course? Associated data will also be removed.')) return
    try { await api.delete(`/admin/courses/${id}`); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const saveFee = async () => {
    try { await api.post('/admin/fees', feeForm); toast.success('Fees saved'); setShowFeeModal(false); load() }
    catch { toast.error('Error saving fees') }
  }

  return (
    <div style={S.card}>
      <SectionHeader title="Courses & Branches" onAdd={openAdd} addLabel="Add Course" />
      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              {['Course Name', 'Branch', 'Duration', 'Intake', 'Tuition Fee', 'Actions'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 && (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>
                No courses added yet. Click "Add Course" to get started.
              </td></tr>
            )}
            {courses.map(c => (
              <tr key={c.id} style={{ transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={S.td}><strong>{c.name}</strong></td>
                <td style={S.td}>{c.branch}</td>
                <td style={S.td}>{c.duration_years} yrs</td>
                <td style={S.td}>{c.intake_capacity}</td>
                <td style={S.td}>
                  {c.tuition_fee ? `₹${Number(c.tuition_fee).toLocaleString()}` :
                    <button style={{ ...S.btn('secondary'), fontSize: 11, padding: '4px 10px' }} onClick={() => openFee(c)}>
                      Set Fees
                    </button>
                  }
                </td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.tuition_fee && <button style={{ ...S.btn('secondary'), padding: '5px 10px' }} onClick={() => openFee(c)}><IndianRupee size={12} /></button>}
                    <button style={{ ...S.btn('secondary'), padding: '5px 10px' }} onClick={() => openEdit(c)}><Pencil size={12} /></button>
                    <button style={{ ...S.btn('danger'), padding: '5px 10px' }} onClick={() => del(c.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editItem ? 'Edit Course' : 'Add Course'} onClose={() => setShowModal(false)}>
          <FormRow label="Course Name (e.g. B.Tech, Diploma)">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={S.input()} placeholder="B.Tech" />
          </FormRow>
          <FormRow label="Branch">
            <input value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })} style={S.input()} placeholder="Computer Science & Engineering" />
          </FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormRow label="Duration (years)">
              <input type="number" value={form.duration_years} onChange={e => setForm({ ...form, duration_years: e.target.value })} style={S.input()} min={1} max={6} />
            </FormRow>
            <FormRow label="Intake Capacity">
              <input type="number" value={form.intake_capacity} onChange={e => setForm({ ...form, intake_capacity: e.target.value })} style={S.input()} />
            </FormRow>
          </div>
          <button style={{ ...S.btn('primary'), width: '100%', justifyContent: 'center' }} onClick={save}>
            <Save size={14} /> {editItem ? 'Save Changes' : 'Add Course'}
          </button>
        </Modal>
      )}

      {showFeeModal && (
        <Modal title="Set Fee Structure" onClose={() => setShowFeeModal(false)}>
          <FormRow label="Tuition Fee (₹/year)">
            <input type="number" value={feeForm.tuition_fee} onChange={e => setFeeForm({ ...feeForm, tuition_fee: e.target.value })} style={S.input()} />
          </FormRow>
          <FormRow label="Hostel Fee (₹/year, if applicable)">
            <input type="number" value={feeForm.hostel_fee} onChange={e => setFeeForm({ ...feeForm, hostel_fee: e.target.value })} style={S.input()} />
          </FormRow>
          <FormRow label="Other Fees (₹/year)">
            <input type="number" value={feeForm.other_fee} onChange={e => setFeeForm({ ...feeForm, other_fee: e.target.value })} style={S.input()} />
          </FormRow>
          <button style={{ ...S.btn('primary'), width: '100%', justifyContent: 'center' }} onClick={saveFee}>
            <Save size={14} /> Save Fee Structure
          </button>
        </Modal>
      )}
    </div>
  )
}


function HostelSection() {
  const [data, setData] = useState({})
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    api.get('/admin/hostel').then(r => {
      const d = r.data || {}
      // Normalize is_available to a JS boolean regardless of what MySQL returns (1/0/true/false)
      const normalized = { ...d, is_available: !!d.is_available }
      setData(normalized)
      setForm(normalized)
    }).catch(() => { })
  }, [])

  const save = async () => {
    try {
      // Use !! to safely coerce any truthy value (true, 1, "true") to boolean
      const payload = { ...form, is_available: !!form.is_available }
      await api.post('/admin/hostel', payload)
      setData(payload); setEditing(false)
      toast.success('Hostel info saved!')
    } catch { toast.error('Save failed') }
  }

  return (
    <div style={S.card}>
      <SectionHeader title="Hostel Facilities" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 16 }}>
        <FormRow label="Total Rooms">
          {editing ? <input type="number" value={form.total_rooms || ''} onChange={e => setForm({ ...form, total_rooms: e.target.value })} style={S.input()} />
            : <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--royal-blue)' }}>{data.total_rooms || '—'}</div>}
        </FormRow>
        <FormRow label="Total Capacity (students)">
          {editing ? <input type="number" value={form.capacity || ''} onChange={e => setForm({ ...form, capacity: e.target.value })} style={S.input()} />
            : <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--royal-blue)' }}>{data.capacity || '—'}</div>}
        </FormRow>
        <FormRow label="Hostel Available">
          {editing ? (
            <select value={String(form.is_available)} onChange={e => setForm({ ...form, is_available: e.target.value === 'true' })} style={S.input()}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: data.is_available ? '#22C55E' : '#EF4444'
              }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: data.is_available ? '#16A34A' : '#DC2626' }}>
                {data.is_available ? 'Available' : 'Not Available'}
              </span>
            </div>
          )}
        </FormRow>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {editing ? (
          <>
            <button style={S.btn('primary')} onClick={save}><Save size={14} /> Save</button>
            <button style={S.btn('secondary')} onClick={() => { setEditing(false); setForm(data) }}><X size={14} /> Cancel</button>
          </>
        ) : (
          <button style={S.btn('secondary')} onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
        )}
      </div>
    </div>
  )
}


function AdmissionsSection() {
  const [items, setItems] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ course_id: '', academic_year: '2024-2025', start_date: '', end_date: '', admission_link: '' })

  const load = () => {
    api.get('/admin/admissions').then(r => setItems(r.data)).catch(() => { })
    api.get('/admin/courses').then(r => setCourses(r.data)).catch(() => { })
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditItem(null); setForm({ course_id: '', academic_year: '2024-2025', start_date: '', end_date: '', admission_link: '' }); setShowModal(true) }
  const openEdit = (item) => { setEditItem(item); setForm(item); setShowModal(true) }

  const save = async () => {
    try {
      if (editItem) await api.put(`/admin/admissions/${editItem.id}`, form)
      else await api.post('/admin/admissions', form)
      toast.success(editItem ? 'Updated' : 'Added'); setShowModal(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this admission schedule?')) return
    try { await api.delete(`/admin/admissions/${id}`); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div style={S.card}>
      <SectionHeader title="Admission Schedules" onAdd={openAdd} addLabel="Add Schedule" />
      <table style={S.table}>
        <thead>
          <tr>{['Course', 'Branch', 'Academic Year', 'Period', 'Link', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>No admission schedules added yet.</td></tr>
          )}
          {items.map(item => (
            <tr key={item.id}>
              <td style={S.td}><strong>{item.course_name}</strong></td>
              <td style={S.td}>{item.branch}</td>
              <td style={S.td}>{item.academic_year}</td>
              <td style={S.td}>{item.start_date} → {item.end_date}</td>
              <td style={S.td}>
                {item.admission_link ? (
                  <a href={item.admission_link} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--saffron)', fontSize: 12, textDecoration: 'underline' }}>Link</a>
                ) : '—'}
              </td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...S.btn('secondary'), padding: '5px 10px' }} onClick={() => openEdit(item)}><Pencil size={12} /></button>
                  <button style={{ ...S.btn('danger'), padding: '5px 10px' }} onClick={() => del(item.id)}><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editItem ? 'Edit Admission Schedule' : 'Add Admission Schedule'} onClose={() => setShowModal(false)}>
          <FormRow label="Course">
            <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} style={S.input()}>
              <option value="">-- Select Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.branch}</option>)}
            </select>
          </FormRow>
          <FormRow label="Academic Year">
            <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} style={S.input()} placeholder="2024-2025" />
          </FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormRow label="Start Date">
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={S.input()} />
            </FormRow>
            <FormRow label="End Date">
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} style={S.input()} />
            </FormRow>
          </div>
          <FormRow label="Admission Portal Link">
            <input value={form.admission_link} onChange={e => setForm({ ...form, admission_link: e.target.value })} style={S.input()} placeholder="https://..." />
          </FormRow>
          <button style={{ ...S.btn('primary'), width: '100%', justifyContent: 'center' }} onClick={save}>
            <Save size={14} /> {editItem ? 'Save Changes' : 'Add Schedule'}
          </button>
        </Modal>
      )}
    </div>
  )
}


function CutoffsSection() {
  const [items, setItems] = useState([])
  const [courses, setCourses] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ course_id: '', academic_year: '2023-2024', category: 'General', opening_rank: '', closing_rank: '' })

  const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'PH']

  const load = () => {
    api.get('/admin/cutoffs').then(r => setItems(r.data)).catch(() => { })
    api.get('/admin/courses').then(r => setCourses(r.data)).catch(() => { })
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setEditItem(null); setForm({ course_id: '', academic_year: '2023-2024', category: 'General', opening_rank: '', closing_rank: '' }); setShowModal(true) }
  const openEdit = (item) => { setEditItem(item); setForm(item); setShowModal(true) }

  const save = async () => {
    try {
      if (editItem) await api.put(`/admin/cutoffs/${editItem.id}`, form)
      else await api.post('/admin/cutoffs', form)
      toast.success(editItem ? 'Updated' : 'Added'); setShowModal(false); load()
    } catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this cutoff entry?')) return
    try { await api.delete(`/admin/cutoffs/${id}`); toast.success('Deleted'); load() }
    catch { toast.error('Error') }
  }

  const catColors = { General: '#3B82F6', OBC: '#F59E0B', SC: '#8B5CF6', ST: '#10B981', EWS: '#EC4899', PH: '#6B7280' }

  return (
    <div style={S.card}>
      <SectionHeader title="Previous Year Cutoff Ranks" onAdd={openAdd} addLabel="Add Cutoff" />
      <table style={S.table}>
        <thead>
          <tr>{['Course', 'Branch', 'Year', 'Category', 'Opening Rank', 'Closing Rank', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: 'var(--gray-400)', padding: 24 }}>No cutoff data added yet.</td></tr>
          )}
          {items.map(item => (
            <tr key={item.id}>
              <td style={S.td}><strong>{item.course_name}</strong></td>
              <td style={S.td}>{item.branch}</td>
              <td style={S.td}>{item.academic_year}</td>
              <td style={S.td}>
                <span style={{
                  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: `${catColors[item.category] || '#6B7280'}22`,
                  color: catColors[item.category] || '#6B7280'
                }}>{item.category}</span>
              </td>
              <td style={S.td}>{item.opening_rank}</td>
              <td style={S.td}>{item.closing_rank}</td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...S.btn('secondary'), padding: '5px 10px' }} onClick={() => openEdit(item)}><Pencil size={12} /></button>
                  <button style={{ ...S.btn('danger'), padding: '5px 10px' }} onClick={() => del(item.id)}><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editItem ? 'Edit Cutoff' : 'Add Cutoff'} onClose={() => setShowModal(false)}>
          <FormRow label="Course">
            <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} style={S.input()}>
              <option value="">-- Select Course --</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.branch}</option>)}
            </select>
          </FormRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormRow label="Academic Year">
              <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} style={S.input()} placeholder="2023-2024" />
            </FormRow>
            <FormRow label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={S.input()}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormRow>
            <FormRow label="Opening Rank">
              <input type="number" value={form.opening_rank} onChange={e => setForm({ ...form, opening_rank: e.target.value })} style={S.input()} />
            </FormRow>
            <FormRow label="Closing Rank">
              <input type="number" value={form.closing_rank} onChange={e => setForm({ ...form, closing_rank: e.target.value })} style={S.input()} />
            </FormRow>
          </div>
          <button style={{ ...S.btn('primary'), width: '100%', justifyContent: 'center' }} onClick={save}>
            <Save size={14} /> {editItem ? 'Save Changes' : 'Add Cutoff'}
          </button>
        </Modal>
      )}
    </div>
  )
}


// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'college', label: 'College Details', icon: Building2 },
  { id: 'courses', label: 'Courses & Fees', icon: BookOpen },
  { id: 'hostel', label: 'Hostel', icon: Hotel },
  { id: 'admissions', label: 'Admission Schedules', icon: CalendarDays },
  { id: 'cutoffs', label: 'Cutoff Ranks', icon: TrendingDown },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('college')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogout = () => { logout(); navigate('/') }

  const renderSection = () => {
    switch (active) {
      case 'college': return <CollegeSection user={user} />
      case 'courses': return <CoursesSection />
      case 'hostel': return <HostelSection />
      case 'admissions': return <AdmissionsSection />
      case 'cutoffs': return <CutoffsSection />
      default: return null
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--gray-50)', position: 'relative' }}>
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="hide-on-desktop"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={sidebarOpen ? "sidebar-responsive" : "hide-on-mobile"}
        style={{
          width: sidebarOpen ? 240 : 64,
          background: 'linear-gradient(180deg,#1A3A6B 0%,#0F2449 100%)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s ease', flexShrink: 0,
          boxShadow: '4px 0 15px rgba(0,0,0,0.1)'
        }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#FF6B00,#FF8C33)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={18} color="white" />
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>Admin Panel</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>DTE Rajasthan</div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {sidebarOpen && (
            <button
              className="hide-on-desktop"
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', color: 'rgba(255,255,255,0.6)', padding: 4 }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* College badge */}
        {sidebarOpen && user && (
          <div style={{
            margin: '12px 12px 0', padding: '10px 12px',
            background: 'rgba(255,255,255,0.08)', borderRadius: 10,
          }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Logged in as</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'white', wordBreak: 'break-word' }}>{user.college_name || user.username}</div>
            {user.college_code && <div style={{ fontSize: 10, color: 'rgba(255,107,0,0.8)', marginTop: 1 }}>{user.college_code}</div>}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: 12, overflowY: 'auto', marginTop: 8 }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            return (
              <div key={item.id}
                style={S.sidebarItem(active === item.id)}
                onClick={() => { setActive(item.id); if (window.innerWidth <= 768) setSidebarOpen(false); }}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </div>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div
            style={S.sidebarItem(false)}
            onClick={() => navigate('/')}
            title="View Chat"
          >
            <MessageSquare size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && 'View Chatbot'}
          </div>
          <div
            style={{ ...S.sidebarItem(false), color: 'rgba(255,100,100,0.8)' }}
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && 'Logout'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="p-responsive" style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto', padding: 24, paddingBottom: 60 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          marginBottom: 24, gap: 12, flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="hide-on-desktop"
              onClick={() => setSidebarOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 8, borderRadius: 8, background: 'white',
                border: '1px solid var(--gray-200)', color: 'var(--gray-700)'
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, color: 'var(--gray-800)' }}>
                {NAV_ITEMS.find(n => n.id === active)?.label}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                Manage and update your college information
              </p>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10,
            background: 'white', border: '1px solid var(--gray-200)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <CheckCircle size={14} color="#22C55E" />
            <span style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 500 }}>
              Data synced to AI chatbot
            </span>
          </div>
        </div>

        {/* Info banner */}
        <div style={{
          background: 'linear-gradient(135deg,rgba(255,107,0,0.08),rgba(26,58,107,0.08))',
          border: '1px solid rgba(255,107,0,0.15)',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 20, fontSize: 13, color: 'var(--gray-700)'
        }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <span>All data you enter here is automatically used by <strong>Edubot AI</strong> to answer student queries in real-time.</span>
        </div>

        {renderSection()}
      </main>

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  )
}