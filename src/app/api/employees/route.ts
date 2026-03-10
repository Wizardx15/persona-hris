import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'  // Import dari lib, bukan bikin client baru

export async function GET() {
  try {
    const { data: employees, error } = await supabase
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
      .eq('status', 'active')
      .order('full_name', { ascending: true })

    if (error) throw error

    // Format response biar lebih rapi (optional)
    const formatted = employees?.map(emp => ({
      id: emp.id,
      nik: emp.employee_id,
      full_name: emp.full_name,
      email: emp.email,
      phone: emp.phone || '-',
      position: emp.position,
      department: emp.department,
      join_date: emp.join_date,
      status: emp.status,
      photo_url: emp.photo_url,
      birth_date: emp.birth_date,
      address: emp.address,
      emergency_contact: emp.emergency_contact,
      created_at: emp.created_at
    })) || []

    return NextResponse.json({ 
      success: true, 
      data: formatted,
      total: formatted.length
    })

  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal mengambil data karyawan' 
    }, { status: 500 })
  }
}