// components/ProfileAvatarUpload.tsx

'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Camera, X, Upload } from 'lucide-react'

type AvatarType = 'image' | 'initial'

type ProfileAvatarUploadProps = {
  userId: string
  currentAvatar?: string
  currentAvatarType?: AvatarType
  userName: string
  onUpdate?: () => void
}

export default function ProfileAvatarUpload({ 
  userId, 
  currentAvatar, 
  currentAvatarType = 'initial',
  userName,
  onUpdate 
}: ProfileAvatarUploadProps) {
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      if (currentAvatarType === 'image' && currentAvatar) {
        try {
          const oldPath = currentAvatar.split('/profile-avatars/')[1]
          if (oldPath) {
            await supabase.storage.from('profile-avatars').remove([oldPath])
          }
        } catch (err) {
          console.warn('Could not delete old avatar:', err)
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, avatar_type: 'image' })
        .eq('id', userId)

      if (updateError) throw updateError

      setShowModal(false)
      setError(null)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error uploading avatar:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to upload image: ${errorMsg}`)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove your profile picture?')) return

    setUploading(true)
    setError(null)
    
    try {
      if (currentAvatarType === 'image' && currentAvatar) {
        try {
          const oldPath = currentAvatar.split('/profile-avatars/')[1]
          if (oldPath) {
            await supabase.storage.from('profile-avatars').remove([oldPath])
          }
        } catch (err) {
          console.warn('Could not delete avatar file:', err)
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null, avatar_type: 'initial' })
        .eq('id', userId)

      if (error) throw error

      setShowModal(false)
      setError(null)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('Error removing avatar:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to remove avatar: ${errorMsg}`)
    } finally {
      setUploading(false)
    }
  }

  const renderAvatar = () => {
    if (currentAvatarType === 'image' && currentAvatar) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentAvatar} alt={userName} className="w-full h-full object-cover" />
      )
    }
    return (
      <span className="text-white font-semibold text-lg">
        {userName.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <>
      <button onClick={() => setShowModal(true)} className="relative group shrink-0">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: currentAvatarType === 'image' ? '#e5e7eb' : '#dc2626' }}
        >
          {renderAvatar()}
        </div>
        <div className="absolute inset-0 rounded-full bg-black opacity-0 group-hover:opacity-40 transition-opacity flex items-center justify-center pointer-events-none">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" 
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div 
            className="bg-white rounded-lg max-w-sm w-full" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Update Profile Picture</h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center border-b">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden mb-3"
                style={{ backgroundColor: currentAvatarType === 'image' ? '#e5e7eb' : '#dc2626' }}
              >
                {currentAvatarType === 'image' && currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-4xl">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{userName}</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="p-6 space-y-4">
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              <p className="text-xs text-gray-500 text-center">Max file size: 2MB • JPG, PNG, or GIF</p>
            </div>

            {currentAvatarType === 'image' && (
              <div className="px-6 pb-6">
                <button 
                  onClick={handleRemoveAvatar} 
                  disabled={uploading} 
                  className="w-full px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Remove Photo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}