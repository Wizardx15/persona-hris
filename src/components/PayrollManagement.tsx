'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  DollarSign, Calendar, Users, Download, 
  Eye, CheckCircle, XCircle, Plus, FileText,
  Settings, PieChart, TrendingUp, Clock
} from 'lucide-react'
import { generateSlipGajiPDF } from './SlipGajiPDF'

export default function PayrollManagement() {
  const [periods, setPeriods] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null)
  const [payrollData, setPayrollData] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    totalSalary: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    totalTax: 0,
    netPayroll: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch payroll periods
      const { data: periodsData } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
      
      setPeriods(periodsData || [])
      
      // Fetch employees with their salary and allowances
      const { data: employeesData } = await supabase
        .from('employees')
        .select(`
          *,
          employee_salary(*),
          employee_allowances(
            *,
            salary_components(*)
          )
        `)
        .eq('status', 'active')
      
      setEmployees(employeesData || [])

      // Set default selected period
      if (periodsData && periodsData.length > 0) {
        setSelectedPeriod(periodsData[0])
        await fetchPayrollForPeriod(periodsData[0].id)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPayrollForPeriod(periodId: string) {
    const { data } = await supabase
      .from('payroll')
      .select(`
        *,
        employees (
          employee_id,
          full_name,
          position,
          department
        ),
        payroll_details (
          *,
          salary_components (*)
        )
      `)
      .eq('period_id', periodId)
    
    setPayrollData(data || [])
    calculateSummary(data || [])
  }

  function calculateSummary(data: any[]) {
    const summary = data.reduce((acc, curr) => ({
      totalEmployees: acc.totalEmployees + 1,
      totalSalary: acc.totalSalary + (curr.basic_salary || 0),
      totalAllowances: acc.totalAllowances + (curr.total_allowances || 0),
      totalDeductions: acc.totalDeductions + (curr.total_deductions || 0) + (curr.bpjs_employee || 0) + (curr.tax_amount || 0),
      totalTax: acc.totalTax + (curr.tax_amount || 0),
      netPayroll: acc.netPayroll + (curr.net_salary || 0)
    }), {
      totalEmployees: 0,
      totalSalary: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      totalTax: 0,
      netPayroll: 0
    })

    setSummary(summary)
  }

  async function calculateOvertime(employeeId: string, periodId: string) {
    const period = periods.find(p => p.id === periodId)
    if (!period) return 0

    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', period.start_date)
      .lte('date', period.end_date)

    if (!attendance || attendance.length === 0) return 0

    let totalOvertime = 0

    for (const att of attendance) {
      if (att.check_in && att.check_out) {
        const checkIn = new Date(att.check_in)
        const checkOut = new Date(att.check_out)
        const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
        const overtime = Math.max(0, hoursWorked - 8)
        
        if (overtime > 0) {
          const dayOfWeek = checkIn.getDay()
          let multiplier = 1.5
          
          if (dayOfWeek === 0) multiplier = 3
          else if (dayOfWeek === 6) multiplier = 2

          totalOvertime += overtime * multiplier
        }
      }
    }

    return totalOvertime
  }

  async function generatePayroll() {
    if (!selectedPeriod) return

    setLoading(true)
    try {
      for (const employee of employees) {
        const salary = employee.employee_salary?.[0]
        if (!salary) continue

        const allowances = employee.employee_allowances || []
        const totalAllowances = allowances.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)

        const overtimeHours = await calculateOvertime(employee.id, selectedPeriod.id)
        const hourlyRate = salary.basic_salary / 173
        const overtimePay = overtimeHours * hourlyRate

        const bpjsKesehatan = salary.basic_salary * 0.01
        const bpjsKetenagakerjaan = salary.basic_salary * 0.02
        const totalBpjs = bpjsKesehatan + bpjsKetenagakerjaan

        const taxableIncome = salary.basic_salary + totalAllowances + overtimePay - totalBpjs
        const taxAmount = calculateTax(taxableIncome, salary.tax_status)

        const netSalary = salary.basic_salary + totalAllowances + overtimePay - totalBpjs - taxAmount

        const { data: payroll, error } = await supabase
          .from('payroll')
          .insert([{
            period_id: selectedPeriod.id,
            employee_id: employee.id,
            basic_salary: salary.basic_salary,
            total_allowances: totalAllowances,
            total_overtime: overtimePay,
            total_deductions: 0,
            bpjs_employee: totalBpjs,
            bpjs_company: 0,
            tax_amount: taxAmount,
            net_salary: netSalary,
            status: 'calculated',
            notes: 'Auto-generated'
          }])
          .select()
          .single()

        if (error) throw error

        const { data: components } = await supabase
          .from('salary_components')
          .select('id, component_code')

        const getComponentId = (code: string) => components?.find(c => c.component_code === code)?.id

        const details = [
          {
            payroll_id: payroll.id,
            component_id: getComponentId('BPJS_KESEHATAN'),
            description: 'BPJS Kesehatan (1%)',
            amount: bpjsKesehatan
          },
          {
            payroll_id: payroll.id,
            component_id: getComponentId('BPJS_KETENAGAKERJAAN'),
            description: 'BPJS Ketenagakerjaan (2%)',
            amount: bpjsKetenagakerjaan
          },
          {
            payroll_id: payroll.id,
            component_id: getComponentId('PPH21'),
            description: 'Pajak Penghasilan',
            amount: taxAmount
          }
        ]

        for (const allowance of allowances) {
          details.push({
            payroll_id: payroll.id,
            component_id: allowance.component_id,
            description: `${allowance.salary_components?.component_name || 'Tunjangan'}`,
            amount: allowance.amount
          })
        }

        if (overtimePay > 0) {
          details.push({
            payroll_id: payroll.id,
            component_id: getComponentId('OVERTIME_WEEKDAY'),
            description: `Lembur (${overtimeHours.toFixed(1)} jam)`,
            amount: overtimePay,
          });
        }

        await supabase.from('payroll_details').insert(details)
      }

      await supabase
        .from('payroll_periods')
        .update({ status: 'processed' })
        .eq('id', selectedPeriod.id)

      await fetchPayrollForPeriod(selectedPeriod.id)
      alert('Payroll berhasil digenerate!')

    } catch (error: any) {
      console.error('Error:', error)
      alert('Error generating payroll: ' + error.message)
    } finally {
      setLoading(false)
      setShowGenerateModal(false)
    }
  }

  function calculateTax(taxableIncome: number, taxStatus: string = 'TK0') {
    const annualIncome = taxableIncome * 12
    
    const ptkp: { [key: string]: number } = {
      'TK0': 54000000,
      'TK1': 58500000,
      'TK2': 63000000,
      'TK3': 67500000,
      'K0': 58500000,
      'K1': 63000000,
      'K2': 67500000,
      'K3': 72000000
    }

    const ptkpValue = ptkp[taxStatus] || 54000000
    const taxable = Math.max(0, annualIncome - ptkpValue)
    
    let tax = 0
    if (taxable <= 60000000) {
      tax = taxable * 0.05
    } else if (taxable <= 250000000) {
      tax = 60000000 * 0.05 + (taxable - 60000000) * 0.15
    } else if (taxable <= 500000000) {
      tax = 60000000 * 0.05 + 190000000 * 0.15 + (taxable - 250000000) * 0.25
    } else {
      tax = 60000000 * 0.05 + 190000000 * 0.15 + 250000000 * 0.25 + (taxable - 500000000) * 0.3
    }

    return tax / 12
  }

  async function updatePayrollStatus(id: string, status: string) {
    const { error } = await supabase
      .from('payroll')
      .update({ status })
      .eq('id', id)

    if (!error) {
      await fetchPayrollForPeriod(selectedPeriod.id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Penggajian</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </button>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={selectedPeriod?.status !== 'draft'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Payroll
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Periode Penggajian</label>
        <select
          value={selectedPeriod?.id}
          onChange={(e) => {
            const period = periods.find(p => p.id === e.target.value)
            setSelectedPeriod(period)
            fetchPayrollForPeriod(period.id)
          }}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        >
          {periods.map((period) => (
            <option key={period.id} value={period.id} className="text-gray-900">
              {period.period_name} ({period.status})
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Karyawan</p>
              <p className="text-3xl font-bold text-gray-900">{summary.totalEmployees}</p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Gaji Pokok</p>
              <p className="text-xl font-bold text-gray-900">Rp {summary.totalSalary.toLocaleString('id-ID')}</p>
            </div>
            <DollarSign className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tunjangan</p>
              <p className="text-xl font-bold text-gray-900">Rp {summary.totalAllowances.toLocaleString('id-ID')}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Potongan</p>
              <p className="text-xl font-bold text-red-600">Rp {summary.totalDeductions.toLocaleString('id-ID')}</p>
            </div>
            <PieChart className="w-10 h-10 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pajak</p>
              <p className="text-xl font-bold text-yellow-600">Rp {summary.totalTax.toLocaleString('id-ID')}</p>
            </div>
            <FileText className="w-10 h-10 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Dibayarkan</p>
              <p className="text-xl font-bold text-green-600">Rp {summary.netPayroll.toLocaleString('id-ID')}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Daftar Penggajian - {selectedPeriod?.period_name}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">NIK</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Gaji Pokok</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tunjangan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Lembur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">BPJS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pajak</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bersih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollData.map((payroll) => (
                <tr key={payroll.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payroll.employees?.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payroll.employees?.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {payroll.basic_salary?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {payroll.total_allowances?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {payroll.total_overtime?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {payroll.bpjs_employee?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {payroll.tax_amount?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    Rp {payroll.net_salary?.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      payroll.status === 'paid' ? 'bg-green-100 text-green-800' :
                      payroll.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      payroll.status === 'calculated' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payroll.status === 'paid' ? 'Dibayar' :
                       payroll.status === 'approved' ? 'Disetujui' :
                       payroll.status === 'calculated' ? 'Dihitung' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      {/* Tombol Slip Gaji */}
                      <button
                        onClick={() => generateSlipGajiPDF({
                          payroll: payroll,
                          employee: payroll.employees,
                          period: selectedPeriod
                        })}
                        className="p-1 text-purple-600 hover:text-purple-800"
                        title="Download Slip Gaji"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedEmployee(payroll)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {payroll.status === 'calculated' && (
                        <>
                          <button
                            onClick={() => updatePayrollStatus(payroll.id, 'approved')}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Setujui"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updatePayrollStatus(payroll.id, 'draft')}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Tolak"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {payroll.status === 'approved' && (
                        <button
                          onClick={() => updatePayrollStatus(payroll.id, 'paid')}
                          className="p-1 text-purple-600 hover:text-purple-800"
                          title="Tandai Dibayar"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {payrollData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    Belum ada data payroll untuk periode ini. Klik "Generate Payroll" untuk membuat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Payroll</h3>
            <p className="text-gray-700 mb-4">
              Yakin ingin generate payroll untuk periode <strong className="text-gray-900">{selectedPeriod?.period_name}</strong>?
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Sistem akan menghitung gaji berdasarkan:
              <br />- Gaji pokok & tunjangan tetap
              <br />- Lembur dari data absensi
              <br />- Potongan BPJS (1% kesehatan, 2% ketenagakerjaan)
              <br />- Pajak PPH21 (progresif)
            </p>
            <div className="flex space-x-2">
              <button
                onClick={generatePayroll}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? 'Memproses...' : 'Generate'}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Payroll</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">BPJS</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">BPJS Kesehatan (Karyawan)</label>
                    <input
                      type="number"
                      defaultValue={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500">% dari gaji</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">BPJS Kesehatan (Perusahaan)</label>
                    <input
                      type="number"
                      defaultValue={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500">% dari gaji</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">BPJS Ketenagakerjaan (Karyawan)</label>
                    <input
                      type="number"
                      defaultValue={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500">% dari gaji</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">BPJS Ketenagakerjaan (Perusahaan)</label>
                    <input
                      type="number"
                      defaultValue={3.7}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500">% dari gaji</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Lembur</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">Maksimal Lembur/Minggu</label>
                    <input
                      type="number"
                      defaultValue={14}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      min="0"
                    />
                    <p className="text-xs text-gray-500">Jam</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Potongan Keterlambatan</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700">Toleransi</label>
                    <input
                      type="number"
                      defaultValue={15}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      min="0"
                    />
                    <p className="text-xs text-gray-500">Menit</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Potongan per Jam</label>
                    <input
                      type="number"
                      defaultValue={0.1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      step="0.01"
                      min="0"
                    />
                    <p className="text-xs text-gray-500">% dari gaji</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Simpan Pengaturan
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detail Payroll - {selectedEmployee.employees?.full_name}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Gaji Pokok</p>
                    <p className="font-medium text-gray-900">Rp {selectedEmployee.basic_salary?.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tunjangan</p>
                    <p className="font-medium text-gray-900">Rp {selectedEmployee.total_allowances?.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lembur</p>
                    <p className="font-medium text-gray-900">Rp {selectedEmployee.total_overtime?.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">BPJS</p>
                    <p className="font-medium text-red-600">Rp {selectedEmployee.bpjs_employee?.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pajak</p>
                    <p className="font-medium text-red-600">Rp {selectedEmployee.tax_amount?.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gaji Bersih</p>
                    <p className="font-bold text-green-600">Rp {selectedEmployee.net_salary?.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Detail Komponen</h4>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Komponen</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEmployee.payroll_details?.map((detail: any) => (
                      <tr key={detail.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{detail.description}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900">
                          Rp {detail.amount?.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Informasi Transfer</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-600">Bank</p>
                  <p className="font-medium text-gray-900">BCA</p>
                  <p className="text-gray-600">No. Rekening</p>
                  <p className="font-medium text-gray-900">1234567890</p>
                  <p className="text-gray-600">Atas Nama</p>
                  <p className="font-medium text-gray-900">{selectedEmployee.employees?.full_name}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors"
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