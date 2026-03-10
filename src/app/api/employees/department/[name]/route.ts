import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const departmentName = decodeURIComponent(params.name)
    
    // Mapping untuk nama department yang umum
    const departmentMap: Record<string, string> = {
      'hr': 'Human Resources',
      'hcm': 'Human Resources',
      'human resource': 'Human Resources',
      'engineering': 'Engineering',
      'eng': 'Engineering',
      'produksi': 'Produksi',
      'production': 'Produksi'
    }

    // Cari department yang match
    const searchDept = departmentMap[departmentName.toLowerCase()] || departmentName
    
    const { data: employees, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        full_name,
        email,
        phone,
        position,
        status,
        photo_url
      `)
      .eq('department', searchDept)
      .eq('status', 'active')
      .order('full_name')

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      department: searchDept,
      data: employees.map(emp => ({
        id: emp.id,
        nik: emp.employee_id,
        full_name: emp.full_name,
        email: emp.email,
        phone: emp.phone || '-',
        position: emp.position,
        photo_url: emp.photo_url
      })),
      total: employees.length
    })

  } catch (error) {
    console.error('Error fetching employees by department:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal mengambil data karyawan' 
    }, { status: 500 })
  }
}