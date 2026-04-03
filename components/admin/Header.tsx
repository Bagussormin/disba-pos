interface Props {
  role: string | null
  onLogout: () => void
}

export default function Header({ role, onLogout }: Props) {
  // 🔥 MENGAMBIL NAMA OUTLET SECARA DINAMIS
  const tenantName = typeof window !== "undefined" ? localStorage.getItem("tenant_name") || "DISBA POS" : "DISBA POS";

  return (
    <header className="h-14 bg-white border-b px-6 flex items-center justify-between">
      <div className="font-black uppercase">{tenantName}</div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500 uppercase">{role}</span>
        <button
          onClick={onLogout}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded font-bold hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  )
}