import { useEffect, useMemo, useState } from "react"

type Transaction = {
  date: string
  total: number
}

export default function ManagerHome() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  useEffect(() => {
    const data = localStorage.getItem("transactions")
    if (data) {
      setTransactions(JSON.parse(data))
    }
  }, [])

  const filteredTransactions = useMemo(() => {
    return transactions.filter(trx => {
      const trxDate = new Date(trx.date).toISOString().slice(0, 10)
      return trxDate === selectedDate
    })
  }, [transactions, selectedDate])

  const totalOmzet = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, trx) => sum + trx.total,
      0
    )
  }, [filteredTransactions])

  const transactionCount = filteredTransactions.length

  const average =
    transactionCount === 0
      ? 0
      : Math.round(totalOmzet / transactionCount)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">HALAMAN MANAGER</h1>

      {/* FILTER */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium">
          Pilih Tanggal:
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      {/* REKAP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-700">Total Omzet</div>
          <div className="text-2xl font-bold text-green-900">
            Rp {totalOmzet.toLocaleString()}
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-700">
            Jumlah Transaksi
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {transactionCount}
          </div>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-sm text-purple-700">
            Rata-rata Transaksi
          </div>
          <div className="text-2xl font-bold text-purple-900">
            Rp {average.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}
