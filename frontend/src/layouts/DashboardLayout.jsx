import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-100">

      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="p-6 overflow-auto">
          {children}
        </main>
      </div>

    </div>
  )
}