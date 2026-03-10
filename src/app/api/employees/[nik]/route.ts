import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { nik: string } }
) {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        full_name,
        email,
        phone,
        position,
        department,
        join_date,
        status,
        photo_url,
        birth_date,
        address,
        emergency_contact,
        created_at
      `)
      .eq('employee_id', params.nik)
      .single()

    if (error || !employee) {
      return NextResponse.json({ 
        success: false, 
        error: 'Karyawan tidak ditemukan' 
      }, { status: 404 })
    }

    // Ambil data salary (optional)
    const { data: salary } = await supabase
      .from('employee_salary')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('status', 'active')
      .maybeSingle()

    // Ambil data profile (optional)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('employee_id', employee.id)
      .maybeSingle()

    const formatted = {
      id: employee.id,
      nik: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone || '-',
      position: employee.position,
      department: employee.department,
      join_date: employee.join_date,
      status: employee.status,
      photo_url: employee.photo_url || profile?.photo_url,
      birth_date: employee.birth_date || profile?.birth_date,
      address: employee.address || profile?.address,
      emergency_contact: employee.emergency_contact || profile?.emergency_name,
      created_at: employee.created_at,
      // Data tambahan (optional)
      salary: salary ? {
        basic_salary: salary.basic_salary,
        bank_name: salary.bank_name,
        bank_account: salary.bank_account,
        bank_account_name: salary.bank_account_name,
        npwp: salary.npwp,
        bpjs_ketenagakerjaan: salary.bpjs_ketenagakerjaan,
        bpjs_kesehatan: salary.bpjs_kesehatan,
        tax_status: salary.tax_status
      } : null,
      profile: profile ? {
        birth_place: profile.birth_place,
        gender: profile.gender,
        religion: profile.religion,
        marital_status: profile.marital_status,
        blood_type: profile.blood_type,
        emergency_name: profile.emergency_name,
        emergency_phone: profile.emergency_phone,
        emergency_relation: profile.emergency_relation,
        city: profile.city,
        postal_code: profile.postal_code
      } : null
    }

    return NextResponse.json({ 
      success: true, 
      data: formatted 
    })

  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal mengambil data karyawan' 
    }, { status: 500 })
  }
}