
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
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,

} from 'firebase/auth'

function App() {
  const isDev = import.meta.env.DEV
  const [section, setSection] = useState('welcome')
  const [expandedPlan, setExpandedPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [db, setDb] = useState(null)

  const [auth, setAuth] = useState(null)
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState('signin')
  const [authError, setAuthError] = useState('')
  const [appId, setAppId] = useState(globalThis.__app_id)
  const [initKey, setInitKey] = useState(0)
  const [pendingGuest, setPendingGuest] = useState(false)


  const clientOptions = ['Sportsbet', 'KenoGo', 'Swisse', 'Custom']

  const [form, setForm] = useState({
    client: clientOptions[0],
    customClient: '',
    name: '',
    totalBudget: '',
    channels: [],
  })
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const demoOptions = ['Total People', 'M18-35', 'F25-54', 'M35-49', 'Custom']
  const metricOptions = [
    'Impressions',
    'Clicks',
    'Reach',
    'Video Views',
    'Cost Per Acquisition',
    'Custom',
  ]


  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!auth) return
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setAuthError(err.message)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!auth) return
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setAuthError(err.message)
    }
  }

  const handleGuest = () => {
    if (!globalThis.__firebase_config) {

      globalThis.__firebase_config = {
        projectId: 'demo-app',
        apiKey: 'demo-api-key',
        authDomain: 'demo-app.firebaseapp.com',
      }

      globalThis.__app_id = 'demo-app'
      globalThis.__use_emulator = true
      setAppId(globalThis.__app_id)
      setPendingGuest(true)
      setInitKey((k) => k + 1)
      return
    }
    if (!auth) {
      setPendingGuest(true)
      setInitKey((k) => k + 1)
      return
    }
    signInAnonymously(auth).catch((err) => setAuthError(err.message))
  }

  useEffect(() => {
    if (isDev) {
      setLoading(false)
      setUserId('dev-user')
      return
    }
    if (!globalThis.__firebase_config) {
      setLoading(false)
      return
    }
    const app = initializeApp(globalThis.__firebase_config)
    const dbInstance = getFirestore(app)
    const authInstance = getAuth(app)
    if (globalThis.__use_emulator) {
      connectFirestoreEmulator(dbInstance, 'localhost', 8080)
      connectAuthEmulator(authInstance, 'http://localhost:9099')
    }
    setDb(dbInstance)
    setAuth(authInstance)
    const token = globalThis.__initial_auth_token
    if (token)
      signInWithCustomToken(authInstance, token).catch(console.error)
    let unsubSnap
    const unsubAuth = onAuthStateChanged(authInstance, (user) => {
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

    if (pendingGuest) {
      signInAnonymously(authInstance).catch((err) => setAuthError(err.message))
      setPendingGuest(false)
    }

    return () => {
      unsubAuth()
      if (unsubSnap) unsubSnap()
    }

    // pendingGuest intentionally omitted from deps to avoid extra init cycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey, appId, isDev])


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
      if (field === 'demo' && value !== 'Custom') updated[index].customDemo = ''
      if (field === 'metric' && value !== 'Custom') updated[index].customMetric = ''
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
          {
            name: '',
            publisher: '',
            adFormat: '',
            size: '',
            startDate: '',
            endDate: '',
            budget: '',
            demo: 'Total People',
            customDemo: '',
            metric: 'Impressions',
            customMetric: '',
            value: '',
            mediaCommissionPct: '',
            productionInstallationPct: '',
          },
        ],
      }
      validateBudget(newForm)
      return newForm
    })
  }

  const handleSavePlan = async (e) => {
    e.preventDefault()
    if (!validateBudget(form)) return
    const startDate = form.channels.reduce(
      (min, ch) => (ch.startDate && (!min || ch.startDate < min) ? ch.startDate : min),
      '',
    )
    const endDate = form.channels.reduce(
      (max, ch) => (ch.endDate && (!max || ch.endDate > max) ? ch.endDate : max),
      '',
    )
    const planData = {
      client: form.client === 'Custom' ? form.customClient : form.client,
      name: form.name,
      totalBudget: Number(form.totalBudget),
      startDate,
      endDate,
      channels: form.channels.map((c) => ({
        name: c.name,
        publisher: c.publisher,
        adFormat: c.adFormat,
        size: c.size,
        startDate: c.startDate,
        endDate: c.endDate,
        budget: Number(c.budget),
        demo: c.demo === 'Custom' ? c.customDemo : c.demo,
        metric: c.metric === 'Custom' ? c.customMetric : c.metric,
        value: Number(c.value),
        mediaCommissionPct: Number(c.mediaCommissionPct) || 0,
        mediaCommissionAmount:
          ((Number(c.budget) || 0) * (Number(c.mediaCommissionPct) || 0)) /
          100,
        productionInstallationPct: Number(c.productionInstallationPct) || 0,
        productionInstallationAmount:
          ((Number(c.budget) || 0) *
            (Number(c.productionInstallationPct) || 0)) /
          100,
      })),
    }
    if (isDev) {
      const newPlan = { id: Date.now().toString(), ...planData }
      setPlans((p) => [...p, newPlan])
    } else {
      if (!db || !userId) return
      const colRef = collection(db, 'artifacts', appId, 'users', userId, 'mediaPlans')
      await addDoc(colRef, planData)
    }
    setForm({ client: clientOptions[0], customClient: '', name: '', totalBudget: '', channels: [] })
    setSection('plans')
  }

  const handleUpdatePlan = async (e) => {
    e.preventDefault()
    if (!editingId || !validateBudget(form)) return
    const startDate = form.channels.reduce(
      (min, ch) => (ch.startDate && (!min || ch.startDate < min) ? ch.startDate : min),
      '',
    )
    const endDate = form.channels.reduce(
      (max, ch) => (ch.endDate && (!max || ch.endDate > max) ? ch.endDate : max),
      '',
    )
    const planData = {
      client: form.client === 'Custom' ? form.customClient : form.client,
      name: form.name,
      totalBudget: Number(form.totalBudget),
      startDate,
      endDate,
      channels: form.channels.map((c) => ({
        name: c.name,
        publisher: c.publisher,
        adFormat: c.adFormat,
        size: c.size,
        startDate: c.startDate,
        endDate: c.endDate,
        budget: Number(c.budget),
        demo: c.demo === 'Custom' ? c.customDemo : c.demo,
        metric: c.metric === 'Custom' ? c.customMetric : c.metric,
        value: Number(c.value),
        mediaCommissionPct: Number(c.mediaCommissionPct) || 0,
        mediaCommissionAmount:
          ((Number(c.budget) || 0) * (Number(c.mediaCommissionPct) || 0)) /
          100,
        productionInstallationPct: Number(c.productionInstallationPct) || 0,
        productionInstallationAmount:
          ((Number(c.budget) || 0) *
            (Number(c.productionInstallationPct) || 0)) /
          100,
      })),
    }
    if (isDev) {
      setPlans((p) =>
        p.map((pl) => (pl.id === editingId ? { id: editingId, ...planData } : pl)),
      )
    } else {
      if (!db || !userId) return
      const docRef = doc(
        db,
        'artifacts',
        appId,
        'users',
        userId,
        'mediaPlans',
        editingId,
      )
      await updateDoc(docRef, planData)
    }
    setEditingId(null)
    setForm({
      client: clientOptions[0],
      customClient: '',
      name: '',
      totalBudget: '',
      channels: [],
    })
    setSection('plans')
  }

  const handleEditPlan = (plan) => {
    setForm({
      client: clientOptions.includes(plan.client) ? plan.client : 'Custom',
      customClient: clientOptions.includes(plan.client) ? '' : plan.client,
      name: plan.name,
      totalBudget: plan.totalBudget,
      channels: plan.channels.map((c) => ({
        name: c.name,
        publisher: c.publisher || '',
        adFormat: c.adFormat || '',
        size: c.size || '',
        startDate: c.startDate || '',
        endDate: c.endDate || '',
        budget: c.budget,
        demo: demoOptions.includes(c.demo) ? c.demo : 'Custom',
        customDemo: demoOptions.includes(c.demo) ? '' : c.demo,
        metric: metricOptions.includes(c.metric) ? c.metric : 'Custom',
        customMetric: metricOptions.includes(c.metric) ? '' : c.metric,
        value: c.value,
        mediaCommissionPct: c.mediaCommissionPct || '',
        productionInstallationPct: c.productionInstallationPct || '',
      })),
    })
    setEditingId(plan.id)
    setSection('create')
  }

  const handleDeletePlan = async (planId) => {
    if (isDev) {
      setPlans((p) => p.filter((pl) => pl.id !== planId))
      return
    }
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
                <label className="block text-sm font-medium">Client</label>
                <select
                  value={form.client}
                  onChange={(e) => handleChange('client', e.target.value)}
                  className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {clientOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {form.client === 'Custom' && (
                  <div className="mt-1">
                    <label className="block text-sm font-medium">Custom Client</label>
                    <input
                      type="text"
                      value={form.customClient}
                      onChange={(e) => handleChange('customClient', e.target.value)}
                      className="mt-1 p-2 border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
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
              <div>
                <h3 className="text-xl font-semibold mb-2">Channels</h3>
                {form.channels.map((ch, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-2 mb-2 md:[grid-template-columns:repeat(14,minmax(0,1fr))]"
                  >
                    <div>
                      <label className="block text-sm font-medium">Channel Name</label>
                      <input
                        type="text"
                        value={ch.name}
                        onChange={(e) =>
                          handleChannelChange(idx, 'name', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Publisher</label>
                      <input
                        type="text"
                        value={ch.publisher}
                        onChange={(e) =>
                          handleChannelChange(idx, 'publisher', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Ad Format</label>
                      <input
                        type="text"
                        value={ch.adFormat}
                        onChange={(e) =>
                          handleChannelChange(idx, 'adFormat', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Size</label>
                      <input
                        type="text"
                        value={ch.size}
                        onChange={(e) =>
                          handleChannelChange(idx, 'size', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Start Date</label>
                      <input
                        type="date"
                        value={ch.startDate}
                        onChange={(e) =>
                          handleChannelChange(idx, 'startDate', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">End Date</label>
                      <input
                        type="date"
                        value={ch.endDate}
                        onChange={(e) =>
                          handleChannelChange(idx, 'endDate', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Budget Allocation</label>
                      <input
                        type="number"
                        value={ch.budget}
                        onChange={(e) =>
                          handleChannelChange(idx, 'budget', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Demo</label>
                      <select
                        value={ch.demo}
                        onChange={(e) =>
                          handleChannelChange(idx, 'demo', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full"
                      >
                        {demoOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {ch.demo === 'Custom' && (
                        <div className="mt-1">
                          <label className="block text-sm font-medium">Custom Demo</label>
                          <input
                            type="text"
                            value={ch.customDemo}
                            onChange={(e) =>
                              handleChannelChange(idx, 'customDemo', e.target.value)
                            }
                            className="mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Target Metric</label>
                      <select
                        value={ch.metric}
                        onChange={(e) =>
                          handleChannelChange(idx, 'metric', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full"
                      >
                        {metricOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {ch.metric === 'Custom' && (
                        <div className="mt-1">
                          <label className="block text-sm font-medium">Custom Metric Name</label>
                          <input
                            type="text"
                            value={ch.customMetric}
                            onChange={(e) =>
                              handleChannelChange(
                                idx,
                                'customMetric',
                                e.target.value,
                              )
                            }
                            className="mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-full"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Target Value</label>
                      <input
                        type="number"
                        value={ch.value}
                        onChange={(e) =>
                          handleChannelChange(idx, 'value', e.target.value)
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Media Commission (%)</label>
                      <input
                        type="number"
                        value={ch.mediaCommissionPct || ''}
                        onChange={(e) =>
                          handleChannelChange(
                            idx,
                            'mediaCommissionPct',
                            e.target.value,
                          )
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Amount: $
                        {(
                          ((Number(ch.budget) || 0) *
                            (Number(ch.mediaCommissionPct) || 0)) /
                          100
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium">
                        Production & Installation Fee (%)
                      </label>
                      <input
                        type="number"
                        value={ch.productionInstallationPct || ''}
                        onChange={(e) =>
                          handleChannelChange(
                            idx,
                            'productionInstallationPct',
                            e.target.value,
                          )
                        }
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Amount: $
                        {(
                          ((Number(ch.budget) || 0) *
                            (Number(ch.productionInstallationPct) || 0)) /
                          100
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
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
                    <th className="p-2 border-b">Client</th>
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
                        <td className="p-2 border-b">{plan.client}</td>
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
                          <td colSpan={6} className="p-2 border-b">
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm text-left">
                                <thead>
                                  <tr className="border-b">
                                    <th className="p-1">Channel</th>
                                    <th className="p-1">Publisher</th>
                                    <th className="p-1">Ad Format</th>
                                    <th className="p-1">Size</th>
                                    <th className="p-1">Start</th>
                                    <th className="p-1">End</th>
                                    <th className="p-1">Demo</th>
                                    <th className="p-1">Budget</th>
                                    <th className="p-1">Target Metric</th>
                                    <th className="p-1">Target Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {plan.channels.map((ch, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                      <td className="p-1">{ch.name}</td>
                                      <td className="p-1">{ch.publisher}</td>
                                      <td className="p-1">{ch.adFormat}</td>
                                      <td className="p-1">{ch.size}</td>
                                      <td className="p-1">{ch.startDate}</td>
                                      <td className="p-1">{ch.endDate}</td>
                                      <td className="p-1">{ch.demo}</td>
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


  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow w-full max-w-sm">
          <h2 className="text-2xl font-semibold mb-4">
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <form
            onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}
            className="space-y-4"
          >
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {authError && <p className="text-red-600 text-sm">{authError}</p>}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
            >
              {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <button
            onClick={handleGuest}
            className="mt-4 w-full py-2 bg-gray-600 text-white rounded-md shadow hover:bg-gray-700 transition"
          >
            Continue as Guest
          </button>
          <p className="mt-4 text-center text-sm">
            {authMode === 'signin' ? 'Need an account?' : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                setAuthError('')
              }}
              className="text-blue-600 underline"
            >
              {authMode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
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
