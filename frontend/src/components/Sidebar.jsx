export default function Sidebar() {
  return (
    <div className="w-64 bg-indigo-600 text-white p-6">
      <h1 className="text-2xl font-bold mb-10">🎓 EduSchedule</h1>

      <nav className="space-y-3">
        <div className="p-3 rounded hover:bg-indigo-500 cursor-pointer">📊 Dashboard</div>
        <div className="p-3 rounded hover:bg-indigo-500 cursor-pointer">📅 Emploi du temps</div>
        <div className="p-3 rounded hover:bg-indigo-500 cursor-pointer">📷 QR Pointage</div>
        <div className="p-3 rounded hover:bg-indigo-500 cursor-pointer">📘 Cahier</div>
        <div className="p-3 rounded hover:bg-indigo-500 cursor-pointer">📄 Vacations</div>
      </nav>
    </div>
  )
}