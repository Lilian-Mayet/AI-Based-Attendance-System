"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

interface Face {
  name: string;
  bounding_box: [number, number, number, number]; // [top, right, bottom, left]
  confidence: number;
}

export default function FaceRecognitionV2() {
  const [image, setImage] = useState<string | null>(null);
  const [faces, setFaces] = useState<Face[]>([]);
  const [selectedFace, setSelectedFace] = useState<Face | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowedStudents, setAllowedStudents] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Retrieve allowedStudents from URL or localStorage
    const studentsFromQuery = searchParams.get("allowedStudents");
    if (studentsFromQuery) {
      setAllowedStudents(JSON.parse(decodeURIComponent(studentsFromQuery)));
    } else {
      const storedStudents = localStorage.getItem("allowedStudents");
      if (storedStudents) {
        setAllowedStudents(JSON.parse(storedStudents));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (originalImageSize && imageRef.current) {
      const maxWidth = window.innerWidth / 2;
      const aspectRatio = originalImageSize.height / originalImageSize.width;
      imageRef.current.style.width = `${maxWidth}px`;
      imageRef.current.style.height = `${maxWidth * aspectRatio}px`;
    }
  }, [originalImageSize]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (event.target?.result) {
          const imageDataUrl = event.target.result as string;
          setImage(imageDataUrl);
          setIsLoading(true);
          setError(null);

          const img = new window.Image();
          img.src = imageDataUrl;
          img.onload = () => {
            setOriginalImageSize({ width: img.width, height: img.height });
          };

          const formData = new FormData();
          formData.append("file", file);

          try {
            const response = await fetch("http://127.0.0.1:8000/recognize_faces/", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error("Failed to recognize faces");
            }

            const data = await response.json();
            setFaces(data.faces || []);
          } catch (error) {
            console.error("Error:", error);
            setError("Failed to recognize faces. Please try again.");
          } finally {
            setIsLoading(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const getScaledBoundingBox = useCallback(
    (face: Face) => {
      if (!imageRef.current || !originalImageSize) return { top: 0, left: 0, width: 0, height: 0 };

      const displayedWidth = imageRef.current.clientWidth;
      const displayedHeight = imageRef.current.clientHeight;

      const scaleX = displayedWidth / originalImageSize.width;
      const scaleY = displayedHeight / originalImageSize.height;

      return {
        top: face.bounding_box[0] * scaleY,
        left: face.bounding_box[3] * scaleX,
        width: (face.bounding_box[1] - face.bounding_box[3]) * scaleX,
        height: (face.bounding_box[2] - face.bounding_box[0]) * scaleY,
      };
    },
    [originalImageSize]
  );

  const detectedStudents = new Set((faces || []).map(face => face.name));
  const unexpectedStudents = (faces || []).filter(face => !allowedStudents.includes(face.name));

  const handleStudentClick = (face: Face) => {
    setSelectedFace(face);
  };

  return (
    <div className="flex gap-8 p-6 bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <div className="w-1/4 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Expected Students</h2>
        <ul>
          {allowedStudents.map((student) => {
            const face = faces.find((f) => f.name === student);
            return (
              <li
                key={student}
                className={`p-2 mb-2 rounded-md text-white cursor-pointer transition-all ${
                  face ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
                onClick={() => face && handleStudentClick(face)}
              >
                {student} {face ? `(${(face.confidence * 100).toFixed(2)}%)` : ""}
              </li>
            );
          })}
        </ul>
  
        <h2 className="text-xl font-bold mt-6 mb-2 text-gray-800">Unexpected Students</h2>
        <ul>
          {unexpectedStudents
            .filter((face) => !face.name.startsWith("stranger_"))
            .map((face, index) => (
              <li
                key={index}
                className="p-2 mb-2 bg-yellow-500 hover:bg-yellow-600 rounded-md text-white cursor-pointer transition-all"
                onClick={() => handleStudentClick(face)}
              >
                {face.name || "Unknown Student"} ({(face.confidence * 100).toFixed(2)}%)
              </li>
          ))}
        </ul>
  
        <h2 className="text-xl font-bold mt-6 mb-2 text-gray-800">Unknown Strangers</h2>
        <ul>
          {faces
            .filter(face => face.name.startsWith("stranger_"))
            .map((face, index) => (
              <li
                key={index}
                className="p-2 mb-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white cursor-pointer transition-all"
                onClick={() => handleStudentClick(face)}
              >
                👤 {face.name.replace("_", " ")}
              </li>
          ))}
        </ul>
  
        <Button onClick={() => setSelectedFace(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mt-6">
          Clear Boxes
        </Button>
      </div>
  
      {/* Main Card */}
      <Card className="w-3/4 overflow-hidden relative shadow-xl border border-gray-200">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white">
          <CardTitle className="text-3xl font-bold tracking-tight">Face Recognition</CardTitle>
        </CardHeader>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
        <div className="flex justify-center px-6 mt-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition"
          >
            <Upload className="w-5 h-5" /> Upload Classroom picture
          </Button>
        </div>
        <CardContent className="p-6 relative">
          {image && (
            <div className="relative mt-4 border border-gray-300 rounded-lg overflow-hidden shadow-md">
              <Image ref={imageRef} src={image} alt="Uploaded" width={500} height={500} className="object-contain" />
              {selectedFace && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute border-4 border-red-500"
                  style={getScaledBoundingBox(selectedFace)}
                />
              )}
            </div>
          )}
          {isLoading && (
            <div className="mt-4 flex items-center justify-center text-gray-600">
              <Loader2 className="animate-spin mr-2" /> Processing image...
            </div>
          )}
          {error && (
            <div className="mt-4 text-red-600 font-semibold">
              ⚠️ {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
}
