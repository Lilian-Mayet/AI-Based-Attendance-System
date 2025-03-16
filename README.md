📸 AI-Based Automated Attendance System

🎯 Overview

This project is an AI-powered automated attendance system that uses face recognition to streamline classroom attendance. Teachers can log in, access their courses, and, with a connected classroom camera, automatically detect present students, identify missing students, and flag any unauthorized presence.

🚀 Features

Facial Recognition: Detect and identify students based on facial features.

Automated Attendance: Track students' presence in real-time.

Missing Students Detection: Instantly see who is absent.

Unexpected Presence Alerts: Identify unknown or unauthorized individuals in the classroom.

Interactive Interface: Click on detected faces to highlight them in the image.

Confidence Scores: Displays the probability of recognition accuracy.

Bounding Box Visualization: Draws boxes around recognized faces.

Clear Detection: Easily remove highlighted boxes when needed.

🏗️ Technologies Used

React (Next.js): Frontend interface for real-time attendance tracking.

DeepFace: Face recognition backend powered by deep learning.

FastAPI: Backend for processing facial data.

Framer Motion: Smooth UI animations for a better experience.

📷 How It Works

Upload an image or connect to a live camera feed.

The AI detects faces and compares them with the student database.

Expected students are highlighted in green, while unknown students are flagged.

Clicking on a student's name will highlight their bounding box in the image.

The Clear Boxes button removes all bounding boxes.

