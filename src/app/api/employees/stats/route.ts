import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Total karyawan
    const { count: total, error: totalError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Karyawan aktif
    const { count: active, error: activeError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (activeError) throw activeError

    // Group by department
    const { data: deptData, error: deptError } = await supabase
      .from('employees')
      .select('department')
      .eq('status', 'active')

    if (deptError) throw deptError

    const departmentStats: Record<string, number> = {}
    deptData?.forEach(emp => {
      departmentStats[emp.department] = (departmentStats[emp.department] || 0) + 1
    })

    // Group by position
    const { data: positionData, error: posError } = await supabase
      .from('employees')
      .select('position')
      .eq('status', 'active')

    if (posError) throw posError

    const positionCount: Record<string, number> = {}
    positionData?.forEach(emp => {
      positionCount[emp.position] = (positionCount[emp.position] || 0) + 1
    })

    // Top 5 positions
    const topPositions = Object.entries(positionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([position, count]) => ({ position, count }))

    return NextResponse.json({ 
      success: true,
      data: {
        total: total || 0,
        active: active || 0,
        inactive: (total || 0) - (active || 0),
        by_department: departmentStats,
        top_positions: topPositions,
        total_departments: Object.keys(departmentStats).length,
        total_positions: Object.keys(positionCount).length
      }
    })

  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal mengambil statistik' 
    }, { status: 500 })
  }
}