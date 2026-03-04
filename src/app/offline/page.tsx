'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-12 h-12 text-yellow-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Koneksi Terputus</h1>
        <p className="text-gray-600 mb-6">
          Sepertinya Anda sedang offline. Beberapa fitur mungkin tidak tersedia.
        </p>
        
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Coba Lagi
        </button>
        
        <p className="mt-4 text-sm text-gray-500">
          Data yang sudah tersimpan akan tetap bisa diakses.
        </p>
      </div>
    </div>
  )
}