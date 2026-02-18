import React, { useRef, useState } from 'react';
import { Upload, X, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { localImageService } from '@/services/localImageService';

interface LocalImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  maxSizeMB?: number;
  allowUrl?: boolean;
  placeholder?: string;
}

export const LocalImageUploader: React.FC<LocalImageUploaderProps> = ({
  value,
  onChange,
  maxSizeMB = 5, // جودة عالية!
  allowUrl = true,
  placeholder = 'رابط الصورة أو ارفع صورة',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة');
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    console.log(`حجم الصورة: ${fileSizeMB.toFixed(2)}MB - جاري الرفع...`);

    if (fileSizeMB > 50) {
      alert('حجم الصورة كبير جداً. الحد الأقصى 50MB');
      return;
    }

    setUploading(true);
    try {
      // ضغط قوي وتحويل لـ Base64
      const result = await localImageService.uploadImage(file, 0.08, 0.6);
      if (result.success && result.url) {
        onChange(result.url);
        console.log('✓ تم معالجة الصورة بنجاح!');
      } else {
        alert(result.error || 'فشل معالجة الصورة. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        {/* زر رفع الصورة */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 w-full sm:w-auto h-10 text-sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'جاري المعالجة...' : 'رفع صورة محلياً'}
        </Button>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* زر إضافة رابط */}
          {allowUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
              disabled={uploading}
              className="flex-1 sm:flex-none h-10"
              title="إضافة رابط صورة"
            >
              <LinkIcon className="w-4 h-4 sm:mr-0 mr-2" />
              <span className="sm:hidden">رابط</span>
            </Button>
          )}

          {/* زر الحذف */}
          {value && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="flex-1 sm:flex-none h-10"
              title="حذف الصورة"
            >
              <X className="w-4 h-4 sm:mr-0 mr-2" />
              <span className="sm:hidden">حذف</span>
            </Button>
          )}
        </div>
      </div>

      {/* حقل إدخال الرابط */}
      {showUrlInput && allowUrl && (
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Input
            type="text"
            placeholder="الصق رابط الصورة هنا"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
            className="flex-1 h-10"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUrlSubmit}
            className="w-full sm:w-auto h-10"
          >
            إضافة
          </Button>
        </div>
      )}

      {/* معاينة الصورة */}
      {value && (
        <div className="relative w-full h-32 border border-stone-200 rounded-md overflow-hidden bg-stone-50">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
      )}

      {/* حقل الإدخال المخفي */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* رسالة توضيحية */}
      <p className="text-xs text-stone-400 leading-relaxed">
        📸 ضغط ذكي - صورة واحدة لكل منتج - جودة جيدة
      </p>
    </div>
  );
};
