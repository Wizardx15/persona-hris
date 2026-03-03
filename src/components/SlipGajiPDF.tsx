'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface SlipGajiProps {
  payroll: any
  employee: any
  period: any
}

export function generateSlipGajiPDF({ payroll, employee, period }: SlipGajiProps) {
  const doc = new jsPDF()
  
  try {
    // Header
    doc.setFontSize(20)
    doc.text('SLIP GAJI KARYAWAN', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text('Persona HRIS', 105, 28, { align: 'center' })
    doc.text(`Periode: ${period?.period_name || 'Bulanan'}`, 105, 35, { align: 'center' })
    
    // Garis pemisah
    doc.setLineWidth(0.5)
    doc.line(20, 40, 190, 40)
    
    // Informasi Karyawan
    doc.setFontSize(10)
    doc.text('INFORMASI KARYAWAN', 20, 50)
    
    const employeeInfo = [
      ['NIK', ': ' + (employee?.employee_id || '-')],
      ['Nama', ': ' + (employee?.full_name || '-')],
      ['Posisi', ': ' + (employee?.position || '-')],
      ['Departemen', ': ' + (employee?.department || '-')],
    ]
    
    autoTable(doc, {
      body: employeeInfo,
      startY: 55,
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 130 } },
      theme: 'plain',
      margin: { left: 20, right: 20 }
    })
    
    // Detail Gaji
    const lastY = (doc as any).lastAutoTable?.finalY || 85
    doc.setFontSize(10)
    doc.text('DETAIL GAJI', 20, lastY + 10)
    
    const salaryDetails = [
      ['Gaji Pokok', formatRupiah(payroll?.basic_salary || 0)],
      ['Tunjangan', formatRupiah(payroll?.total_allowances || 0)],
      ['Lembur', formatRupiah(payroll?.total_overtime || 0)],
      ['', ''],
      ['Potongan BPJS', formatRupiah(payroll?.bpjs_employee || 0)],
      ['Potongan Pajak', formatRupiah(payroll?.tax_amount || 0)],
      ['', ''],
      ['GAJI BERSIH', formatRupiah(payroll?.net_salary || 0)],
    ]
    
    autoTable(doc, {
      body: salaryDetails,
      startY: lastY + 15,
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 70, halign: 'right' } },
      theme: 'plain',
      margin: { left: 20, right: 20 },
      didDrawCell: (data: { row: { index: number }, column: { index: number } }) => {
        // Tebalkan total (baris terakhir)
        if (data.row.index === 7 && data.column.index === 0) {
          doc.setFont('helvetica', 'bold')
        }
      }
    })
    
    // Informasi Bank
    const bankY = (doc as any).lastAutoTable?.finalY || lastY + 100
    
    doc.setFontSize(10)
    doc.text('INFORMASI TRANSFER', 20, bankY + 10)
    
    const bankInfo = [
      ['Bank', ': BCA'],
      ['No. Rekening', ': 1234567890'],
      ['Atas Nama', ': ' + (employee?.full_name || '-')],
    ]
    
    autoTable(doc, {
      body: bankInfo,
      startY: bankY + 15,
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 130 } },
      theme: 'plain',
      margin: { left: 20, right: 20 }
    })
    
    // Footer
    const footerY = (doc as any).lastAutoTable?.finalY || bankY + 60
    
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Dokumen ini digenerate secara otomatis oleh Persona HRIS', 105, footerY + 20, { align: 'center' })
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 105, footerY + 25, { align: 'center' })
    
    // Simpan PDF
    doc.save(`slip_gaji_${employee?.employee_id}_${period?.period_name || 'bulanan'}.pdf`)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Gagal generate PDF. Cek console untuk detail.')
  }
}

function formatRupiah(angka: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka).replace('Rp', 'Rp ')
}