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
    bounding_box: [number, number, number, number]; // [top, right, bottom, left] relative to original image
    confidence: number;
}

// Define interface for scaled bounding box properties used for styling
interface ScaledBoundingBox {
    top: number;
    left: number;
    width: number;
    height: number;
    offsetX: number; // Horizontal offset due to letterboxing/pillarboxing
    offsetY: number; // Vertical offset due to letterboxing/pillarboxing
    scaleX: number;  // Calculated scale factor for width
    scaleY: number;  // Calculated scale factor for height
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
    // Ref for the CONTAINER holding the image, used for scaling calculations
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null); // Ref for the camera preview container
    const [cameraDimensions, setCameraDimensions] = useState<{ width: number; height: number } | null>(null);
    const [displayedImageDimensions, setDisplayedImageDimensions] = useState<{ width: number; height: number } | null>(null);


    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    // --- Backend Fetch Logic (Keep existing functions handleImageUpload, takePicture) ---
    // No changes needed in the backend interaction itself for this problem

    // --- Allowed Students Logic (Keep existing useEffect) ---
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

    // --- Camera Logic (Keep existing startCamera, takePicture, getCameraPreviewStyle) ---
    const startCamera = useCallback(async () => {
        // ... (keep existing implementation)
        setUseCamera(true);
        setImage(null); // Clear previous image when starting camera
        setFaces([]);
        setSelectedFace(null);
        setOriginalImageSize(null);
        setDisplayedImageDimensions(null);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    if (videoRef.current) { // Check ref again inside async callback
                        setCameraDimensions({
                            width: videoRef.current.videoWidth,
                            height: videoRef.current.videoHeight,
                        });
                        // Set initial preview size based on video aspect ratio
                        if (previewRef.current) {
                            const containerWidth = previewRef.current.clientWidth;
                            const videoAspect = videoRef.current.videoHeight / videoRef.current.videoWidth;
                            previewRef.current.style.height = `${containerWidth * videoAspect}px`;
                        }
                    }
                };
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            setError("Failed to access camera.");
            setUseCamera(false);
        }
    }, []);

    const takePicture = useCallback(async () => {
        if (videoRef.current && cameraDimensions) {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = cameraDimensions.width; // Use native video dimensions for capture
            canvas.height = cameraDimensions.height;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageDataUrl = canvas.toDataURL('image/jpeg');

            // Stop the camera stream
            const stream = video.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
            video.srcObject = null; // Release the stream resource

            // Set state for processing
            setImage(imageDataUrl);
            setOriginalImageSize(cameraDimensions); // Original size is the camera capture size
            setUseCamera(false); // Turn off camera view
            setFaces([]); // Clear previous faces
            setSelectedFace(null);
            setIsLoading(true);
            setError(null);

            // --- Send to backend ---
            try {
                const formData = new FormData();
                const blob = await fetch(imageDataUrl).then(r => r.blob());
                formData.append("file", blob, 'camera_image.jpg');

                const response = await fetch("http://127.0.0.1:8000/recognize_faces/", {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.text(); // Get more error details
                    console.error("Backend Error:", errorData);
                    throw new Error(`Failed to recognize faces (status: ${response.status})`);
                }

                const data = await response.json();
                setFaces(data.faces || []);
            } catch (error: any) {
                console.error("Error during face recognition:", error);
                setError(error.message || "Failed to recognize faces. Please try again.");
            } finally {
                setIsLoading(false);
            }
        }
    }, [cameraDimensions]); // Add other dependencies if needed


    const getCameraPreviewStyle = useCallback(() => {
        // Base style for the video element itself
        const style: React.CSSProperties = {
            display: 'block', // Prevents extra space below video
            width: '100%',    // Fill the container width
            height: 'auto',   // Adjust height automatically based on aspect ratio
            maxWidth: '100%', // Ensure it doesn't overflow container
            objectFit: 'contain', // Or 'cover', depending on desired behavior
        };
        return style;
    }, []);


    // --- Image Upload Handling ---
    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                if (event.target?.result) {
                    const imageDataUrl = event.target.result as string;

                    // Create an image element to get original dimensions *before* setting state
                    const img = new window.Image();
                    img.onload = async () => {
                        // Now we have original dimensions, set state and proceed
                        setOriginalImageSize({ width: img.width, height: img.height });
                        setImage(imageDataUrl);
                        setFaces([]); // Clear previous faces
                        setSelectedFace(null);
                        setIsLoading(true);
                        setError(null);
                        setUseCamera(false); // Ensure camera view is off

                        // --- Send to backend ---
                        const formData = new FormData();
                        formData.append("file", file);

                        try {
                            const response = await fetch("http://127.0.0.1:8000/recognize_faces/", {
                                method: "POST",
                                body: formData,
                            });

                            if (!response.ok) {
                                const errorData = await response.text();
                                console.error("Backend Error:", errorData);
                                throw new Error(`Failed to recognize faces (status: ${response.status})`);
                            }

                            const data = await response.json();
                            setFaces(data.faces || []);
                        } catch (error: any) {
                            console.error("Error:", error);
                            setError(error.message || "Failed to recognize faces. Please try again.");
                        } finally {
                            setIsLoading(false);
                        }
                    };
                    img.onerror = () => {
                        setError("Failed to load image details.");
                        setIsLoading(false);
                    }
                    img.src = imageDataUrl; // Trigger the loading
                }
            };
            reader.onerror = () => {
                setError("Failed to read file.");
                setIsLoading(false);
            };
            reader.readAsDataURL(file);
        }
         // Reset file input value so the same file can be uploaded again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []); // Add dependencies if needed


    // --- Recalculate Displayed Image Dimensions on Resize or Image Load ---
    useEffect(() => {
        const calculateDisplayedDimensions = () => {
            if (image && originalImageSize && imageContainerRef.current) {
                const containerWidth = imageContainerRef.current.clientWidth;
                // Calculate height based on aspect ratio to fit container width
                const imageAspect = originalImageSize.height / originalImageSize.width;
                const calculatedHeight = containerWidth * imageAspect;

                 // Use a reasonable maxHeight, e.g., viewport height minus some padding
                const maxHeight = window.innerHeight * 0.6;

                let displayedWidth = containerWidth;
                let displayedHeight = calculatedHeight;

                // If calculated height exceeds max height, scale down based on height
                if (calculatedHeight > maxHeight) {
                    displayedHeight = maxHeight;
                    displayedWidth = maxHeight / imageAspect;
                }

                setDisplayedImageDimensions({ width: displayedWidth, height: displayedHeight });
            } else {
                setDisplayedImageDimensions(null); // Reset if no image/container
            }
        };

        // Calculate initially
        calculateDisplayedDimensions();

        // Recalculate on window resize
        window.addEventListener('resize', calculateDisplayedDimensions);
        return () => window.removeEventListener('resize', calculateDisplayedDimensions);

    }, [image, originalImageSize]); // Re-run when image or original size changes

    // --- Bounding Box Scaling Logic ---
    const getScaledBoundingBox = useCallback(
        (face: Face): ScaledBoundingBox | null => {
            // Needs container ref, original size, and calculated displayed size
            if (!imageContainerRef.current || !originalImageSize || !displayedImageDimensions) {
                return null; // Not enough info to calculate
            }

            const containerWidth = imageContainerRef.current.clientWidth; // Width of the container div
             // Use the *state* for displayed dimensions, which respects aspect ratio and potential max-height
            const { width: displayedWidth, height: displayedHeight } = displayedImageDimensions;

             // Calculate scale factors based on the *actual displayed image size* vs *original image size*
            const scaleX = displayedWidth / originalImageSize.width;
            const scaleY = displayedHeight / originalImageSize.height;

            // Calculate offsets if the image is letterboxed or pillarboxed within the container
            // This happens because we use object-contain and might have restricted height
            const offsetX = (containerWidth - displayedWidth) / 2;
            const offsetY = (imageContainerRef.current.clientHeight - displayedHeight) / 2; // Assuming container height adjusts or is set


            return {
                // Apply scaling to original coordinates and add offset
                top: face.bounding_box[0] * scaleY + offsetY,
                left: face.bounding_box[3] * scaleX + offsetX,
                width: (face.bounding_box[1] - face.bounding_box[3]) * scaleX,
                height: (face.bounding_box[2] - face.bounding_box[0]) * scaleY,
                offsetX, // Pass these for potential debugging or advanced use
                offsetY,
                scaleX,
                scaleY
            };
        },
        [originalImageSize, displayedImageDimensions] // Dependencies
    );


    // --- Student List Logic ---
    const detectedStudents = new Set((faces || []).map(face => face.name));
    const unexpectedStudents = (faces || []).filter(face => !allowedStudents.includes(face.name));

    const handleStudentClick = (face: Face) => {
        setSelectedFace(face);
    };

    // --- Scanning Animation ---
    const generateRandomBinaryPositions = useCallback(() => {
      // ... (keep existing implementation)
      const binaryArray = [];
      const totalNumbers = 80; // Adjust number of digits as needed

      for (let i = 0; i < totalNumbers; i++) {
        binaryArray.push({
          num: Math.round(Math.random()),
          top: Math.random() * 100,  // Random vertical position (%)
          left: Math.random() * 100, // Random horizontal position (%)
          animationDelay: `${Math.random() * 1.5}s`, // Randomize animation delay
        });
      }
      return binaryArray;
    }, []); // No dependency needed if it's just random


    // --- Component Rendering ---
    return (
        <div className="flex flex-col md:flex-row gap-6 p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Sidebar */}
            <div className="w-full md:w-1/4 p-4 md:p-6 bg-white rounded-xl shadow-lg border border-gray-200 order-2 md:order-1 max-h-[60vh] overflow-y-auto">
                {/* Expected Students List */}
                <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-800 sticky top-0 bg-white py-2 z-10">Expected Students</h2>
                <ul className="mb-4">
                    {allowedStudents.length > 0 ? allowedStudents.map((student) => {
                        const face = faces.find((f) => f.name === student);
                        return (
                            <li
                                key={student}
                                className={`p-2 mb-2 rounded-md text-white text-sm md:text-base cursor-pointer transition-all ${face ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                                    }`}
                                onClick={() => face && handleStudentClick(face)}
                                title={face ? `Click to highlight ${student}` : `${student} not detected`}
                            >
                                {student} {face ? `(${(face.confidence * 100).toFixed(1)}%)` : "(Absent)"}
                            </li>
                        );
                    }) : <li className="text-gray-500 italic">No students expected.</li>}
                </ul>

                 {/* Unexpected Students List */}
                 {unexpectedStudents.filter((face) => !face.name.startsWith("stranger_")).length > 0 && (
                     <>
                         <h2 className="text-lg md:text-xl font-bold mt-4 mb-2 text-gray-800 sticky top-0 bg-white py-2 z-10">Unexpected Students</h2>
                         <ul>
                             {unexpectedStudents
                                 .filter((face) => !face.name.startsWith("stranger_"))
                                 .map((face, index) => (
                                     <li
                                         key={`unexpected-${index}`}
                                         className="p-2 mb-2 bg-yellow-500 hover:bg-yellow-600 rounded-md text-white text-sm md:text-base cursor-pointer transition-all"
                                         onClick={() => handleStudentClick(face)}
                                         title={`Click to highlight ${face.name || 'Unknown'}`}
                                     >
                                         {face.name || "Unknown Student"} ({(face.confidence * 100).toFixed(1)}%)
                                     </li>
                                 ))}
                         </ul>
                     </>
                 )}

                 {/* Unknown Strangers List */}
                  {faces.filter(face => face.name.startsWith("stranger_")).length > 0 && (
                     <>
                        <h2 className="text-lg md:text-xl font-bold mt-4 mb-2 text-gray-800 sticky top-0 bg-white py-2 z-10">Unknown Faces</h2>
                        <ul>
                            {faces
                                .filter(face => face.name.startsWith("stranger_"))
                                .map((face, index) => (
                                    <li
                                        key={`stranger-${index}`}
                                        className="p-2 mb-2 bg-gray-600 hover:bg-gray-700 rounded-md text-white text-sm md:text-base cursor-pointer transition-all"
                                        onClick={() => handleStudentClick(face)}
                                         title={`Click to highlight ${face.name.replace("_", " ")}`}
                                    >
                                        👤 {face.name.replace("_", " ")}
                                    </li>
                                ))}
                        </ul>
                     </>
                 )}

                <Button onClick={() => setSelectedFace(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mt-6 sticky bottom-0 z-10">
                    Clear Highlight
                </Button>
            </div>

            {/* Main Card */}
            <Card className="w-full md:w-3/4 overflow-hidden relative shadow-xl border border-gray-200 order-1 md:order-2">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white">
                    <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">Face Recognition</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 relative">
                    <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-4">
                        <Button
                            onClick={() => !isLoading && fileInputRef.current?.click()} // Prevent click while loading
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 md:px-6 rounded-lg flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                            disabled={useCamera || isLoading}
                        >
                            <Upload className="w-4 h-4 md:w-5 md:h-5" /> Upload Picture
                        </Button>
                        <Button
                            onClick={() => !isLoading && startCamera()} // Prevent click while loading
                            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 md:px-6 rounded-lg flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                            disabled={useCamera || isLoading}
                        >
                            <Camera className="w-4 h-4 md:w-5 md:h-5" /> Use Camera
                        </Button>
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

                    {/* Camera View */}
{/* Camera View */}
{useCamera && (
    <div className="flex flex-col items-center mt-4"> {/* Optional wrapper for centering */}
        {/* Container for the video feed */}
        <div ref={previewRef} className="relative border border-gray-300 rounded-lg overflow-hidden shadow-inner bg-black max-w-full w-full mx-auto" style={{ maxWidth: '640px' /* Or other max width */}}>
            {/* The video styling is handled by getCameraPreviewStyle */}
            <video ref={videoRef} style={getCameraPreviewStyle()} autoPlay playsInline muted className="block w-full h-auto" />
            {/* Video feed only inside this div */}
        </div>

        {/* Button and Error Display BELOW the video container */}
        <Button
            onClick={takePicture}
            disabled={!cameraDimensions} // Optionally disable if camera isn't ready
            className="my-3 bg-purple-600 hover:bg-purple-700 text-white py-2 px-5 rounded-lg shadow-md transition disabled:opacity-50"
        >
            Take Picture
        </Button>

        {error && ( // Show camera-specific errors here too
            <div className="text-red-600 font-semibold p-2 text-center">
                ⚠️ {error}
            </div>
        )}
    </div>
)}

                    {/* Image View & Bounding Boxes */}
                    {!useCamera && image && originalImageSize && (
                        // This container controls the max-width and holds the relative positioning context
                        <div
                            ref={imageContainerRef}
                            className="relative mt-4 border border-gray-300 rounded-lg overflow-hidden shadow-inner flex justify-center items-center bg-gray-100 mx-auto"
                             // Set a max-width for the container. Height will adjust based on content.
                             // You might want to adjust this value.
                            style={{ maxWidth: '800px', maxHeight: '70vh' }}
                        >
                             {/* Displayed Image Dimensions state controls the actual size */}
                             {displayedImageDimensions && (
                                 <Image
                                     src={image}
                                     alt="Processed"
                                     width={displayedImageDimensions.width} // Use calculated dimensions
                                     height={displayedImageDimensions.height}
                                     className="object-contain" // Crucial: Fits image within dimensions, maintains aspect ratio
                                     style={{
                                        display: 'block', // Prevents extra space below image
                                        maxWidth: '100%', // Ensure it respects container width
                                        maxHeight: '100%', // Ensure it respects container height
                                     }}
                                     priority // Consider adding priority if it's the main content
                                     unoptimized={image.startsWith('data:image')} // Good practice for base64 images
                                 />
                             )}


                            {/* All Bounding Boxes (Red) */}
                            {faces.map((face, index) => {
                                const scaledBox = getScaledBoundingBox(face);
                                return scaledBox ? (
                                    <motion.div
                                        key={`face-${index}`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute border-2 border-red-500 pointer-events-none" // pointer-events-none is important
                                        style={{
                                            top: `${scaledBox.top}px`,
                                            left: `${scaledBox.left}px`,
                                            width: `${scaledBox.width}px`,
                                            height: `${scaledBox.height}px`,
                                        }}
                                    />
                                ) : null;
                            })}

                            {/* Selected Bounding Box (Blue) */}
                            {selectedFace && (() => {
                                const scaledBox = getScaledBoundingBox(selectedFace);
                                return scaledBox ? (
                                    <motion.div
                                        key={`selected-${selectedFace.name}`} // Use a more stable key if possible
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute border-4 border-blue-500 pointer-events-none shadow-lg"
                                        style={{
                                            top: `${scaledBox.top}px`,
                                            left: `${scaledBox.left}px`,
                                            width: `${scaledBox.width}px`,
                                            height: `${scaledBox.height}px`,
                                        }}
                                    />
                                ) : null;
                            })()}

                            {/* Loading / Scanning Animation Overlay */}
                            {isLoading && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none z-20">
                                    <div className="scan-animation">
                                        {/* Keep your existing scan animation elements */}
                                        <div className="scan-line" />
                                        <div className="segment segment-1" />
                                        <div className="segment segment-2" />
                                        <div className="segment segment-3" />
                                        <div className="segment segment-4" />
                                        <div className="binary-overlay">
                                        {generateRandomBinaryPositions().map((item, idx) => (
                                            <span
                                            key={idx}
                                            className="binary-number"
                                            style={{
                                                top: `${item.top}%`,
                                                left: `${item.left}%`,
                                                animationDelay: item.animationDelay,
                                            }}
                                            >
                                            {item.num}
                                            </span>
                                        ))}
                                        </div>
                                         <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-white animate-spin" />
                                         <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-lg font-semibold">Scanning...</p>
                                    </div>
                                </div>
                            )}
                        </div> // End image container
                    )}

                    {/* Loading Indicator (when no image is shown yet) */}
                    {!useCamera && isLoading && !image && (
                        <div className="mt-6 flex items-center justify-center text-gray-600">
                            <Loader2 className="animate-spin mr-2" /> Processing image...
                        </div>
                    )}

                    {/* Error Message */}
                    {!useCamera && error && ( // Only show general errors if not in camera mode
                        <div className="mt-4 text-red-600 font-semibold text-center bg-red-100 p-3 rounded-md border border-red-300">
                            ⚠️ {error}
                        </div>
                    )}

                     {/* Placeholder when no image/camera is active */}
                     {!image && !useCamera && !isLoading && !error && (
                         <div className="mt-6 text-center text-gray-500 italic h-40 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                             Upload an image or use the camera to begin.
                         </div>
                     )}

                </CardContent>
            </Card>
        </div>
    );
}