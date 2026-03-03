import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET() {
  try {
    // Data untuk QR Code
    const qrData = {
      type: 'attendance',
      location: 'Kantor Pusat',
      timestamp: Date.now(),
      validUntil: Date.now() + 24 * 60 * 60 * 1000 // 24 jam
    }

    // Generate QR Code sebagai data URL
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData))

    return NextResponse.json({ 
      success: true, 
      qrCode,
      data: qrData
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Gagal generate QR Code' 
    }, { status: 500 })
  }
}