export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-2">
        Bonjour, Admin 👋
      </h1>
      <p className="text-gray-500 mb-8">
        Voici un aperçu de votre activité
      </p>

      {/* CARDS */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
          <p className="text-gray-500">Classes</p>
          <h2 className="text-3xl font-bold mt-2">5</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
          <p className="text-gray-500">Enseignants</p>
          <h2 className="text-3xl font-bold mt-2">8</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
          <p className="text-gray-500">Matières</p>
          <h2 className="text-3xl font-bold mt-2">5</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
          <p className="text-gray-500">Salles</p>
          <h2 className="text-3xl font-bold mt-2">5</h2>
        </div>
      </div>

      {/* ACTIVITES */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">
          Activités récentes
        </h2>
        <p className="text-gray-500">
          Aucune activité pour le moment
        </p>
      </div>

    </div>
  )
}