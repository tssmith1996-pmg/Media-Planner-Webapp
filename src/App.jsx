/* global __firebase_config, __initial_auth_token, __app_id */
import { useState, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore'
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'

const BudgetProgress = ({ channels = [], total = 0 }) => {
  const allocated = channels.reduce(
    (sum, ch) => sum + Number(ch.budget || 0),
    0
  )
  const percentage = total
    ? Math.min(100, (allocated / Number(total)) * 100)
    : 0
  return (
    <div className="mt-2">
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div
          className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {Math.round(percentage)}% allocated
      </p>
    </div>
  )
}

const initialPlan = {
  campaignName: '',
  totalBudget: '',
  startDate: '',
  endDate: '',
  channels: [],
}

const app = initializeApp(__firebase_config)
const db = getFirestore(app)
const auth = getAuth(app)

function App() {
  const [plan, setPlan] = useState({ ...initialPlan })
  const [plans, setPlans] = useState([])
  const [mockData, setMockData] = useState({})
  const [user, setUser] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const allocatedBudget = plan.channels.reduce(
    (sum, ch) => sum + Number(ch.budget || 0),
    0
  )
  const overBudget =
    Number(plan.totalBudget) && allocatedBudget > Number(plan.totalBudget)

  useEffect(() => {
    let unsubscribePlans = () => {}

    const authPromise = __initial_auth_token
      ? signInWithCustomToken(auth, __initial_auth_token)
      : signInAnonymously(auth)

    authPromise.catch(console.error)

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) {
        const colRef = collection(
          db,
          'artifacts',
          __app_id,
          'users',
          u.uid,
          'mediaPlans'
        )
        unsubscribePlans = onSnapshot(colRef, (snapshot) => {
          const data = snapshot.docs.map((docu) => ({
            id: docu.id,
            ...docu.data(),
          }))
          setPlans(data)
          setLoading(false)
        })
      } else {
        unsubscribePlans()
        setPlans([])
        setLoading(false)
      }
    })

    return () => {
      unsubscribeAuth()
      unsubscribePlans()
    }
  }, [])

  const handlePlanChange = (e) => {
    const { name, value } = e.target
    setPlan((prev) => ({ ...prev, [name]: value }))
  }

  const handleChannelChange = (index, field, value) => {
    setPlan((prev) => {
      const channels = prev.channels.map((ch, i) =>
        i === index ? { ...ch, [field]: value } : ch
      )
      return { ...prev, channels }
    })
  }

  const addChannel = () => {
    setPlan((prev) => ({
      ...prev,
      channels: [
        ...prev.channels,
        { name: '', budget: '', metric: 'Impressions', value: '' },
      ],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    if (overBudget) {
      setError('Budget allocation exceeds total budget')
      return
    }
    setError('')
    const colRef = collection(
      db,
      'artifacts',
      __app_id,
      'users',
      user.uid,
      'mediaPlans'
    )
    if (editingId) {
      const docRef = doc(
        db,
        'artifacts',
        __app_id,
        'users',
        user.uid,
        'mediaPlans',
        editingId
      )
      await updateDoc(docRef, plan)
      setEditingId(null)
    } else {
      await addDoc(colRef, plan)
    }
    setPlan({ ...initialPlan })
  }

  const deletePlan = async (id) => {
    if (!user) return
    const docRef = doc(
      db,
      'artifacts',
      __app_id,
      'users',
      user.uid,
      'mediaPlans',
      id
    )
    await deleteDoc(docRef)
  }

  const editPlan = (p) => {
    const { id, ...rest } = p
    setPlan({ ...initialPlan, ...rest })
    setEditingId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generateMockData = (planObj) => {
    const metric = planObj.channels[0]?.metric || 'Metric'
    const target = Number(planObj.channels[0]?.value || 0)
    const performance = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      actual: Math.floor(target * (0.5 + Math.random())),
      target,
    }))
    const summary = {
      impressions: Math.floor(Math.random() * 100000),
      clicks: Math.floor(Math.random() * 10000),
      cost: (Math.random() * 1000).toFixed(2),
    }
    setMockData((prev) => ({
      ...prev,
      [planObj.id]: { summary, performance, metric },
    }))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-semibold sm:text-xl lg:text-2xl">Media Planner Pro</h1>
          {user && <span className="text-xs sm:text-sm">User ID: {user.uid}</span>}
        </div>
      </nav>

      <main className="flex-grow bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-blue-500">Loading...</p>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto grid gap-8 md:grid-cols-2 lg:grid-cols-2">
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-medium mb-4">Create a New Plan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Campaign Name</label>
                <input
                  type="text"
                  name="campaignName"
                  value={plan.campaignName}
                  onChange={handlePlanChange}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium">Total Budget</label>
                  <input
                    type="number"
                    name="totalBudget"
                    value={plan.totalBudget}
                    onChange={handlePlanChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={plan.startDate}
                    onChange={handlePlanChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={plan.endDate}
                    onChange={handlePlanChange}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {plan.channels.map((channel, index) => (
                <div
                  key={index}
                  className="grid gap-4 sm:grid-cols-4 items-end"
                >
                  <input
                    type="text"
                    placeholder="Channel Name"
                    value={channel.name}
                    onChange={(e) =>
                      handleChannelChange(index, 'name', e.target.value)
                    }
                    className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Budget Allocation"
                    value={channel.budget}
                    onChange={(e) =>
                      handleChannelChange(index, 'budget', e.target.value)
                    }
                    className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={channel.metric}
                    onChange={(e) =>
                      handleChannelChange(index, 'metric', e.target.value)
                    }
                    className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    value={channel.value}
                    onChange={(e) =>
                      handleChannelChange(index, 'value', e.target.value)
                    }
                    className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={addChannel}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow hover:from-blue-700 hover:to-blue-600 hover:shadow-md transition-colors"
              >
                Add Channel
              </button>

              <div className="text-sm text-gray-500">
                Allocated: ${allocatedBudget} / ${plan.totalBudget || 0}
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div>
                <button
                  type="submit"
                  disabled={overBudget}
                  className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg shadow hover:from-green-700 hover:to-green-600 hover:shadow-md transition-colors disabled:opacity-50"
                >
                  {editingId ? 'Update Plan' : 'Save Plan'}
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-medium mb-2">Dashboard</h2>
            {plans.length === 0 ? (
              <p className="text-gray-500">No plans saved</p>
            ) : (
              <ul className="space-y-4">
                {plans.map((p) => (
                  <li key={p.id} className="border rounded-lg p-4 shadow-sm bg-gradient-to-br from-white to-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{p.campaignName}</h3>
                        <p className="text-sm text-gray-500">
                          Total Budget: ${p.totalBudget}
                        </p>
                        <BudgetProgress channels={p.channels} total={p.totalBudget} />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => generateMockData(p)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                        >
                          Generate Mock Performance Data
                        </button>
                        <button
                          type="button"
                          onClick={() => editPlan(p)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors shadow-sm hover:shadow"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePlan(p.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm hover:shadow"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {p.channels && p.channels.length > 0 && (
                      <div className="mt-4 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={p.channels.map((ch) => ({
                              name: ch.name || 'Channel',
                              budget: Number(ch.budget) || 0,
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="budget" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {mockData[p.id] && (
                      <>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm text-gray-500">Impressions</p>
                            <p className="text-lg font-semibold">
                              {mockData[p.id].summary.impressions}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Clicks</p>
                            <p className="text-lg font-semibold">
                              {mockData[p.id].summary.clicks}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Cost</p>
                            <p className="text-lg font-semibold">
                              ${mockData[p.id].summary.cost}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockData[p.id].performance}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="day" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="actual"
                                name={mockData[p.id].metric}
                                stroke="#8884d8"
                              />
                              <Line
                                type="monotone"
                                dataKey="target"
                                name="Target"
                                stroke="#82ca9d"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        )}
      </main>
    </div>
  )
}

export default App
