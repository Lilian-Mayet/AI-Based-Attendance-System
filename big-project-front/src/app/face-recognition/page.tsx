"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader2, Upload, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

import "./FaceRecognition.css";

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
    const [useCamera, setUseCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const previewRef = useRef<HTMLDivElement>(null); // Ref for the camera preview container
    const [cameraDimensions, setCameraDimensions] = useState<{ width: number; height: number } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
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
            // Keep the displayed image within a reasonable width
            const maxWidth = window.innerWidth / 2;
            const aspectRatio = originalImageSize.height / originalImageSize.width;
            imageRef.current.style.maxWidth = `${maxWidth}px`;
            imageRef.current.style.height = `auto`;
        }
    }, [originalImageSize]);

    const startCamera = useCallback(async () => {
        setUseCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    setCameraDimensions({
                        width: videoRef.current.videoWidth,
                        height: videoRef.current.videoHeight,
                    });
                };
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            setError("Failed to access camera.");
            setUseCamera(false);
        }
    }, []);

    const takePicture = useCallback(async () => {
        if (videoRef.current && previewRef.current && cameraDimensions) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas'); // Create a temporary canvas
            canvas.width = cameraDimensions.width;
            canvas.height = cameraDimensions.height;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, cameraDimensions.width, cameraDimensions.height);
            const imageDataUrl = canvas.toDataURL('image/jpeg');
            setImage(imageDataUrl);
            setOriginalImageSize(cameraDimensions);
            setUseCamera(false);
            // Stop the camera stream
            const stream = video.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());

            // Trigger face recognition
            setIsLoading(true);
            setError(null);

            try {
                const formData = new FormData();
                const blob = await fetch(imageDataUrl).then(r => r.blob());
                formData.append("file", blob, 'camera_image.jpg');

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
                console.error("Error during face recognition:", error);
                setError("Failed to recognize faces. Please try again.");
            } finally {
                setIsLoading(false);
            }
        }
    }, [cameraDimensions]);

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

    const getCameraPreviewStyle = useCallback(() => {
        return cameraDimensions
            ? {
                  width: `${cameraDimensions.width}px`,
                  height: `${cameraDimensions.height}px`,
                  maxWidth: '100%', // Ensure it's responsive
                  maxHeight: '400px', // Optional max height
                  objectFit: 'cover',
              }
            : { width: '100%', maxHeight: '400px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontStyle: 'italic' };
    }, [cameraDimensions]);

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
                <CardContent className="p-6 relative">
                    <div className="flex justify-center gap-4 mb-4">
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition"
                            disabled={useCamera}
                        >
                            <Upload className="w-5 h-5" /> Upload Picture
                        </Button>
                        <Button
                            onClick={startCamera}
                            className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition"
                            disabled={useCamera}
                        >
                            <Camera className="w-5 h-5" /> Use Front Camera
                        </Button>
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

                    {useCamera && (
                        <div ref={previewRef} className="relative mt-4 border border-gray-300 rounded-lg overflow-hidden shadow-md flex flex-col items-center">
                            <video ref={videoRef} style={getCameraPreviewStyle()} autoPlay playsInline />
                            <Button onClick={takePicture} className="mt-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg shadow-md transition">
                                Take Picture
                            </Button>
                        </div>
                    )}

                    {!useCamera && image && originalImageSize && (
                        <div className="relative mt-4 border border-gray-300 rounded-lg overflow-hidden shadow-md flex justify-center">
                            <Image ref={imageRef} src={image} alt="Uploaded" width={originalImageSize.width} height={originalImageSize.height} className="object-contain" style={{ maxWidth: '100%', height: 'auto' }} />
                            {faces.map((face, index) => {
                                const scaledBox = getScaledBoundingBox(face);
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute border-4 border-red-500"
                                        style={{
                                            top: scaledBox.top,
                                            left: scaledBox.left,
                                            width: scaledBox.width,
                                            height: scaledBox.height,
                                        }}
                                    />
                                );
                            })}
                            {selectedFace && originalImageSize && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute border-4 border-blue-500"
                                    style={getScaledBoundingBox(selectedFace)}
                                />
                            )}
                        </div>
                    )}

                    {!useCamera && isLoading && (
                        <div className="mt-4 flex items-center justify-center text-gray-600">
                            <Loader2 className="animate-spin mr-2" /> Processing image...
                        </div>
                    )}

                    {!useCamera && error && (
                        <div className="mt-4 text-red-600 font-semibold">
                            ⚠️ {error}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}