from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import cv2
import numpy as np
from io import BytesIO
from typing import List
from ultralytics import YOLO
from supervision import Detections
import traceback
import sys

from face_lookalike import recognize_facesAPI

from face_lookalike_deepface import recognize_faces_deepface

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/recognize_faces/", methods=['POST'])
def recognize_faces_endpoint():
    print("\n=== New Request Received ===", flush=True)
    try:
        if 'file' not in request.files:
            print(" No file in request", flush=True)
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        print(f" Received file: {file.filename}", flush=True)
        
        # Read the file contents
        file_bytes = file.read()
        np_img = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        filename = "temp.jpg"
        cv2.imwrite(filename, img)
        
        if img is None:
            print(" Failed to decode image", flush=True)
            return jsonify({"error": "Failed to decode image"}), 400

        print(f" Image decoded successfully. Shape: {img.shape}", flush=True)

        # Convert to RGB
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        print(" Starting face recognition...", flush=True)
        
        # Check if database exists and has faces
        try:
            with open("facesEncoding.csv", "r") as f:
                content = f.read()
                print(f" Database content preview: {content[:100]}...", flush=True)
        except Exception as e:
            print(f" Error reading database: {str(e)}", flush=True)
        
        #results = recognize_facesAPI(filename)
        results = recognize_faces_deepface(filename)
        print(f" Face recognition results: {results}", flush=True)
        
        # Convert dictionary to array
        faces_array = []
        for name, face_data in results.items():
            face_data['name'] = name  # Add name to the face data
            faces_array.append(face_data)

        print(f" Returning {len(faces_array)} faces", flush=True)
        print(f" Response data: {{'faces': faces_array}}", flush=True)
        return jsonify({"faces": faces_array})

    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f" Error in recognize_faces_endpoint: {str(e)}", flush=True)
        print(f" Traceback: {error_traceback}", flush=True)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500



if __name__ == '__main__':
    # Force stdout to flush immediately
    sys.stdout.reconfigure(line_buffering=True)
    print(" Starting Flask server...", flush=True)
    app.run(debug=True, port=8000)