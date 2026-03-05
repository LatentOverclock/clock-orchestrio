import { useEffect, useState } from 'react'
import { graphQLRequest } from './graphql'

type Entry = {
  id: string
  task: string
  startedAt: string
  endedAt?: string
  durationSeconds?: number
  notes?: string
}

type EntriesData = { entries: Entry[]; activeEntry?: Entry | null }

const LIST_QUERY = `query { entries { id task startedAt endedAt durationSeconds notes } activeEntry { id task startedAt } }`
const START_MUTATION = `mutation($task:String!, $notes:String){ startEntry(task:$task, notes:$notes){ id } }`
const STOP_MUTATION = `mutation { stopEntry { id } }`
const MANUAL_MUTATION = `mutation($task:String!, $startedAt:String!, $endedAt:String!, $notes:String){ addManualEntry(task:$task, startedAt:$startedAt, endedAt:$endedAt, notes:$notes){ id } }`
const DELETE_MUTATION = `mutation($id:ID!){ deleteEntry(id:$id) }`

function fmtDuration(s?: number) {
  if (s === undefined) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}h ${m}m ${sec}s`
}

export function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [active, setActive] = useState<Entry | null>(null)
  const [task, setTask] = useState('')
  const [notes, setNotes] = useState('')
  const [mTask, setMTask] = useState('')
  const [mStart, setMStart] = useState('')
  const [mEnd, setMEnd] = useState('')

  async function load() {
    const data = await graphQLRequest<EntriesData>(LIST_QUERY)
    setEntries(data.entries)
    setActive(data.activeEntry ?? null)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [])

  async function start() {
    await graphQLRequest(START_MUTATION, { task, notes: notes || null })
    setTask('')
    setNotes('')
    await load()
  }

  async function stop() {
    await graphQLRequest(STOP_MUTATION)
    await load()
  }

  async function addManual() {
    await graphQLRequest(MANUAL_MUTATION, {
      task: mTask,
      startedAt: new Date(mStart).toISOString(),
      endedAt: new Date(mEnd).toISOString(),
      notes: null
    })
    setMTask('')
    setMStart('')
    setMEnd('')
    await load()
  }

  async function deleteEntry(id: string) {
    await graphQLRequest(DELETE_MUTATION, { id })
    await load()
  }

  return (
    <main className="mx-auto max-w-6xl p-4 text-slate-100">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Clock Orchestrio</h1>
        <a
          className="rounded border border-sky-700 bg-sky-950 px-3 py-2 text-sm text-sky-200"
          href="https://github.com/LatentOverclock/clock-orchestrio"
          target="_blank"
          rel="noreferrer"
        >
          View GitHub Repo
        </a>
      </header>

      <section className="mb-3 rounded border border-slate-700 bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-medium">Live Timer</h2>
        <p className="mb-3 text-sm text-slate-300">
          {active ? `Active: ${active.task} (started ${new Date(active.startedAt).toLocaleString()})` : 'No active timer'}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded border border-slate-600 bg-slate-950 p-2 text-base" placeholder="Task" value={task} onChange={(e) => setTask(e.target.value)} />
          <input className="rounded border border-slate-600 bg-slate-950 p-2 text-base" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="mt-2 flex gap-2">
          <button className="rounded bg-indigo-700 px-3 py-2 text-sm" onClick={start}>Start</button>
          <button className="rounded bg-indigo-900 px-3 py-2 text-sm" onClick={stop}>Stop</button>
        </div>
      </section>

      <section className="mb-3 rounded border border-slate-700 bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-medium">Manual Entry</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="rounded border border-slate-600 bg-slate-950 p-2 text-base" placeholder="Task" value={mTask} onChange={(e) => setMTask(e.target.value)} />
          <input className="rounded border border-slate-600 bg-slate-950 p-2 text-base" type="datetime-local" value={mStart} onChange={(e) => setMStart(e.target.value)} />
          <input className="rounded border border-slate-600 bg-slate-950 p-2 text-base" type="datetime-local" value={mEnd} onChange={(e) => setMEnd(e.target.value)} />
        </div>
        <button className="mt-2 rounded bg-indigo-700 px-3 py-2 text-sm" onClick={addManual}>Add</button>
      </section>

      <section className="rounded border border-slate-700 bg-slate-900 p-4">
        <h2 className="mb-2 text-lg font-medium">Recent Entries</h2>

        <div className="hidden md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-300">
              <tr>
                <th className="p-2">Task</th>
                <th className="p-2">Start</th>
                <th className="p-2">End</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Notes</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-700">
                  <td className="p-2">{e.task}</td>
                  <td className="p-2">{new Date(e.startedAt).toLocaleString()}</td>
                  <td className="p-2">{e.endedAt ? new Date(e.endedAt).toLocaleString() : '—'}</td>
                  <td className="p-2">{fmtDuration(e.durationSeconds)}</td>
                  <td className="p-2">{e.notes ?? ''}</td>
                  <td className="p-2">
                    <button className="rounded bg-rose-900 px-2 py-1" onClick={() => deleteEntry(e.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 md:hidden">
          {entries.map((e) => (
            <article key={e.id} className="rounded border border-slate-700 bg-slate-950 p-3 text-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-medium text-slate-100">{e.task}</h3>
                <button className="rounded bg-rose-900 px-2 py-1 text-xs" onClick={() => deleteEntry(e.id)}>Delete</button>
              </div>
              <dl className="space-y-1 text-slate-300">
                <div className="flex justify-between gap-3"><dt>Start</dt><dd className="text-right">{new Date(e.startedAt).toLocaleString()}</dd></div>
                <div className="flex justify-between gap-3"><dt>End</dt><dd className="text-right">{e.endedAt ? new Date(e.endedAt).toLocaleString() : '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt>Duration</dt><dd>{fmtDuration(e.durationSeconds)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Notes</dt><dd className="max-w-[60%] break-words text-right">{e.notes ?? ''}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
