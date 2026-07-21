'use client';

import React from 'react';
import Image from 'next/image';
import { useAddProduct } from './AddProductContext';
import { Spinner } from '@/shared/ui/loading';
import SafeProgressBar from '@/shared/ui/SafeProgressBar';

export default function ProductMediaForm() {
  const {
    media,
    maxMediaLimit,
    handleRemoveMedia,
    cameraInputRef,
    videoCameraInputRef,
    fileInputRef,
    isUploading,
    handleFileUpload,
    uploadProgress
  } = useAddProduct();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
          Photos & Videos
        </h2>
        <span className="text-xs font-mono text-zinc-400">
          {media.length}/{maxMediaLimit}
        </span>
      </div>

      {media.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
          {media.map((item, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 snap-start"
            >
              {item.type === 'video' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-300 p-1 text-center">
                  <span className="text-2xl">🎬</span>
                  <span className="text-[9px] font-mono mt-1">Video</span>
                </div>
              ) : (
                <Image
                  src={item.url}
                  alt="Gallery item preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 96px, 112px"
                />
              )}
              <button
                type="button"
                onClick={() => handleRemoveMedia(index)}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-red-600/90 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs cursor-pointer transition-all shadow-lg active:scale-90"
                title="Remove media"
              >
                ✕
              </button>
              {index === 0 && (
                <span className="absolute bottom-1.5 left-1.5 bg-purple-700/90 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {media.length < maxMediaLimit && (
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-col items-center justify-center gap-1.5 py-4 sm:py-3.5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/30 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              Camera
            </span>
          </button>

          <button
            type="button"
            onClick={() => videoCameraInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-col items-center justify-center gap-1.5 py-4 sm:py-3.5 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/30 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Video Cam
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex flex-col items-center justify-center gap-1.5 py-4 sm:py-3.5 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-950/30 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              Gallery
            </span>
          </button>
        </div>
      )}

      <p className="text-[10px] text-zinc-400 text-center font-mono">
        PNG, JPG, WEBP, or MP4 • Max 10MB each
      </p>

      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={videoCameraInputRef}
        onChange={handleFileUpload}
        accept="video/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,video/*"
        multiple
        className="hidden"
      />

      {isUploading && uploadProgress !== null && (
        <div className="space-y-1.5 px-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Spinner size="sm" className="text-purple-500" />
              Uploading...
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <SafeProgressBar
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-150"
              percent={uploadProgress}
            />
          </div>
        </div>
      )}
    </div>
  );
}
