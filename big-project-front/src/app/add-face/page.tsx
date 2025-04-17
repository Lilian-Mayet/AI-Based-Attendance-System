'use client';

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import './AddFace.css'; // Keep importing the CSS file

export default function AddFace() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // <-- State for image preview URL

  // Cleanup function for Object URL
  useEffect(() => {
    // This function runs when the component unmounts or before the effect runs again
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl); // Revoke the object URL to free memory
      }
    };
  }, [previewUrl]); // Dependency array ensures this runs when previewUrl changes

  const handleFileChange = (file: File | null) => {
     // Revoke previous URL if exists
     if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
     }

     if (file && file.type.startsWith('image/')) {
        setSelectedFile(file);
        // Create a new object URL for preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setMessage('');
     } else {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (file) { // Only show message if a file was selected but invalid
            setMessage('Please upload a valid image file (e.g., JPG, PNG).');
        }
     }
  }

  const onFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLoading) return;
    const file = event.dataTransfer.files[0];
    handleFileChange(file);
  }, [isLoading, previewUrl]); // Include previewUrl in dependencies for cleanup logic access

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    const file = event.target.files?.[0];
    handleFileChange(file || null);
  };

  const uploadFace = async () => {
    if (!selectedFile || !name) {
      setMessage('Both image and name are required.');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', name);

    try {
      const res = await axios.post('http://localhost:8000/add_face/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message || 'Face added successfully!');
      setSelectedFile(null);
      setName('');
      // Clear preview after successful upload
      if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
    } catch (err: any) {
      console.error("Detailed upload error object:", err);
      const errorMsg = err.response?.data?.detail
                       || err.response?.data?.error
                       || err.message
                       || 'An error occurred during upload.';
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDropzoneClick = () => {
      if (isLoading) return;
      const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
      fileInput?.click();
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-5 border rounded-lg shadow-lg bg-white">
      <h1 className="text-2xl font-bold mb-4 text-center">Add New Face</h1>

      {/* --- Dropzone Area --- */}
      <div
        onDrop={onFileDrop}
        onDragOver={(e) => {
            if (isLoading) return;
            e.preventDefault();
        }}
        onClick={handleDropzoneClick}
        // Added relative positioning and overflow hidden
        className={`relative border-dashed border-2 p-4 text-center h-64 flex justify-center items-center ${isLoading ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:border-blue-500 hover:bg-gray-50'} transition-colors overflow-hidden`} // Height added for consistency
      >
        {/* --- Image Preview --- */}
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Selected face preview"
            // Style to fit within the dropzone without distortion
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* --- Prompt Text (shown only if no preview) --- */}
        {!previewUrl && !isLoading && (
          <span className="text-gray-500">
              Drag & Drop Image Here or Click to Select
          </span>
        )}

        {/* --- Loading Animation Overlay (shown only on image during loading) --- */}
        {isLoading && previewUrl && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                {/* Animation Container */}
                <div className="scan-animation w-full h-full">
                    {/* Scanning Line */}
                    <div className="scan-line"></div>
                    {/* Optional: Add binary numbers or segments here */}
                    <div className="binary-overlay">
                        {/* Generate some random 0s and 1s - simple example */}
                        {Array.from({ length: 50 }).map((_, i) => (
                            <span key={i} style={{
                                position: 'absolute',
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                fontSize: '10px',
                                color: 'rgba(0, 255, 0, 0.7)', // Greenish color
                                animation: `binary-flicker ${Math.random() * 1 + 0.5}s infinite alternate`
                            }}>
                                {Math.random() > 0.5 ? '1' : '0'}
                            </span>
                        ))}
                    </div>
                    <div className="segment segment-1"></div>
                    <div className="segment segment-2"></div>
                    <div className="segment segment-3"></div>
                    <div className="segment segment-4"></div>
                </div>
                 <p className="absolute bottom-4 text-white text-lg font-semibold animate-pulse z-20">Processing Face...</p>
            </div>
        )}

         {/* Fallback Loading text if loading starts BEFORE an image is selected (less likely now) */}
         {isLoading && !previewUrl && (
             <div className="absolute inset-0 bg-gray-500 bg-opacity-70 flex flex-col justify-center items-center z-10 rounded-lg">
                 <div className="loader mb-4"></div> {/* Original spinner */}
                 <p className="text-white text-lg font-semibold animate-pulse">Processing...</p>
             </div>
         )}


        {/* Hidden file input */}
        <input
            id="fileInput"
            type="file"
            className="hidden"
            onChange={onFileSelect}
            accept="image/png, image/jpeg, image/jpg"
            disabled={isLoading}
        />
      </div>
      {/* --- End Dropzone Area --- */}


      {/* Name Input */}
      <input
        type="text"
        placeholder="Enter name associated with the face"
        className={`border p-2 mt-4 w-full rounded ${isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
      />

      {/* Upload Button */}
      <button
        onClick={uploadFace}
        className={`mt-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded w-full font-semibold transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed bg-blue-400' : ''}`}
        disabled={isLoading || !selectedFile || !name} // Disable if loading or missing data
      >
        {isLoading ? 'Processing...' : 'Upload Face'}
      </button>

      {/* Message Area */}
      {message && (
        <p className={`mt-3 text-center font-medium ${message.startsWith('Error:') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
       )}
    </div>
  );
}