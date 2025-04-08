'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';

export default function AddFace() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const onFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setMessage('');
    } else {
      setMessage('Please upload a valid image file.');
    }
  }, []);

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setMessage('');
    } else {
      setMessage('Please upload a valid image file.');
    }
  };

  const uploadFace = async () => {
    if (!selectedFile || !name) {
      setMessage('Both image and name are required.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', name);

    try {
      const res = await axios.post('http://localhost:8000/add_face/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
    } catch (err: any) {
      setMessage(err.response?.data.error || 'An error occurred.');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-5 border rounded-lg shadow-lg bg-white">
      <h1 className="text-2xl font-bold mb-4">Add New Face</h1>

      <div
        onDrop={onFileDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-dashed border-2 p-4 text-center cursor-pointer"
      >
        {selectedFile ? selectedFile.name : 'Drag & Drop or Click to Select Image'}
        <input type="file" className="hidden" onChange={onFileSelect} />
      </div>

      <input
        type="text"
        placeholder="Enter name"
        className="border p-2 mt-4 w-full"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        onClick={uploadFace}
        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded w-full"
      >
        Upload Face
      </button>

      {message && <p className="mt-3 text-center text-red-500">{message}</p>}
    </div>
  );
}
