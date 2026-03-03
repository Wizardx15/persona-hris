'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  LogOut, Users, Clock, Calendar, DollarSign, User, 
  Briefcase, PlusCircle, CheckCircle, XCircle, Edit, Trash2,
  Download, FileText, Camera
} from 'lucide-react'
import PayrollManagement from '@/components/PayrollManagement'
import ProfilePage from '@/components/ProfilePage'
import QRScanner from '@/components/QRScanner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [employeeData, setEmployeeData] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [employees, setEmployees] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [newEmployee, setNewEmployee] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    position: '',
    department: '',
    join_date: '',
    phone: ''
  })
  const [editForm, setEditForm] = useState({
    id: '',
    employee_id: '',
    full_name: '',
    email: '',
    position: '',
    department: '',
    join_date: '',
    phone: '',
    status: 'active'
  })

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, activeTab])

  async function checkUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching employee data:', error)
      } else {
        setEmployeeData(data)
        setIsAdmin(user.email === 'admin@persona.com' || data?.position === 'HR Manager')
      }

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchData() {
    try {
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })
      
      setEmployees(employeesData || [])

      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees:employee_id (
            full_name,
            employee_id
          )
        `)
        .order('created_at', { ascending: false })
      
      setLeaveRequests(leaveData || [])

      const today = new Date().toISOString().split('T')[0]
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          *,
          employees:employee_id (
            full_name,
            employee_id
          )
        `)
        .eq('date', today)
      
      setAttendance(attendanceData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('employees')
        .insert([{
          ...newEmployee,
          status: 'active',
          join_date: newEmployee.join_date || new Date().toISOString().split('T')[0]
        }])

      if (error) throw error

      setShowAddEmployee(false)
      setNewEmployee({
        employee_id: '',
        full_name: '',
        email: '',
        position: '',
        department: '',
        join_date: '',
        phone: ''
      })
      fetchData()
      alert('Karyawan berhasil ditambahkan!')
    } catch (error: any) {
      alert('Error adding employee: ' + error.message)
    }
  }

  async function handleEditEmployee(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          employee_id: editForm.employee_id,
          full_name: editForm.full_name,
          email: editForm.email,
          position: editForm.position,
          department: editForm.department,
          join_date: editForm.join_date,
          phone: editForm.phone,
          status: editForm.status
        })
        .eq('id', editForm.id)

      if (error) throw error

      setEditingEmployee(null)
      fetchData()
      alert('Data karyawan berhasil diupdate!')
    } catch (error: any) {
      alert('Error updating employee: ' + error.message)
    }
  }

  async function handleDeleteEmployee(id: string) {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

      if (error) throw error

      setShowDeleteConfirm(null)
      fetchData()
      alert('Karyawan berhasil dihapus!')
    } catch (error: any) {
      alert('Error deleting employee: ' + error.message)
    }
  }

  function startEdit(emp: any) {
    setEditForm({
      id: emp.id,
      employee_id: emp.employee_id,
      full_name: emp.full_name,
      email: emp.email,
      position: emp.position,
      department: emp.department,
      join_date: emp.join_date,
      phone: emp.phone || '',
      status: emp.status
    })
    setEditingEmployee(emp)
  }

  function exportToExcel() {
    const wsData = [
      ['NIK', 'Nama', 'Email', 'Posisi', 'Departemen', 'Tanggal Masuk', 'No. Telepon', 'Status'],
      ...employees.map(emp => [
        emp.employee_id,
        emp.full_name,
        emp.email,
        emp.position,
        emp.department,
        new Date(emp.join_date).toLocaleDateString('id-ID'),
        emp.phone || '-',
        emp.status === 'active' ? 'Aktif' : 'Tidak Aktif'
      ])
    ]
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, 'Karyawan')
    XLSX.writeFile(wb, `karyawan_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function exportToPDF() {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Data Karyawan', 14, 22)
    doc.setFontSize(11)
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 32)
    
    const tableColumn = ['NIK', 'Nama', 'Posisi', 'Departemen', 'Status']
    const tableRows = employees.map(emp => [
      emp.employee_id,
      emp.full_name,
      emp.position,
      emp.department,
      emp.status === 'active' ? 'Aktif' : 'Tidak Aktif'
    ])
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    })
    
    doc.save(`karyawan_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  async function generateQRCode() {
    try {
      const response = await fetch('/api/generate-qr')
      const data = await response.json()
      
      if (data.success) {
        setQrCodeUrl(data.qrCode)
        setShowQRGenerator(true)
      } else {
        alert('Gagal generate QR Code')
      }
    } catch (error) {
      alert('Error generating QR Code')
    }
  }

  async function handleCheckIn() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeData?.id)
        .eq('date', today)
        .single()

      if (existing) {
        alert('Anda sudah check-in hari ini')
        return
      }

      const { error } = await supabase
        .from('attendance')
        .insert([{
          employee_id: employeeData?.id,
          date: today,
          check_in: now,
          status: new Date().getHours() >= 9 ? 'late' : 'present'
        }])

      if (error) throw error
      alert('Check-in berhasil!')
      fetchData()
    } catch (error: any) {
      alert('Error check-in: ' + error.message)
    }
  }

  async function handleCheckOut() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeData?.id)
        .eq('date', today)
        .single()

      if (!attendance) {
        alert('Anda belum check-in hari ini')
        return
      }

      if (attendance.check_out) {
        alert('Anda sudah check-out hari ini')
        return
      }

      const { error } = await supabase
        .from('attendance')
        .update({ check_out: now })
        .eq('id', attendance.id)

      if (error) throw error
      alert('Check-out berhasil!')
      fetchData()
    } catch (error: any) {
      alert('Error check-out: ' + error.message)
    }
  }

  async function handleLeaveAction(id: string, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status, 
          approved_by: employeeData?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      fetchData()
      alert(`Cuti berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}!`)
    } catch (error: any) {
      alert('Error updating leave request: ' + error.message)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b fixed top-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Persona</h1>
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">HRIS</span>
              {isAdmin && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-900 font-medium">{employeeData?.full_name || user?.email}</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar & Main Content */}
      <div className="pt-16 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white h-[calc(100vh-4rem)] shadow-sm fixed overflow-y-auto">
          <div className="p-4">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              
              <button
                onClick={() => setActiveTab('attendance')}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'attendance' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>Absensi</span>
              </button>
              
              <button
                onClick={() => setActiveTab('leave')}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'leave' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Cuti</span>
              </button>
              
              {isAdmin && (
                <>
                  <button
                    onClick={() => setActiveTab('employees')}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                      activeTab === 'employees' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Briefcase className="w-5 h-5" />
                    <span>Kelola Karyawan</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('payroll')}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                      activeTab === 'payroll' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span>Penggajian</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="ml-64 flex-1 p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Selamat Datang, {employeeData?.full_name || user?.email?.split('@')[0]}!
              </h2>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleCheckIn}
                      className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 text-green-800 rounded-lg transition-colors flex items-center"
                    >
                      <Clock className="w-5 h-5 mr-2" />
                      Check In
                    </button>
                    <button
                      onClick={handleCheckOut}
                      className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-lg transition-colors flex items-center"
                    >
                      <Clock className="w-5 h-5 mr-2" />
                      Check Out
                    </button>
                    <button
                      onClick={() => setShowQRScanner(true)}
                      className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg transition-colors flex items-center"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Scan QR Absensi
                    </button>
                    <button 
                      onClick={() => setActiveTab('leave')}
                      className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition-colors flex items-center"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Ajukan Cuti
                    </button>
                    {isAdmin && (
                      <button
                        onClick={generateQRCode}
                        className="w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg transition-colors flex items-center"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Generate QR Code Kantor
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Karyawan</h3>
                  {employeeData ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-sm text-gray-600">NIK</p>
                        <p className="text-sm font-medium text-gray-900">{employeeData.employee_id}</p>
                        
                        <p className="text-sm text-gray-600">Departemen</p>
                        <p className="text-sm font-medium text-gray-900">{employeeData.department}</p>
                        
                        <p className="text-sm text-gray-600">Posisi</p>
                        <p className="text-sm font-medium text-gray-900">{employeeData.position}</p>
                        
                        <p className="text-sm text-gray-600">Tanggal Masuk</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(employeeData.join_date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">Data karyawan tidak ditemukan</p>
                  )}
                </div>
              </div>

              {/* Today's Attendance */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Absensi Hari Ini</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nama</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Check In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Check Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendance.length > 0 ? (
                        attendance.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.employees?.full_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.check_in ? new Date(item.check_in).toLocaleTimeString('id-ID') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.check_out ? new Date(item.check_out).toLocaleTimeString('id-ID') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                item.status === 'present' ? 'bg-green-100 text-green-800' :
                                item.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.status === 'present' ? 'Hadir' : 
                                 item.status === 'late' ? 'Terlambat' : 'Absen'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                            Belum ada data absensi hari ini
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Riwayat Absensi</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendance.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.check_in ? new Date(item.check_in).toLocaleTimeString('id-ID') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.check_out ? new Date(item.check_out).toLocaleTimeString('id-ID') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.status === 'present' ? 'bg-green-100 text-green-800' :
                            item.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status === 'present' ? 'Hadir' : 
                             item.status === 'late' ? 'Terlambat' : 'Absen'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Employees Tab (Admin only) */}
          {activeTab === 'employees' && isAdmin && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Kelola Karyawan</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={exportToExcel}
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                    title="Export ke Excel"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                    title="Export ke PDF"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </button>
                  <button
                    onClick={() => setShowAddEmployee(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Tambah Karyawan
                  </button>
                </div>
              </div>

              {/* Add Employee Modal */}
              {showAddEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tambah Karyawan Baru</h3>
                    <form onSubmit={handleAddEmployee} className="space-y-4">
                      <input
                        type="text"
                        placeholder="NIK"
                        value={newEmployee.employee_id}
                        onChange={(e) => setNewEmployee({...newEmployee, employee_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Nama Lengkap"
                        value={newEmployee.full_name}
                        onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newEmployee.email}
                        onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Posisi"
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Departemen"
                        value={newEmployee.department}
                        onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                        required
                      />
                      <input
                        type="date"
                        placeholder="Tanggal Masuk"
                        value={newEmployee.join_date}
                        onChange={(e) => setNewEmployee({...newEmployee, join_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                      <input
                        type="text"
                        placeholder="No. Telepon"
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500"
                      />
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddEmployee(false)}
                          className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Edit Employee Modal */}
              {editingEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Karyawan</h3>
                    <form onSubmit={handleEditEmployee} className="space-y-4">
                      <input
                        type="text"
                        placeholder="NIK"
                        value={editForm.employee_id}
                        onChange={(e) => setEditForm({...editForm, employee_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Nama Lengkap"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Posisi"
                        value={editForm.position}
                        onChange={(e) => setEditForm({...editForm, position: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Departemen"
                        value={editForm.department}
                        onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        required
                      />
                      <input
                        type="date"
                        placeholder="Tanggal Masuk"
                        value={editForm.join_date}
                        onChange={(e) => setEditForm({...editForm, join_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                      <input
                        type="text"
                        placeholder="No. Telepon"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Tidak Aktif</option>
                      </select>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingEmployee(null)}
                          className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Konfirmasi Hapus</h3>
                    <p className="text-gray-700 mb-6">
                      Apakah Anda yakin ingin menghapus karyawan ini? Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteEmployee(showDeleteConfirm)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Employees List with Actions */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">NIK</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Posisi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Departemen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employee_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.position}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {emp.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEdit(emp)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(emp.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Leave Requests Tab */}
          {activeTab === 'leave' && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Pengajuan Cuti</h2>
              
              {/* Form Ajukan Cuti */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajukan Cuti Baru</h3>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900">
                    <option value="" className="text-gray-900">Pilih Jenis Cuti</option>
                    <option value="annual" className="text-gray-900">Cuti Tahunan</option>
                    <option value="sick" className="text-gray-900">Cuti Sakit</option>
                    <option value="unpaid" className="text-gray-900">Cuti Tidak Dibayar</option>
                  </select>
                  <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                  <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
                  <textarea 
                    placeholder="Alasan" 
                    className="px-3 py-2 border border-gray-300 rounded-lg md:col-span-2 text-gray-900 placeholder-gray-500"
                    rows={3}
                  ></textarea>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:col-span-2">
                    Ajukan Cuti
                  </button>
                </form>
              </div>

              {/* Daftar Pengajuan Cuti */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 p-6 pb-0">Riwayat Pengajuan Cuti</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Jenis</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Alasan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveRequests.map((leave: any) => (
                      <tr key={leave.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {leave.employees?.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {leave.leave_type === 'annual' ? 'Cuti Tahunan' :
                           leave.leave_type === 'sick' ? 'Cuti Sakit' : 'Cuti Tidak Dibayar'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(leave.start_date).toLocaleDateString('id-ID')} - {new Date(leave.end_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{leave.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                            leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {leave.status === 'approved' ? 'Disetujui' :
                             leave.status === 'pending' ? 'Menunggu' : 'Ditolak'}
                          </span>
                        </td>
                        {isAdmin && leave.status === 'pending' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleLeaveAction(leave.id, 'approved')}
                                className="p-1 text-green-600 hover:text-green-800"
                                title="Setujui"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleLeaveAction(leave.id, 'rejected')}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Tolak"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payroll Tab (Admin only) */}
          {activeTab === 'payroll' && isAdmin && (
            <PayrollManagement />
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && employeeData && (
        <ProfilePage
          employeeData={employeeData}
          onClose={() => setShowProfile(false)}
          onUpdate={fetchData}
        />
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && employeeData && (
        <QRScanner
          employeeId={employeeData.id}
          onClose={() => setShowQRScanner(false)}
          onSuccess={fetchData}
        />
      )}

      {/* QR Generator Modal */}
      {showQRGenerator && qrCodeUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code Absensi</h3>
              <button
                onClick={() => setShowQRGenerator(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border mb-4">
              <img src={qrCodeUrl} alt="QR Code" className="w-full" />
            </div>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              Scan QR Code ini untuk absensi. Berlaku 24 jam.
            </p>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = qrCodeUrl
                  link.download = `qrcode_${new Date().toISOString().split('T')[0]}.png`
                  link.click()
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Download
              </button>
              <button
                onClick={() => setShowQRGenerator(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}