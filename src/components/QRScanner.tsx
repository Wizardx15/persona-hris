'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Camera, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import jsQR from 'jsqr'

interface QRScannerProps {
  employeeId: string
  onClose: () => void
  onSuccess: () => void
}

export default function QRScanner({ employeeId, onClose, onSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    startCamera()
    
    return () => {
      // Cleanup: stop camera and cancel animation frame
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
        })
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  async function startCamera() {
    try {
      setError(null)
      
      // Cek dan minta izin kamera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        // Tunggu video siap
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setCameraReady(true)
              // Mulai scan setelah video playing
              requestAnimationFrame(scanQR)
            })
            .catch((err) => {
              console.error('Error playing video:', err)
              setError('Gagal memulai kamera. Silakan coba lagi.')
            })
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true)
        setError('Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan di perangkat ini.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Kamera sedang digunakan oleh aplikasi lain.')
      } else {
        setError('Gagal mengakses kamera: ' + (err.message || 'Unknown error'))
      }
    }
  }

  function scanQR() {
    if (!scanning || !cameraReady || !videoRef.current || !canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanQR)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      try {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: 'dontInvert',
        })
        
        if (code) {
          handleQRCode(code.data)
          return // Stop scanning once QR is found
        }
      } catch (err) {
        console.error('Scan error:', err)
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(scanQR)
  }

  async function handleQRCode(data: string) {
    try {
      setScanning(false) // Stop scanning
      
      // Parse QR data
      let qrData
      try {
        qrData = JSON.parse(data)
      } catch {
        throw new Error('QR Code tidak valid')
      }
      
      if (qrData.type !== 'attendance') {
        throw new Error('QR Code bukan untuk absensi')
      }

      // Cek validitas waktu (24 jam)
      const now = Date.now()
      if (qrData.validUntil && now > qrData.validUntil) {
        throw new Error('QR Code sudah kadaluarsa')
      }

      const today = new Date().toISOString().split('T')[0]
      const nowISO = new Date().toISOString()

      // Cek apakah sudah check-in hari ini
      const { data: existing, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        if (existing.check_out) {
          throw new Error('Anda sudah check-out hari ini')
        } else {
          // Check-out
          const { error: updateError } = await supabase
            .from('attendance')
            .update({ 
              check_out: nowISO,
              updated_at: nowISO 
            })
            .eq('id', existing.id)

          if (updateError) throw updateError
          
          setSuccess(true)
          setTimeout(() => {
            onSuccess()
            onClose()
          }, 1500)
        }
      } else {
        // Check-in
        const status = new Date().getHours() >= 9 ? 'late' : 'present'
        
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            employee_id: employeeId,
            date: today,
            check_in: nowISO,
            status: status,
            location: qrData.location || 'Kantor'
          }])

        if (insertError) throw insertError
        
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      }

    } catch (err: any) {
      console.error('QR processing error:', err)
      setError(err.message || 'Gagal memproses QR Code')
      setScanning(true) // Resume scanning
    }
  }

  function retryCamera() {
    setError(null)
    setPermissionDenied(false)
    setCameraReady(false)
    startCamera()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Scan QR Code Absensi</h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-4">
          {!cameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Loader className="w-8 h-8 text-white animate-spin" />
              <p className="text-white ml-2">Mengakses kamera...</p>
            </div>
          )}
          
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay scanning */}
          {cameraReady && !error && !success && (
            <>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-lg animate-pulse"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <Camera className="w-8 h-8 text-white opacity-50" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black bg-opacity-50 py-1 px-3 inline-block rounded-full">
                  Arahkan ke QR Code
                </p>
              </div>
            </>
          )}

          {success && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-90">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                {permissionDenied && (
                  <p className="text-sm text-red-600 mt-2">
                    Untuk mengizinkan kamera:
                    <br />1. Klik icon gembok di address bar
                    <br />2. Pilih "Allow" untuk akses kamera
                    <br />3. Refresh halaman
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={retryCamera}
              className="mt-3 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {!error && !success && (
          <p className="text-sm text-gray-600 text-center">
            Pastikan QR Code berada dalam kotak dan cukup terang
          </p>
        )}

        {success && (
          <p className="text-sm text-green-600 text-center font-medium">
            Absensi berhasil! Mengalihkan...
          </p>
        )}
      </div>
    </div>
  )
}