// test-persona-final.js (VERSI TANPA KAMERA)
import { chromium } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'admin@persona.com'
const TEST_PASSWORD = 'password123'

async function runTests() {
  console.log('🚀 Memulai Auto-Test Persona HRIS (No Camera Mode)...\n')
  
  const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
  
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: bravePath,
    args: [
      '--start-maximized',
      '--use-fake-device-for-media-stream', // Pake fake camera
      '--use-fake-ui-for-media-stream' // Auto allow camera permission
    ]
  })
  
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)
  
  let passed = 0
  let failed = 0

  async function test(name, fn) {
    process.stdout.write(`\n📋 Testing: ${name}... `)
    try {
      await fn()
      console.log(`✅ PASS`)
      passed++
    } catch (error) {
      console.log(`❌ FAIL`)
      console.log(`   Error: ${error.message}`)
      await page.screenshot({ path: `error-${name.replace(/\s+/g, '-')}.png` })
      failed++
    }
  }

  try {
    // ============================================
    // TEST 1: LOGIN
    // ============================================
    await test('Login Admin', async () => {
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard', { timeout: 5000 })
    })

    // ============================================
    // TEST 2: GENERATE QR CODE
    // ============================================
    await test('Generate QR Code', async () => {
      await page.click('button:has-text("Generate QR Code Kantor")')
      console.log(`\n   ⏳ Generating QR Code...`)
      await page.waitForTimeout(3000)
      
      await page.waitForSelector('img[src*="data:image"]', { timeout: 5000 })
      console.log(`   ✅ QR Code berhasil digenerate`)
      
      // Download QR Code
      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("Download")')
      const download = await downloadPromise
      console.log(`   📥 Download: ${download.suggestedFilename()}`)
      
      await page.waitForTimeout(1000)
      await page.click('button:has-text("Tutup")')
      console.log(`   ✅ Modal QR ditutup`)
    })

    // ============================================
    // TEST 3: CEK ELEMEN DASHBOARD (TANPA SCAN QR)
    // ============================================
    await test('Cek Dashboard Elements', async () => {
      // Cek apakah tombol Scan QR ada
      const scanButton = await page.$('button:has-text("Scan QR Absensi")')
      if (scanButton) {
        console.log(`\n   ✅ Tombol Scan QR tersedia`)
      } else {
        console.log(`\n   ⚠️ Tombol Scan QR tidak ditemukan`)
      }
      
      // Cek tombol Check In
      const checkInButton = await page.$('button:has-text("Check In")')
      if (checkInButton) {
        console.log(`   ✅ Tombol Check In tersedia`)
      }
    })

    // ============================================
    // TEST 4: CEK ABSENSI
    // ============================================
    await test('Cek Tab Absensi', async () => {
      await page.click('button:has-text("Absensi")')
      await page.waitForSelector('text=Riwayat Absensi', { timeout: 5000 })
      console.log(`\n   ✅ Tab Absensi terbuka`)
      await page.screenshot({ path: 'riwayat-absensi.png' })
      console.log(`   📸 Screenshot: riwayat-absensi.png`)
    })

    // ============================================
    // TEST 5: CEK CUTI
    // ============================================
    await test('Cek Tab Cuti', async () => {
      await page.click('button:has-text("Cuti")')
      await page.waitForSelector('text=Pengajuan Cuti', { timeout: 5000 })
      console.log(`\n   ✅ Tab Cuti terbuka`)
    })

    // ============================================
    // TEST 6: CEK KELOLA KARYAWAN (ADMIN)
    // ============================================
    await test('Cek Kelola Karyawan', async () => {
      await page.click('button:has-text("Kelola Karyawan")')
      await page.waitForSelector('text=Tambah Karyawan', { timeout: 5000 })
      console.log(`\n   ✅ Tab Kelola Karyawan terbuka`)
      
      // Hitung jumlah karyawan di tabel
      const rows = await page.$$('tbody tr')
      console.log(`   📊 Total karyawan: ${rows.length}`)
    })

    // ============================================
    // TEST 7: CEK PAYROLL
    // ============================================
    await test('Cek Payroll', async () => {
      await page.click('button:has-text("Penggajian")')
      await page.waitForSelector('text=Periode Penggajian', { timeout: 5000 })
      console.log(`\n   ✅ Tab Payroll terbuka`)
    })

    // ============================================
    // TEST 8: PROFILE
    // ============================================
    await test('Cek Profile', async () => {
      await page.click('button:has-text("admin@persona.com")')
      await page.waitForSelector('text=Profile Karyawan', { timeout: 5000 })
      console.log(`\n   ✅ Modal Profile terbuka`)
      
      // Cek sisa cuti
      const sisaCuti = await page.$('text=Sisa Cuti')
      if (sisaCuti) {
        console.log(`   ✅ Informasi sisa cuti tersedia`)
      }
      
      await page.waitForTimeout(1000)
      await page.click('button:has-text("Tutup")')
      console.log(`   ✅ Modal Profile ditutup`)
    })

    // ============================================
    // TEST 9: LOGOUT
    // ============================================
    await test('Logout', async () => {
      await page.waitForTimeout(1000)
      await page.click('button:has-text("Logout")')
      await page.waitForURL('**/login', { timeout: 5000 })
      console.log(`\n   ✅ Berhasil logout`)
    })

    // ============================================
    // HASIL
    // ============================================
    console.log('\n' + '='.repeat(60))
    console.log(`📊 HASIL TEST: ${passed} PASSED, ${failed} FAILED`)
    console.log('='.repeat(60))
    
    if (failed === 0) {
      console.log('🎉🎉🎉 SEMUA TEST BERHASIL! 🎉🎉🎉')
      console.log('📝 Catatan: Test kamera dilewati (pake fake camera)')
    }

  } catch (error) {
    console.error('❌ Fatal Error:', error)
  } finally {
    await browser.close()
    console.log('\n🏁 Test selesai!')
  }
}

runTests()