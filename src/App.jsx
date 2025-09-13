import { useState, useEffect, Fragment } from 'react'
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  connectFirestoreEmulator,
} from 'firebase/firestore'
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  connectAuthEmulator,
} from 'firebase/auth'

function App() {
  const [section, setSection] = useState('welcome')
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [db, setDb] = useState(null)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const appId = globalThis.__app_id

const [form, setForm] = useState({
    name: '',
    totalBudget: '',
    startDate: '',
    endDate: '',
    channels: [],
  })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const app = initializeApp(globalThis.__firebase_config)
    const dbInstance = getFirestore(app)
    const auth = getAuth(app)
    if (globalThis.__use_emulator) {
      connectFirestoreEmulator(dbInstance, 'localhost', 8080)
      connectAuthEmulator(auth, 'http://localhost:9099')
    }
    setDb(dbInstance)
    const token = globalThis.__initial_auth_token
    ;(token ? signInWithCustomToken(auth, token) : signInAnonymously(auth)).catch(
      console.error,
    )
    let unsubSnap
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid)
        const colRef = collection(
          dbInstance,
          'artifacts',
          appId,
          'users',
          user.uid,
          'mediaPlans',
        )
        unsubSnap = onSnapshot(colRef, (snap) => {
          setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
    return () => {
      unsubAuth()
      if (unsubSnap) unsubSnap()
    }
  }, [appId])

  const validateBudget = (f) => {
    const allocated = f.channels.reduce(
      (sum, ch) => sum + Number(ch.budget || 0),
      0,
    )
    if (allocated > Number(f.totalBudget || 0)) {
      setError('Allocated budget exceeds total budget')
      return false
    }
    setError('')
    return true
  }

  const handleChange = (field, value) => {
    setForm((f) => {
      const updated = { ...f, [field]: value }
      validateBudget(updated)
      return updated
    })
  }

  const handleChannelChange = (index, field, value) => {
    setForm((f) => {
      const updated = [...f.channels]
      updated[index] = { ...updated[index], [field]: value }
      const newForm = { ...f, channels: updated }
      validateBudget(newForm)
      return newForm
    })
  }

  const handleAddChannel = () => {
    setForm((f) => {
      const newForm = {
        ...f,
        channels: [
          ...f.channels,
          { name: '', budget: '', metric: 'Impressions', value: '' },
        ],
      }
      validateBudget(newForm)
      return newForm
    })
  }

  const handleSavePlan = async (e) => {
    e.preventDefault()
    if (!validateBudget(form) || !db || !userId) return
    const colRef = collection(db, 'artifacts', appId, 'users', userId, 'mediaPlans')
    await addDoc(colRef, {
      name: form.name,
      totalBudget: Number(form.totalBudget),
      startDate: form.startDate,
      endDate: form.endDate,
      channels: form.channels.map((c) => ({
        name: c.name,
        budget: Number(c.budget),
        metric: c.metric,
        value: Number(c.value),
      })),
    })
    setForm({ name: '', totalBudget: '', startDate: '', endDate: '', channels: [] })
    setSection('plans')
  }

  const handleUpdatePlan = async (e) => {
    e.preventDefault()
    if (!editingId || !validateBudget(form) || !db || !userId) return
    const docRef = doc(
      db,
      'artifacts',
      appId,
      'users',
      userId,
      'mediaPlans',
      editingId,
    )
    await updateDoc(docRef, {
      name: form.name,
      totalBudget: Number(form.totalBudget),
      startDate: form.startDate,
      endDate: form.endDate,
      channels: form.channels.map((c) => ({
        name: c.name,
        budget: Number(c.budget),
        metric: c.metric,
        value: Number(c.value),
      })),
    })
    setEditingId(null)
    setForm({ name: '', totalBudget: '', startDate: '', endDate: '', channels: [] })
    setSection('plans')
  }

  const handleEditPlan = (plan) => {
    setForm({
      name: plan.name,
      totalBudget: plan.totalBudget,
      startDate: plan.startDate,
      endDate: plan.endDate,
      channels: plan.channels,
    })
    setEditingId(plan.id)
    setSection('create')
  }

  const handleDeletePlan = async (planId) => {
    if (!db || !userId) return
    const docRef = doc(
      db,
      'artifacts',
      appId,
      'users',
      userId,
      'mediaPlans',
      planId,
    )
    await deleteDoc(docRef)
  }

  const NavItem = ({ id, icon, label }) => (
    <button
      onClick={() => setSection(id)}
      className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md hover:bg-gray-700/70 transition-colors ${
        section === id ? 'bg-gray-700' : ''
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )

  const renderContent = () => {
    switch (section) {
      case 'dashboard':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold">Dashboard</h2>
          </div>
        )
      case 'create':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">
              {editingId ? 'Edit Plan' : 'Create a New Plan'}
            </h2>
            <form
              onSubmit={editingId ? handleUpdatePlan : handleSavePlan}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium">Campaign Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Total Budget</label>
                <input
                  type="number"
                  value={form.totalBudget}
                  onChange={(e) => handleChange('totalBudget', e.target.value)}
                  className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Channels</h3>
                {form.channels.map((ch, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2"
                  >
                    <input
                      type="text"
                      placeholder="Channel Name"
                      value={ch.name}
                      onChange={(e) =>
                        handleChannelChange(idx, 'name', e.target.value)
                      }
                      className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Budget Allocation"
                      value={ch.budget}
                      onChange={(e) =>
                        handleChannelChange(idx, 'budget', e.target.value)
                      }
                      className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <select
                      value={ch.metric}
                      onChange={(e) =>
                        handleChannelChange(idx, 'metric', e.target.value)
                      }
                      className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>Impressions</option>
                      <option>Clicks</option>
                      <option>Reach</option>
                      <option>Video Views</option>
                      <option>Cost Per Acquisition</option>
                      <option>Custom</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Target Value"
                      value={ch.value}
                      onChange={(e) =>
                        handleChannelChange(idx, 'value', e.target.value)
                      }
                      className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddChannel}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md shadow hover:from-green-600 hover:to-green-700 transition"
                >
                  Add Channel
                </button>
              </div>
              {error && <p className="text-red-600">{error}</p>}
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md shadow hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-50"
                disabled={!!error}
              >
                {editingId ? 'Update Plan' : 'Save Plan'}
              </button>
            </form>
          </div>
        )
      case 'plans':
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Plans</h2>
            <div className="overflow-x-auto rounded-lg shadow">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 border-b">Campaign Name</th>
                    <th className="p-2 border-b">Total Budget</th>
                    <th className="p-2 border-b">Start Date</th>
                    <th className="p-2 border-b">End Date</th>
                    <th className="p-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <Fragment key={plan.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="p-2 border-b">{plan.name}</td>
                        <td className="p-2 border-b">${plan.totalBudget.toLocaleString()}</td>
                        <td className="p-2 border-b">{plan.startDate}</td>
                        <td className="p-2 border-b">{plan.endDate}</td>
                        <td className="p-2 border-b space-x-2">
                          <button
                            onClick={() => handleEditPlan(plan)}
                            className="px-2 py-1 bg-green-500 text-white rounded-md shadow hover:bg-green-600 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded-md shadow hover:bg-red-600 transition"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() =>
                              setExpandedPlan(expandedPlan === plan.id ? null : plan.id)
                            }
                            className="px-2 py-1 bg-blue-500 text-white rounded-md shadow hover:bg-blue-600 transition"
                          >
                            {expandedPlan === plan.id ? 'Hide Details' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedPlan === plan.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="p-2 border-b">
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm text-left">
                                <thead>
                                  <tr className="border-b">
                                    <th className="p-1">Channel</th>
                                    <th className="p-1">Budget</th>
                                    <th className="p-1">Target Metric</th>
                                    <th className="p-1">Target Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {plan.channels.map((ch, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                      <td className="p-1">{ch.name}</td>
                                      <td className="p-1">${ch.budget.toLocaleString()}</td>
                                      <td className="p-1">{ch.metric}</td>
                                      <td className="p-1">{ch.value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      default:
        return (
          <div className="text-center mt-10 bg-white p-10 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Media Planner Pro</h2>
            <p className="text-gray-600">Select a section from the menu to get started.</p>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      <aside className="bg-gradient-to-b from-gray-800 to-gray-900 text-white w-full md:w-64 shadow-lg">
        <div className="p-4 text-xl font-bold border-b border-gray-700">Media Planner Pro</div>
        <nav className="p-4 space-y-2">
          <NavItem id="dashboard" icon="📊" label="Dashboard" />
          <NavItem id="create" icon="📝" label="Create New Plan" />
          <NavItem id="plans" icon="📁" label="Plans" />
        </nav>
      </aside>
      <main className="flex-1 p-6">{renderContent()}</main>
    </div>
  )
}

export default App
