import face_recognition
import cv2
import numpy as np
import os
import pandas as pd
from huggingface_hub import hf_hub_download
from ultralytics import YOLO
from supervision import Detections



def process_image(known_image_path, test_image_path, known_face_name="Matteo"):
    # Load the known image and compute its encoding
    known_image = face_recognition.load_image_file(known_image_path)
    known_encoding = face_recognition.face_encodings(known_image)[0]

    # Load the test image
    test_image = face_recognition.load_image_file(test_image_path)
    # Convert the image from BGR color to RGB color
    rgb_test_image = cv2.cvtColor(test_image, cv2.COLOR_BGR2RGB)

    # Find all face locations in the test image
    face_locations = face_recognition.face_locations(test_image)
    print(face_locations)
    # Get encodings for all detected faces
    face_encodings = face_recognition.face_encodings(test_image, face_locations)

    # Create a copy of the image to draw on
    result_image = cv2.cvtColor(test_image, cv2.COLOR_RGB2BGR)

    # Process each detected face
    for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
        # Check if the face matches our known face
        matches = face_recognition.compare_faces([known_encoding], face_encoding)
        is_match = matches[0]

        # Set color and name based on match result
        if is_match:
            color = (0, 255, 0)  # Green for match
            name = known_face_name
        else:
            color = (0, 0, 255)  # Red for unknown
            name = "Unknown"

        # Draw the box
        cv2.rectangle(result_image, (left, top), (right, bottom), color, 2)

        # Draw the name
        # Calculate text size and position
        font = cv2.FONT_HERSHEY_DUPLEX
        font_scale = 0.75
        thickness = 1
        text_size = cv2.getTextSize(name, font, font_scale, thickness)[0]
        
        # Draw background rectangle for text
        cv2.rectangle(result_image, 
                     (left, top - text_size[1] - 10), 
                     (left + text_size[0], top), 
                     color, 
                     cv2.FILLED)
        
        # Draw text
        cv2.putText(result_image, 
                    name, 
                    (left, top - 5), 
                    font,
                    font_scale, 
                    (255, 255, 255),  # White text
                    thickness)

    # Display the result
    cv2.imshow('Result', result_image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

def detect_faces(image, window_size=(500,500), step_size=250):
    """
    Detect faces in an image using YOLOv8 and convert coordinates to face_recognition format
    Returns coordinates in (top, right, bottom, left) format as required by face_recognition
    """
    model_path = hf_hub_download(repo_id="arnabdhar/YOLOv8-Face-Detection", filename="model.pt")
    face_model = YOLO(model_path)
    height, width, _ = image.shape
    detections = []

    # Run detection on the full image instead of sliding window
    output = face_model(image)
    results = Detections.from_ultralytics(output[0])

    # Convert YOLO format (x1, y1, x2, y2) to face_recognition format (top, right, bottom, left)
    for (x_min, y_min, x_max, y_max) in results.xyxy:
        top = int(y_min)
        right = int(x_max)
        bottom = int(y_max)
        left = int(x_min)
        detections.append((top, right, bottom, left))

    print(f"Detected {len(detections)} faces with coordinates: {detections}", flush=True)
    return detections



def add_face_to_database(image_path, name, database_path="facesEncoding.csv"):
    
    """
    Add a face encoding to the database with error checking
    
    Args:
        image_path (str): Path to the image file
        name (str): Name of the person
        database_path (str): Path to the CSV database file
    
    """
    # Check if image file exists
    if not os.path.exists(image_path):
        print("Error: Image file '{image_path}' not found")
        return False
    
    # Load and check the image
    try:
        image = face_recognition.load_image_file(image_path)
    except Exception as e:
        print(f"Error loading image: {str(e)}")
        return False
    
    # Detect faces
    face_locations = face_recognition.face_locations(image)
    
    # Check number of faces
    if len(face_locations) == 0:
        print("No face detected in the image")
        return False
    elif len(face_locations) > 1:
        print(f"Multiple faces ({len(face_locations)}) detected in the image. Please use an image with only one face")
        return False
    
    # Get face encoding
    face_encoding = face_recognition.face_encodings(image, face_locations)[0]
    
    # Create or load the database
    if os.path.exists(database_path):
        try:
            df = pd.read_csv(database_path)
            
            # Check if name already exists
            if name in df['name'].values:
                print(f"Error: Name '{name}' already exists in the database")
        except Exception as e:
            print(f"Error reading database: {str(e)}")
    else:
        # Create new DataFrame if file doesn't exist
        df = pd.DataFrame(columns=['name'] + [f'encoding_{i}' for i in range(128)])
    
    # Prepare new row
    new_row = {'name': name}
    for i, value in enumerate(face_encoding):
        new_row[f'encoding_{i}'] = value
    
    # Add new row to DataFrame
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    
    # Save to CSV
    try:
        df.to_csv(database_path, index=False)
        print(f"Successfully added {name} to the database")
        return False
    except Exception as e:
        print(f"Error saving to database: {str(e)}")


def load_known_faces(database_path="facesEncoding.csv"):
    """
    Load known faces from the database
    
    Returns:
        tuple: (list of encodings, list of names)
    """
    if not os.path.exists(database_path):
        return [], []
    
    df = pd.read_csv(database_path)
    names = df['name'].tolist()
    
    # Reconstruct face encodings from the CSV
    encodings = []
    for _, row in df.iterrows():
        encoding = [row[f'encoding_{i}'] for i in range(128)]
        encodings.append(np.array(encoding))
    
    return encodings, names


    

def recognize_facesAPI(image_path, database_path="facesEncoding.csv", tolerance=0.62):
    """
    Process an image and identify all faces by comparing them with the database
    
    Args:
        image_path (str): Path to the image to analyze
        database_path (str): Path to the CSV database file
        tolerance (float): Face recognition tolerance (lower = more strict)
    
    Returns:
        dict: Dictionary with bounding box, name, and confidence for each recognized face
    """
    results = {}  # Initialize results dictionary
    print("\n=== Starting Face Recognition ===", flush=True)
    
    try:
        # Load known faces
        print(f"📚 Loading known faces from {database_path}...", flush=True)
        known_encodings, known_names = load_known_faces(database_path)
        print(f"✅ Loaded {len(known_names)} known faces: {known_names}", flush=True)
          
        if not known_encodings:
            print("❌ No known faces found in database", flush=True)
            return results


        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        # Note: image should already be in RGB format from the API endpoint
        print("🔍 Detecting faces in image...", flush=True)
        face_locations = detect_faces(image)
        print(f"✅ Number of detected faces: {len(face_locations)}", flush=True)



        print(f"🔍 Original image shape: {image.shape}, dtype: {image.dtype}", flush=True)


        # Get encodings for all detected faces
        print("🧬 Generating face encodings...", flush=True)
        face_encodings = face_recognition.face_encodings(image, face_locations, num_jitters=2, model="large")
        print(f"✅ Generated encodings for {len(face_encodings)} faces", flush=True)
        
        confidence_dict = {}
        # Process each detected face
        print("🔄 Comparing faces with known faces...", flush=True)
        for i, ((top, right, bottom, left), face_encoding) in enumerate(zip(face_locations, face_encodings)):
            print(f"\n👤 Processing face {i+1}:", flush=True)
            # Compare with all known faces
            matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=tolerance)
            print(f"  - Match results: {matches}", flush=True)
            
            # Calculate face distances for each known face
            face_distances = face_recognition.face_distance(known_encodings, face_encoding)
            print(f"  - Face distances: {face_distances}", flush=True)
            
            # If there's a match, use the closest one
            if True in matches:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    confidence = 1 - face_distances[best_match_index]
                    matched_name = known_names[best_match_index]
                    print(f"  ✅ Matched with {matched_name} (confidence: {confidence:.2%})", flush=True)
                    
                    # Store the highest confidence for each name
                    if matched_name not in confidence_dict or confidence > confidence_dict[matched_name][0]:
                        confidence_dict[matched_name] = (confidence, (top, right, bottom, left))
            else:
                print("  ❌ No match found", flush=True)

        # Create results dictionary with face data
        print("\n📝 Creating results...", flush=True)
        for name, (confidence, (top, right, bottom, left)) in confidence_dict.items():
            face_data = {
                'bounding_box': (top, right, bottom, left),
                'name': name,
                'confidence': float(confidence)  # Convert numpy float to Python float
            }
            results[name] = face_data
            print(f"✅ Added face: {name} with confidence: {confidence:.2%}", flush=True)

    except Exception as e:
        print(f"❌ Error in recognize_facesAPI: {str(e)}", flush=True)
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}", flush=True)
        return results  # Return empty results dict on error

    print(f"\n✅ Recognition complete. Found {len(results)} faces.", flush=True)
    return results

# Usage example
test_image_path = "imgTest/lilian.jpg"

