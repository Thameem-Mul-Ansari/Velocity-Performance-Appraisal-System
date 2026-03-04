import { useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader } from 'lucide-react';
import { storage } from '../../utils/firebase';

interface PhotoUploadProps {
  currentPhotoURL?: string;
  employeeId: string;
  name?: string;
  onUploaded: (url: string) => void;
  size?: number;
}

export const PhotoUpload = ({ currentPhotoURL, employeeId, name, onUploaded, size = 80 }: PhotoUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    try {
      const storageRef = ref(storage, `employee-photos/${employeeId}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onUploaded(url);
    } catch (err) {
      console.error('Upload failed:', err);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const photo = preview || currentPhotoURL;
  const initials = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
      <div
        style={{
          width: size, height: size,
          borderRadius: '16px',
          position: 'relative',
          cursor: 'pointer',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
          border: `2px solid ${hover ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: hover ? '0 8px 24px rgba(37, 99, 235, 0.15)' : '0 4px 12px rgba(15, 23, 42, 0.04)',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {photo ? (
          <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--gradient-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.36, fontWeight: 700, color: '#fff',
            fontFamily: 'Space Grotesk, sans-serif',
          }}>
            {initials}
          </div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15, 23, 42, 0.6)', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
          opacity: hover || uploading ? 1 : 0,
          transition: 'opacity 0.2s',
        }}>
          {uploading ? (
            <Loader size={size * 0.25} color="#fff" style={{ animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <>
              <Camera size={size * 0.22} color="#fff" />
              <span style={{ fontSize: '10px', color: '#fff', fontWeight: 600 }}>Upload</span>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>Click to upload photo</span>
    </div>
  );
};