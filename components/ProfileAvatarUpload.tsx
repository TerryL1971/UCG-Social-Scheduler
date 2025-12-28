// components/ProfileAvatarUpload.tsx

'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Camera, X, Sparkles } from 'lucide-react'

type AvatarType = 'image' | 'generated' | 'initial'

type ProfileAvatarUploadProps = {
  userId: string
  currentAvatar?: string
  currentAvatarType?: AvatarType
  userName: string
  onUpdate?: () => void
}

// Avatar generation services
const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Cartoon', preview: 'avataaars' },
  { id: 'personas', name: 'Personas', preview: 'personas' },
  { id: 'bottts', name: 'Robot', preview: 'bottts' },
  { id: 'lorelei', name: 'Modern', preview: 'lorelei' },
  { id: 'notionists', name: 'Notion', preview: 'notionists' },
  { id: 'thumbs', name: 'Thumbs Up', preview: 'thumbs' },
]

const generateAvatarUrl = (style: string, seed: string) => {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=dc2626,b91c1c,991b1b`
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
  const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('generate')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    setUploading(true)
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${userId}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          avatar_type: 'image'
        })
        .eq('id', userId)

      if (updateError) throw updateError

      setShowModal(false)
      onUpdate?.()
      alert('Profile picture updated!')
    } catch (err) {
      console.error('Error uploading avatar:', err)
      alert('Failed to upload image. Make sure the storage bucket is set up in Supabase.')
    } finally {
      setUploading(false)
    }
  }

  const handleGeneratedAvatar = async (style: string) => {
    setUploading(true)
    try {
      const avatarUrl = generateAvatarUrl(style, userName + userId)

      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          avatar_type: 'generated'
        })
        .eq('id', userId)

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message || 'Database update failed')
      }

      setShowModal(false)
      onUpdate?.()
      alert('Avatar updated!')
    } catch (err: unknown) {
      console.error('Error updating avatar:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to update avatar: ${errorMessage}\n\nMake sure you've run the database migration in Supabase SQL Editor.`)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove your profile picture?')) return

    setUploading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          avatar_type: 'initial'
        })
        .eq('id', userId)

      if (error) throw error

      setShowModal(false)
      onUpdate?.()
      alert('Avatar removed!')
    } catch (err) {
      console.error('Error removing avatar:', err)
      alert('Failed to remove avatar')
    } finally {
      setUploading(false)
    }
  }

  const renderAvatar = () => {
    if ((currentAvatarType === 'image' || currentAvatarType === 'generated') && currentAvatar) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentAvatar}
          alt={userName}
          className="w-full h-full object-cover"
        />
      )
    }

    // Default to initial
    return (
      <span className="text-white font-semibold text-lg">
        {userName.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <>
      {/* Avatar Display with Edit Button */}
      <button
        onClick={() => setShowModal(true)}
        className="relative group"
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: (currentAvatarType === 'image' || currentAvatarType === 'generated') ? 'transparent' : '#dc2626' }}
        >
          {renderAvatar()}
        </div>
        <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
          <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">Update Profile Picture</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Current Avatar Preview */}
            <div className="p-6 flex flex-col items-center border-b">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden mb-4"
                style={{ backgroundColor: (currentAvatarType === 'image' || currentAvatarType === 'generated') ? '#e5e7eb' : '#dc2626' }}
              >
                {(currentAvatarType === 'image' || currentAvatarType === 'generated') && currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentAvatar}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-4xl">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{userName}</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'generate'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Generate Avatar
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Camera className="w-4 h-4 inline mr-2" />
                Upload Photo
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'generate' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Choose a style for your avatar. It will be unique to you!
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {AVATAR_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => handleGeneratedAvatar(style.id)}
                        disabled={uploading}
                        className="p-4 border-2 rounded-lg hover:border-red-600 transition-all border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={generateAvatarUrl(style.preview, userName + userId)}
                          alt={style.name}
                          className="w-16 h-16 rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-900">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="space-y-4">
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
                    className="w-full px-4 py-3 rounded-lg font-medium transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Choose Photo'}
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Max file size: 2MB • JPG, PNG, or GIF
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      💡 <strong>Note:</strong> Make sure the storage bucket is set up in Supabase. Run the migration SQL first if you haven&apos;t already.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {currentAvatarType !== 'initial' && (
              <div className="p-4 border-t">
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="w-full px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Remove Avatar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}