// components/ProfileAvatarUpload.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Camera, X, Sparkles, Upload } from 'lucide-react'

type AvatarType = 'image' | 'generated' | 'initial'

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
  const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('generate')
  const [error, setError] = useState<string | null>(null)
  const [rpmUrl, setRpmUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Listen for Ready Player Me messages (keeping for future iframe integration)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const validOrigins = [
        'https://demo.readyplayer.me',
        'https://readyplayer.me'
      ]
      
      if (!validOrigins.some(origin => event.origin.includes(origin))) return

      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

      if (data?.eventName === 'v1.avatar.exported') {
        const avatarUrl = data.data.url
        await saveGeneratedAvatar(avatarUrl)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  })

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

  const handleManualRpmUrl = async () => {
    if (!rpmUrl.trim()) {
      setError('Please paste your Ready Player Me URL')
      return
    }

    setUploading(true)
    setError(null)

    try {
      let avatarId = ''
      
      // Extract avatar ID from various URL formats
      if (rpmUrl.includes('models.readyplayer.me')) {
        const match = rpmUrl.match(/models\.readyplayer\.me\/([a-f0-9]+)/i)
        if (match) avatarId = match[1]
      } else if (rpmUrl.includes('readyplayer.me')) {
        const match = rpmUrl.match(/([a-f0-9]{24})/i)
        if (match) avatarId = match[1]
      }

      if (!avatarId) {
        setError('Could not find avatar ID in URL. Make sure you copied the full URL from Ready Player Me.')
        setUploading(false)
        return
      }

      // Test if the avatar exists by trying to load the image
      const avatarUrl = `https://models.readyplayer.me/${avatarId}.png?scene=fullbody-portrait-v1-transparent`
      
      // Verify the URL is accessible
      const testImg = new Image()
      await new Promise((resolve, reject) => {
        testImg.onload = resolve
        testImg.onerror = () => reject(new Error('Avatar not found or not accessible'))
        testImg.src = avatarUrl
      })

      // If we got here, the image loaded successfully
      await saveGeneratedAvatar(avatarUrl)
      setRpmUrl('') // Clear the input
    } catch (err) {
      console.error('Error loading avatar:', err)
      setError('Could not load avatar from that URL. Please make sure you copied the correct link from Ready Player Me.')
      setUploading(false)
    }
  }

  const saveGeneratedAvatar = async (avatarUrl: string) => {
    setUploading(true)
    setError(null)
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl, avatar_type: 'generated' })
        .eq('id', userId)

      if (error) throw new Error(error.message || 'Database update failed')

      setShowModal(false)
      setError(null)
      if (onUpdate) onUpdate()
    } catch (err: unknown) {
      console.error('Error updating avatar:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to update avatar: ${errorMessage}`)
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
    if ((currentAvatarType === 'image' || currentAvatarType === 'generated') && currentAvatar) {
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
          style={{ backgroundColor: (currentAvatarType === 'image' || currentAvatarType === 'generated') ? '#e5e7eb' : '#dc2626' }}
        >
          {renderAvatar()}
        </div>
        <div className="absolute inset-0 rounded-full bg-black opacity-0 group-hover:opacity-40 transition-opacity flex items-center justify-center pointer-events-none">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">Update Profile Picture</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center border-b">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden mb-4"
                style={{ backgroundColor: (currentAvatarType === 'image' || currentAvatarType === 'generated') ? '#e5e7eb' : '#dc2626' }}
              >
                {(currentAvatarType === 'image' || currentAvatarType === 'generated') && currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatar} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-4xl">{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <p className="text-sm text-gray-600">{userName}</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex border-b">
              <button onClick={() => setActiveTab('generate')} className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === 'generate' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <Sparkles className="w-4 h-4 inline mr-2" />
                Create 3D Avatar
              </button>
              <button onClick={() => setActiveTab('upload')} className={`flex-1 px-4 py-3 font-medium transition-colors ${activeTab === 'upload' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:text-gray-900'}`}>
                <Upload className="w-4 h-4 inline mr-2" />
                Upload Photo
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'generate' && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your 3D Avatar</h3>
                    <p className="text-sm text-gray-600 mb-4">Create a personalized 3D avatar and paste the link here.</p>
                    <button onClick={() => window.open('https://readyplayer.me/avatar', '_blank')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5" />
                      Open Ready Player Me
                    </button>
                  </div>

                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Paste Your Avatar URL</label>
                    <input type="text" value={rpmUrl} onChange={(e) => setRpmUrl(e.target.value)} placeholder="https://models.readyplayer.me/..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent mb-3" />
                    <button onClick={handleManualRpmUrl} disabled={uploading} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {uploading ? 'Saving...' : 'Save Avatar'}
                    </button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs text-blue-800 font-semibold mb-2">How to get your avatar URL:</p>
                    <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Click &quot;Open Ready Player Me&quot; above</li>
                      <li>Create your avatar from a selfie or customize it</li>
                      <li>When you finish, copy the link from the share screen</li>
                      <li>Paste it in the box above and click &quot;Save Avatar&quot;</li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full px-4 py-3 rounded-lg font-medium transition-all bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploading ? 'Uploading...' : 'Choose Photo'}
                  </button>
                  <p className="text-xs text-gray-500 text-center">Max file size: 2MB • JPG, PNG, or GIF</p>
                </div>
              )}
            </div>

            {currentAvatarType !== 'initial' && (
              <div className="p-4 border-t">
                <button onClick={handleRemoveAvatar} disabled={uploading} className="w-full px-4 py-2 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
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