import React, { useState } from 'react';
import { X, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
  placeholder = 'رابط الصورة',
}) => {
  const [urlInput, setUrlInput] = useState('');

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
  };

  return (
    <div className="space-y-2 w-full">
      {/* حقل إدخال الرابط */}
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Input
          type="text"
          placeholder={placeholder}
          value={value || urlInput}
          onChange={(e) => {
            if (!value) {
              setUrlInput(e.target.value);
            } else {
              onChange(e.target.value);
            }
          }}
          onKeyPress={(e) => e.key === 'Enter' && !value && handleUrlSubmit()}
          className="flex-1 h-10"
        />
        
        <div className="flex gap-2 w-full sm:w-auto">
          {!value && urlInput && (
            <Button
              type="button"
              size="sm"
              onClick={handleUrlSubmit}
              className="flex-1 sm:flex-none h-10"
            >
              <LinkIcon className="w-4 h-4 sm:mr-0 mr-2" />
              <span className="sm:hidden">إضافة</span>
            </Button>
          )}

          {/* زر الحذف */}
          {value && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="flex-1 sm:flex-none h-10"
              title="حذف الرابط"
            >
              <X className="w-4 h-4 sm:mr-0 mr-2" />
              <span className="sm:hidden">حذف</span>
            </Button>
          )}
        </div>
      </div>

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

      {/* رسالة توضيحية */}
      <p className="text-xs text-stone-400 leading-relaxed">
        🔗 الصق رابط الصورة من أي مصدر
      </p>
    </div>
  );
};
