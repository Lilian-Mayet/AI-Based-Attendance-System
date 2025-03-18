"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Loader2, Upload } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Face {
  name: string
  bounding_box: [number, number, number, number]
  confidence: number
}

export default function FaceRecognition() {
  const [image, setImage] = useState<string | null>(null)
  const [faces, setFaces] = useState<Face[]>([])
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = async (event) => {
        if (event.target?.result) {
          const imageDataUrl = event.target.result as string
          setImage(imageDataUrl)
          setIsLoading(true)
          setError(null)

          // Get original image dimensions
          const img = new window.Image()
          img.src = imageDataUrl
          img.onload = () => {
            setOriginalImageSize({ width: img.width, height: img.height })
          }

          // Send image to backend
          const formData = new FormData()
          formData.append("file", file)

          try {
            const response = await fetch("http://127.0.0.1:8000/recognize_faces/", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              throw new Error("Failed to recognize faces")
            }

            const data = await response.json()
            setFaces(data.faces || [])
          } catch (error) {
            console.error("Error:", error)
            setError("Failed to recognize faces. Please try again.")
          } finally {
            setIsLoading(false)
          }
        }
      }

      reader.readAsDataURL(file)
    }
  }, [])

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const getScaledBoundingBox = useCallback(
    (face: Face) => {
      if (!imageRef.current || !originalImageSize) return { top: 0, left: 0, width: 0, height: 0 }

      const displayedWidth = imageRef.current.clientWidth
      const displayedHeight = imageRef.current.clientHeight

      const scaleX = displayedWidth / originalImageSize.width
      const scaleY = displayedHeight / originalImageSize.height

      return {
        top: face.bounding_box[0] * scaleY,
        left: face.bounding_box[3] * scaleX,
        width: (face.bounding_box[1] - face.bounding_box[3]) * scaleX,
        height: (face.bounding_box[2] - face.bounding_box[0]) * scaleY,
      }
    },
    [originalImageSize],
  )

  return (
    <Card className="w-full max-w-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardTitle className="text-2xl font-bold">Face Recognition</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            ref={fileInputRef}
          />
          <Button
            onClick={handleButtonClick}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            <Upload className="mr-2 h-4 w-4" /> Upload Image
          </Button>
        </div>
        {image && (
          <div className="relative rounded-lg overflow-hidden shadow-lg">
            <Image
              ref={imageRef}
              src={image}
              alt="Uploaded image"
              width={600}
              height={400}
              className="w-full h-auto"
            />
            <AnimatePresence>
              {faces.map((face) => {
                const scaledBox = getScaledBoundingBox(face)
                return (
                  <motion.div
                    key={face.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: "absolute",
                      ...scaledBox,
                      border: "2px solid #10B981",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      className="absolute -top-7 left-0 bg-emerald-500 text-white px-2 py-1 text-xs font-semibold rounded-t-md"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {face.name} ({Math.round(face.confidence * 100)}%)
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center mt-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-600">Processing image...</span>
          </div>
        )}
        {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">{error}</div>}
        {faces.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Detected Faces:</h2>
            <ul className="space-y-2">
              {faces.map((face) => (
                <li
                  key={face.name}
                  className="flex items-center justify-between bg-gray-100 rounded-md p-3 text-sm text-gray-700"
                >
                  <span className="font-medium">{face.name}</span>
                  <span className="bg-emerald-500 text-white px-2 py-1 rounded-full text-xs">
                    {Math.round(face.confidence * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}