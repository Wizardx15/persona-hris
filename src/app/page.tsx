'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Users, Clock, Calendar, DollarSign, LogIn, AlertCircle } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'success' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    checkUserAndRedirect()
    checkConnection()
  }, [])

  async function checkUserAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      router.push('/dashboard')
    } else {
      setChecking(false)
    }
  }

  async function checkConnection() {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .limit(5)
      
      if (error) throw error
      
      setEmployees(data || [])
      setConnectionStatus('success')
    } catch (error: any) {
      console.error('Connection error:', error)
      setConnectionStatus('error')
      setErrorMessage(error.message || 'Gagal koneksi ke database')
    } finally {
      setLoading(false)
    }
  }

  if (checking || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-900 font-medium">Memuat Persona HRIS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Persona</h1>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">HRIS</span>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/login" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Kelola SDM dengan Mudah
          </h2>
          <p className="mt-4 text-xl text-gray-700 max-w-3xl mx-auto">
            Persona HRIS membantu Anda mengelola karyawan, absensi, cuti, dan penggajian dalam satu platform terintegrasi.
          </p>
        </div>

        {/* Status Koneksi */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Sistem</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'success' ? 'bg-green-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="font-medium text-gray-900">
              {connectionStatus === 'success' ? 'Terhubung ke database' : 
               connectionStatus === 'error' ? 'Gagal terhubung' : 'Memeriksa koneksi...'}
            </span>
          </div>
          {errorMessage && (
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>

        {/* Stats Cards */}
        {connectionStatus === 'success' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Karyawan</p>
                  <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Absensi Hari Ini</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pengajuan Cuti</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Penggajian</p>
                  <p className="text-2xl font-bold text-gray-900">Rp 0</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Karyawan */}
        {connectionStatus === 'success' && employees.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Karyawan Terdaftar</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Posisi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Departemen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.position}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {emp.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <a 
            href="/login" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Mulai Sekarang
          </a>
          <p className="mt-4 text-sm text-gray-700">
            Demo: admin@persona.com / password123
          </p>
        </div>
      </main>
    </div>
  )
}