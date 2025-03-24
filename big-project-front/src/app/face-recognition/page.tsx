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
    <div className="flex gap-8">
      <div className="w-1/4 p-4 bg-gray-100 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Expected Students</h2>
        <ul>
          {allowedStudents.map((student) => {
            const face = faces.find((f) => f.name === student);
            return (
              <li
                key={student}
                className={`p-2 mb-2 rounded-md text-white cursor-pointer ${
                  face ? "bg-green-500" : "bg-red-500"
                }`}
                onClick={() => face && handleStudentClick(face)}
              >
                {student} {face ? `(${(face.confidence * 100).toFixed(2)}%)` : ""}
              </li>
            );
          })}
        </ul>
        <h2 className="text-lg font-semibold mt-4 mb-2">Unexpected Students</h2>
          <ul>
            {unexpectedStudents
              .filter((face) => !face.name.startsWith("stranger_"))
              .map((face, index) => (
                <li
                  key={index}
                  className="p-2 mb-2 bg-yellow-500 rounded-md text-white cursor-pointer"
                  onClick={() => handleStudentClick(face)}
                >
                  {face.name || "Unknown Student"} ({(face.confidence * 100).toFixed(2)}%)
                </li>
            ))}
          </ul>

        <h2 className="text-lg font-semibold mt-4 mb-2">Unknown Strangers</h2>
        <ul>
          {faces
            .filter(face => face.name.startsWith("stranger_"))
            .map((face, index) => (
              <li
                key={index}
                className="p-2 mb-2 bg-gray-600 rounded-md text-white cursor-pointer"
                onClick={() => handleStudentClick(face)}
              >
                {face.name.replace("_", " ")}
              </li>
          ))}
        </ul>

        <Button onClick={() => setSelectedFace(null)} className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg mt-4">
          Clear Boxes
        </Button>
      </div>
      <Card className="w-3/4 overflow-hidden relative">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardTitle className="text-2xl font-bold">Face Recognition</CardTitle>
        </CardHeader>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="bg-blue-500 text-white py-2 px-6 rounded-lg flex items-center gap-2 shadow-md hover:bg-blue-600 transition"
      >
        <Upload className="w-5 h-5" /> Upload a Photo
      </Button>
        <CardContent className="p-6 relative">
          {image && (
            <div className="relative mt-4 border border-gray-300">
              <Image ref={imageRef} src={image} alt="Uploaded" width={500} height={500} className="object-contain" />
              {selectedFace && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute border-2 border-red-500"
                  style={getScaledBoundingBox(selectedFace)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
