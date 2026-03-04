'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  LogOut, Users, Clock, Calendar, DollarSign, User, 
  Briefcase, PlusCircle, CheckCircle, XCircle, Edit, Trash2,
  Download, FileText, Camera, Menu, X
} from 'lucide-react'
import PayrollManagement from '@/components/PayrollManagement'
import ProfilePage from '@/components/ProfilePage'
import QRScanner from '@/components/QRScanner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useMediaQuery } from 'react-responsive'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveFormData, setLeaveFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  })
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

  const isMobile = useMediaQuery({ maxWidth: 768 })

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
      // Fetch employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })
      
      setEmployees(employeesData || [])

      // Fetch leave requests with employee details
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees:employee_id (
            full_name,
            employee_id,
            position,
            department
          )
        `)
        .order('created_at', { ascending: false })
      
      setLeaveRequests(leaveData || [])

      // Fetch today's attendance
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
      
      // Refresh data
      await fetchData()
      
      // Kirim notifikasi (opsional)
      const leave = leaveRequests.find(l => l.id === id)
      alert(`Cuti ${leave?.employees?.full_name} berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}!`)
      
    } catch (error: any) {
      alert('Error updating leave request: ' + error.message)
    }
  }

  async function handleSubmitLeave(e: React.FormEvent) {
    e.preventDefault()
    
    if (!employeeData) {
      alert('Data karyawan tidak ditemukan')
      return
    }

    try {
      // Hitung jumlah hari cuti
      const start = new Date(leaveFormData.start_date)
      const end = new Date(leaveFormData.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

      const { error } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: employeeData.id,
          leave_type: leaveFormData.leave_type,
          start_date: leaveFormData.start_date,
          end_date: leaveFormData.end_date,
          reason: leaveFormData.reason,
          status: 'pending'
        }])

      if (error) throw error

      setShowLeaveForm(false)
      setLeaveFormData({
        leave_type: '',
        start_date: '',
        end_date: '',
        reason: ''
      })
      fetchData()
      alert('Pengajuan cuti berhasil dikirim!')
    } catch (error: any) {
      alert('Error submitting leave: ' + error.message)
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
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 mr-2 hover:bg-gray-100 rounded-lg"
                >
                  {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              )}
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
                {!isMobile && <span className="text-sm text-gray-900 font-medium">{employeeData?.full_name || user?.email}</span>}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {!isMobile && 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay (mobile) */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`pt-16 flex`}>
        <div className={`
          ${isMobile ? 'fixed z-30 transition-transform duration-300 ease-in-out' : ''}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          w-64 bg-white h-[calc(100vh-4rem)] shadow-sm overflow-y-auto
        `}>
          <div className="p-4">
            <div className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('dashboard')
                  if (isMobile) setSidebarOpen(false)
                }}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="sidebar-text">Dashboard</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('attendance')
                  if (isMobile) setSidebarOpen(false)
                }}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'attendance' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="sidebar-text">Absensi</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('leave')
                  if (isMobile) setSidebarOpen(false)
                }}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  activeTab === 'leave' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="sidebar-text">Cuti</span>
              </button>
              
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setActiveTab('employees')
                      if (isMobile) setSidebarOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                      activeTab === 'employees' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Briefcase className="w-5 h-5" />
                    <span className="sidebar-text">Kelola Karyawan</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setActiveTab('payroll')
                      if (isMobile) setSidebarOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 rounded-lg flex items-center space-x-2 ${
                      activeTab === 'payroll' ? 'bg-blue-50 text-blue-700' : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    <span className="sidebar-text">Penggajian</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 p-4 md:p-8 ${isMobile ? 'ml-0' : 'ml-64'}`}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="fade-in">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Selamat Datang, {employeeData?.full_name || user?.email?.split('@')[0]}!
              </h2>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mobile-grid">
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
                      onClick={() => {
                        setActiveTab('leave')
                        setShowLeaveForm(true)
                      }}
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
            <div className="fade-in">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Riwayat Absensi</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
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
            </div>
          )}

          {/* Leave Tab */}
          {activeTab === 'leave' && (
            <div className="fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Pengajuan Cuti</h2>
                <button
                  onClick={() => setShowLeaveForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Ajukan Cuti
                </button>
              </div>
              
              {/* Leave Form Modal */}
              {showLeaveForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ajukan Cuti Baru</h3>
                    <form onSubmit={handleSubmitLeave} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Cuti</label>
                        <select
                          value={leaveFormData.leave_type}
                          onChange={(e) => setLeaveFormData({...leaveFormData, leave_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          required
                        >
                          <option value="">Pilih Jenis Cuti</option>
                          <option value="annual">Cuti Tahunan</option>
                          <option value="sick">Cuti Sakit</option>
                          <option value="unpaid">Cuti Tidak Dibayar</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                        <input
                          type="date"
                          value={leaveFormData.start_date}
                          onChange={(e) => setLeaveFormData({...leaveFormData, start_date: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                        <input
                          type="date"
                          value={leaveFormData.end_date}
                          onChange={(e) => setLeaveFormData({...leaveFormData, end_date: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                        <textarea
                          value={leaveFormData.reason}
                          onChange={(e) => setLeaveFormData({...leaveFormData, reason: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                          rows={3}
                          required
                        />
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-2 pt-4">
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Kirim Pengajuan
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLeaveForm(false)}
                          className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Leave Requests List */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
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
                      {leaveRequests.length > 0 ? (
                        leaveRequests.map((leave: any) => (
                          <tr key={leave.id} className="hover:bg-gray-50">
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
                            {/* TOMBOL APPROVE/REJECT UNTUK ADMIN */}
                            {isAdmin && leave.status === 'pending' && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleLeaveAction(leave.id, 'approved')}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Setujui"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleLeaveAction(leave.id, 'rejected')}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Tolak"
                                  >
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            )}
                            {/* Tampilkan info approve untuk status yang sudah diproses */}
                            {isAdmin && leave.status !== 'pending' && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {leave.status === 'approved' ? '✓ Disetujui' : '✗ Ditolak'}
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="px-6 py-4 text-center text-gray-500">
                            Belum ada pengajuan cuti
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Employees Tab (Admin only) */}
          {activeTab === 'employees' && isAdmin && (
            <div className="fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Kelola Karyawan</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportToExcel}
                    className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </button>
                  <button
                    onClick={() => setShowAddEmployee(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Tambah
                  </button>
                </div>
              </div>

              {/* Mobile Card View */}
              {isMobile ? (
                <div className="space-y-3">
                  {employees.map((emp) => (
                    <div key={emp.id} className="mobile-card">
                      <div className="mobile-card-header">
                        <span>{emp.full_name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {emp.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </div>
                      <div className="mobile-card-body">
                        <span className="mobile-card-label">NIK:</span>
                        <span className="mobile-card-value">{emp.employee_id}</span>
                        <span className="mobile-card-label">Email:</span>
                        <span className="mobile-card-value">{emp.email}</span>
                        <span className="mobile-card-label">Posisi:</span>
                        <span className="mobile-card-value">{emp.position}</span>
                        <span className="mobile-card-label">Departemen:</span>
                        <span className="mobile-card-value">{emp.department}</span>
                      </div>
                      <div className="mobile-card-footer">
                        <button
                          onClick={() => startEdit(emp)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(emp.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
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
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(emp.id)}
                                  className="p-1 text-red-600 hover:text-red-800"
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
            </div>
          )}

          {/* Payroll Tab (Admin only) */}
          {activeTab === 'payroll' && isAdmin && (
            <div className="fade-in">
              <PayrollManagement />
            </div>
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code Absensi</h3>
              <button
                onClick={() => setShowQRGenerator(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-lg border mb-4">
              <img src={qrCodeUrl} alt="QR Code" className="w-full" />
            </div>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              Scan QR Code ini untuk absensi. Berlaku 24 jam.
            </p>
            
            <div className="flex flex-col md:flex-row gap-2">
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

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tambah Karyawan Baru</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <input
                type="text"
                placeholder="NIK"
                value={newEmployee.employee_id}
                onChange={(e) => setNewEmployee({...newEmployee, employee_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Nama Lengkap"
                value={newEmployee.full_name}
                onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Posisi"
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
              />
              <input
                type="text"
                placeholder="Departemen"
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <div className="flex flex-col md:flex-row gap-2">
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
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
              <div className="flex flex-col md:flex-row gap-2">
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
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Konfirmasi Hapus</h3>
            <p className="text-gray-700 mb-6">
              Apakah Anda yakin ingin menghapus karyawan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex flex-col md:flex-row gap-2">
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
    </div>
  )
}