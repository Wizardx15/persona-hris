import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Persona HRIS - Sistem Informasi Sumber Daya Manusia',
  description: 'Aplikasi HRIS lengkap dengan manajemen karyawan, absensi, cuti, dan payroll. Kelola SDM perusahaan Anda dengan mudah dan efisien.',
  keywords: 'HRIS, sistem informasi SDM, manajemen karyawan, absensi online, payroll, cuti online',
  authors: [{ name: 'Persona HRIS' }],
  openGraph: {
    title: 'Persona HRIS',
    description: 'Sistem Informasi Sumber Daya Manusia modern untuk perusahaan Anda',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  )
}