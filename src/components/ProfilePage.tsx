'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  User, Mail, Phone, MapPin, Calendar, Briefcase, 
  Heart, Save, Camera, Upload, X 
} from 'lucide-react'

interface ProfilePageProps {
  employeeData: any
  onClose: () => void
  onUpdate: () => void
}

export default function ProfilePage({ employeeData, onClose, onUpdate }: ProfilePageProps) {
  const [profile, setProfile] = useState<any>(null)
  const [leaveBalance, setLeaveBalance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    birth_place: '',
    birth_date: '',
    gender: '',
    religion: '',
    marital_status: '',
    blood_type: '',
    emergency_name: '',
    emergency_phone: '',
    emergency_relation: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    photo_url: ''
  })

  useEffect(() => {
    fetchProfileData()
  }, [employeeData])

  async function fetchProfileData() {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('employee_id', employeeData?.id)
        .single()

      setProfile(profileData)
      
      if (profileData) {
        setFormData({
          birth_place: profileData.birth_place || '',
          birth_date: profileData.birth_date || '',
          gender: profileData.gender || '',
          religion: profileData.religion || '',
          marital_status: profileData.marital_status || '',
          blood_type: profileData.blood_type || '',
          emergency_name: profileData.emergency_name || '',
          emergency_phone: profileData.emergency_phone || '',
          emergency_relation: profileData.emergency_relation || '',
          address: profileData.address || '',
          city: profileData.city || '',
          postal_code: profileData.postal_code || '',
          phone: employeeData?.phone || '',
          photo_url: profileData.photo_url || ''
        })

        // Load photo if exists
        if (profileData.photo_url) {
          const { data } = supabase.storage
            .from('profiles')
            .getPublicUrl(profileData.photo_url)
          setPhotoUrl(data.publicUrl)
        }
      }

      const { data: leaveData } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeData?.id)
        .eq('year', new Date().getFullYear())
        .single()

      setLeaveBalance(leaveData)

    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function uploadPhoto(file: File) {
    try {
      setUploading(true)
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${employeeData.id}/${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName)

      // Update profile with photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          employee_id: employeeData.id,
          photo_url: fileName
        })

      if (updateError) throw updateError

      setPhotoUrl(data.publicUrl)
      setFormData({...formData, photo_url: fileName})
      alert('Foto berhasil diupload!')

    } catch (error: any) {
      alert('Error uploading photo: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    
    // Validasi file
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar!')
      return
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2MB!')
      return
    }

    await uploadPhoto(file)
  }

  async function handleRemovePhoto() {
    if (!profile?.photo_url) return

    try {
      setUploading(true)
      
      // Delete from storage
      await supabase.storage
        .from('profiles')
        .remove([profile.photo_url])

      // Update profile
      await supabase
        .from('profiles')
        .update({ photo_url: null })
        .eq('employee_id', employeeData.id)

      setPhotoUrl(null)
      setFormData({...formData, photo_url: ''})
      alert('Foto berhasil dihapus!')

    } catch (error: any) {
      alert('Error removing photo: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (formData.phone !== employeeData.phone) {
        await supabase
          .from('employees')
          .update({ phone: formData.phone })
          .eq('id', employeeData.id)
      }

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            birth_place: formData.birth_place,
            birth_date: formData.birth_date || null,
            gender: formData.gender,
            religion: formData.religion,
            marital_status: formData.marital_status,
            blood_type: formData.blood_type,
            emergency_name: formData.emergency_name,
            emergency_phone: formData.emergency_phone,
            emergency_relation: formData.emergency_relation,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employeeData.id)
      } else {
        await supabase
          .from('profiles')
          .insert([{
            employee_id: employeeData.id,
            ...formData
          }])
      }

      alert('Profile berhasil diupdate!')
      setEditMode(false)
      fetchProfileData()
      onUpdate()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Profile Karyawan</h2>
          <div className="flex space-x-2">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false)
                    fetchProfileData()
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
                >
                  Batal
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - Photo & Basic Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="relative w-32 h-32 mx-auto mb-4">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt="Profile" 
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-100"
                  />
                ) : (
                  <div className="w-32 h-32 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                    <User className="w-16 h-16 text-blue-600" />
                  </div>
                )}
                
                {editMode && (
                  <div className="absolute -bottom-2 -right-2 flex space-x-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg"
                      title="Upload Foto"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    {photoUrl && (
                      <button
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg"
                        title="Hapus Foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              {uploading && (
                <p className="text-sm text-blue-600">Mengupload...</p>
              )}
              
              <h3 className="text-xl font-bold text-gray-900">{employeeData?.full_name}</h3>
              <p className="text-gray-600">{employeeData?.position}</p>
              <p className="text-sm text-gray-500">{employeeData?.employee_id}</p>
            </div>

            {leaveBalance && (
              <div className="bg-white rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                  Sisa Cuti {currentYear}
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Kuota:</span>
                    <span className="font-medium text-gray-900">{leaveBalance.total_quota} hari</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Terpakai:</span>
                    <span className="font-medium text-orange-600">{leaveBalance.used} hari</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-medium text-yellow-600">{leaveBalance.pending} hari</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-900">Sisa:</span>
                      <span className="text-green-600 text-lg">{leaveBalance.remaining} hari</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Details (sama seperti sebelumnya) */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg border p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-4 h-4 mr-2 text-blue-600" />
                Data Pribadi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">Tempat Lahir</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.birth_place}
                      onChange={(e) => setFormData({...formData, birth_place: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      placeholder="Jakarta"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.birth_place || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Tanggal Lahir</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">
                      {profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString('id-ID') : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Jenis Kelamin</label>
                  {editMode ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    >
                      <option value="">Pilih</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.gender || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Agama</label>
                  {editMode ? (
                    <select
                      value={formData.religion}
                      onChange={(e) => setFormData({...formData, religion: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    >
                      <option value="">Pilih</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.religion || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Status Pernikahan</label>
                  {editMode ? (
                    <select
                      value={formData.marital_status}
                      onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    >
                      <option value="">Pilih</option>
                      <option value="Menikah">Menikah</option>
                      <option value="Belum Menikah">Belum Menikah</option>
                      <option value="Cerai">Cerai</option>
                    </select>
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.marital_status || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Golongan Darah</label>
                  {editMode ? (
                    <select
                      value={formData.blood_type}
                      onChange={(e) => setFormData({...formData, blood_type: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    >
                      <option value="">Pilih</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.blood_type || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg border p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-blue-600" />
                Kontak & Alamat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">Email</label>
                  <p className="font-medium text-gray-900">{employeeData?.email}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">No. Telepon</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      placeholder="08123456789"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{employeeData?.phone || '-'}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600">Alamat</label>
                  {editMode ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      rows={2}
                      placeholder="Jl. Contoh No. 123"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.address || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Kota</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      placeholder="Jakarta"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.city || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Kode Pos</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      placeholder="12345"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.postal_code || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-lg border p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Heart className="w-4 h-4 mr-2 text-red-600" />
                Kontak Darurat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600">Nama</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.emergency_name}
                      onChange={(e) => setFormData({...formData, emergency_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      placeholder="Nama kontak darurat"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.emergency_name || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Hubungan</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.emergency_relation}
                      onChange={(e) => setFormData({...formData, emergency_relation: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      placeholder="Suami/Istri/Orang Tua"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.emergency_relation || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600">No. Telepon</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.emergency_phone}
                      onChange={(e) => setFormData({...formData, emergency_phone: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900"
                      placeholder="08123456789"
                    />
                  ) : (
                    <p className="font-medium text-gray-900">{profile?.emergency_phone || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}