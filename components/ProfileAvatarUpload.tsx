// components/ProfileAvatarUpload.tsx

'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import { Camera, X, Smile } from 'lucide-react'

type AvatarType = 'image' | 'emoji' | 'initial'

type ProfileAvatarUploadProps = {
  userId: string
  currentAvatar?: string
  currentAvatarType?: AvatarType
  userName: string
  onUpdate?: () => void
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
  '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
  '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🔧', '👩‍🔧', '🧑‍🔧', '👨‍💻', '👩‍💻', '🧑‍💻',
  '🚗', '🏎️', '🚙', '🚕', '🚓', '🚑', '💼', '🔧', '🔨', '⚙️',
  '🏆', '🎯', '💰', '💎', '⭐', '🌟', '✨', '🎉', '🎊', '🎈'
]

export default function ProfileAvatarUpload({ 
  userId, 
  currentAvatar, 
  currentAvatarType = 'initial',
  userName,
  onUpdate 
}: ProfileAvatarUploadProps) {
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState('')
  const [activeTab, setActiveTab] = useState<'upload' | 'emoji'>('upload')
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
      alert('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleEmojiSelect = async (emoji: string) => {
    setSelectedEmoji(emoji)
    setUploading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: emoji,
          avatar_type: 'emoji'
        })
        .eq('id', userId)

      if (error) throw error

      setShowModal(false)
      onUpdate?.()
      alert('Avatar updated!')
    } catch (err) {
      console.error('Error updating avatar:', err)
      alert('Failed to update avatar')
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
    if (currentAvatarType === 'image' && currentAvatar) {
      return (
        <Image
          src={currentAvatar}
          alt={userName}
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      )
    }

    if (currentAvatarType === 'emoji' && currentAvatar) {
      return (
        <span className="text-2xl leading-none">
          {currentAvatar}
        </span>
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
          style={{ backgroundColor: currentAvatarType === 'image' ? 'transparent' : '#dc2626' }}
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
          <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
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
                style={{ backgroundColor: currentAvatarType === 'image' ? '#e5e7eb' : '#dc2626' }}
              >
                {currentAvatarType === 'image' && currentAvatar ? (
                  <Image
                    src={currentAvatar}
                    alt={userName}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : currentAvatarType === 'emoji' && currentAvatar ? (
                  <span className="text-5xl">{currentAvatar}</span>
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
              <button
                onClick={() => setActiveTab('emoji')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'emoji'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smile className="w-4 h-4 inline mr-2" />
                Choose Emoji
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
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
                </div>
              )}

              {activeTab === 'emoji' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiSelect(emoji)}
                        disabled={uploading}
                        className={`
                          text-2xl p-2 rounded-lg hover:bg-gray-100 transition-colors
                          ${selectedEmoji === emoji ? 'bg-red-100 ring-2 ring-red-600' : ''}
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {emoji}
                      </button>
                    ))}
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