import { useMemo, useState } from 'react'

function App() {
  const [version, setVersion] = useState(1)
  const [stats, setStats] = useState<{ networkHits: number; generatedAt: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const imageUrl = useMemo(
    () => `/api/images/no-store/demo-image.svg?v=${version}`,
    [version],
  )

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stats')
      const data = await response.json()
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  const increaseVersion = () => {
    setVersion((prev) => prev + 1)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Service Worker 캐시 우회 실험</h1>
        <p className="text-sm text-slate-300">
          서버 이미지는 <span className="font-semibold text-rose-300">Cache-Control: no-store</span>로 내려오지만,
          Service Worker의 fetch 이벤트에서 직접 Cache API에 저장해 재사용합니다.
        </p>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={increaseVersion}
              className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              쿼리 버전 증가 (v={version})
            </button>
            <button
              onClick={loadStats}
              className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              서버 네트워크 히트 확인
            </button>
          </div>

          <img
            src={imageUrl}
            alt="no-store sample"
            className="w-full rounded-lg border border-slate-700 bg-slate-800"
          />

          <p className="mt-3 text-xs text-slate-400">
            이미지 URL: <span className="text-slate-200">{imageUrl}</span>
          </p>

          <div className="mt-3 rounded-md bg-slate-800 p-3 text-sm">
            {loading && <p>불러오는 중...</p>}
            {!loading && stats && (
              <>
                <p>서버 이미지 생성 횟수(networkHits): {stats.networkHits}</p>
                <p className="text-slate-400">stats 생성 시각: {stats.generatedAt}</p>
              </>
            )}
            {!loading && !stats && <p>버튼을 눌러 서버 히트를 확인해보세요.</p>}
          </div>
        </div>

        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>처음 이미지를 로드하면 Service Worker가 네트워크에서 받아 Cache API에 저장합니다.</li>
          <li>이후 쿼리 버전(v)을 바꿔도 SW가 동일 경로 키로 캐시를 먼저 반환합니다.</li>
          <li>
            따라서 서버의 <span className="font-semibold text-sky-300">networkHits</span>가 증가하지 않아 no-store 정책을
            SW 레벨에서 우회 캐싱하는 시나리오를 재현합니다.
          </li>
        </ol>
      </section>
    </main>
  )
}

export default App
