from deepface import DeepFace
import os
import pandas as pd
import numpy as np
import cv2
from typing import Dict, Any, Tuple, List
models = [
  "VGG-Face", 
  "Facenet", 
  "Facenet512", 
  "OpenFace", 
  "DeepFace", 
  "DeepID", 
  "ArcFace", 
  "Dlib", 
  "SFace",
  "GhostFaceNet"
]
MODEL = "Facenet512"

def add_known_faces():
    add_face_to_deepface_db("imgTest/victor.jpg", "Victor")

    add_face_to_deepface_db("imgTest/romain.jpg", "Romain")

    add_face_to_deepface_db("imgTest/mathilde.jpg", "Mathilde")

    add_face_to_deepface_db("imgTest/lilian.jpg", "Lilian")

    add_face_to_deepface_db("imgTest/leo.jpg", "Leo")

    add_face_to_deepface_db("imgTest/dimitar.jpg", "Dimitar")

    add_face_to_deepface_db("imgTest/maxence.jpg", "Maxence")

    add_face_to_deepface_db("imgTest/remi.jpg", "Rémi")


def get_face_embedding(
    image_path: str,
    model_name: str = MODEL,
    detector_backend: str = "retinaface"
) -> np.ndarray:
    """
    Extract face embedding from an image using DeepFace
    
    Args:
        image_path (str): Path to the image file
        model_name (str): Name of the embedding model to use
        detector_backend (str): Name of the face detector to use
    
    Returns:
        np.ndarray: Face embedding vector
    """
    embedding_objs = DeepFace.represent(
        img_path=image_path,
        model_name=model_name,
        detector_backend=detector_backend,
        enforce_detection=True,
        align=True
    )
    
    if not embedding_objs:
        raise ValueError("No face detected in the image")
    if len(embedding_objs) > 1:
        raise ValueError("Multiple faces detected in the image")
        
    return np.array(embedding_objs[0]["embedding"])

def add_face_to_deepface_db(
    image_path: str,
    name: str,
    database_path: str = "faceEncodingDeepface.csv",
    model_name: str = MODEL,
    detector_backend: str = "retinaface"
) -> bool:
    """
    Add a face embedding to the database
    
    Args:
        image_path (str): Path to the image file
        name (str): Name of the person
        database_path (str): Path to the CSV database file
        model_name (str): Face recognition model to use
        detector_backend (str): Face detection model to use
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Check if image file exists
        if not os.path.exists(image_path):
            print(f"Error: Image file '{image_path}' not found")
            return False
        
        # Get face embedding
        try:
            embedding = get_face_embedding(
                image_path,
                model_name=model_name,
                detector_backend=detector_backend
            )
        except Exception as e:
            print(f"Error extracting face embedding: {str(e)}")
            return False
        
        # Create or load the database
        if os.path.exists(database_path):
            df = pd.read_csv(database_path)
            
            # Check if name already exists
            if name in df['name'].values:
                print(f"Warning: Name '{name}' already exists in database. Adding as additional sample.")
        else:
            # Create new DataFrame if file doesn't exist
            df = pd.DataFrame(columns=['name'] + [f'embedding_{i}' for i in range(len(embedding))])
        
        # Prepare new row
        new_row = {'name': name}
        for i, value in enumerate(embedding):
            new_row[f'embedding_{i}'] = value
        
        # Add new row to DataFrame
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        
        # Save to CSV
        df.to_csv(database_path, index=False)
        print(f"Successfully added {name} to the database")
        return True
        
    except Exception as e:
        print(f"Error adding face to database: {str(e)}")
        return False

def load_known_faces(
    database_path: str = "faceEncodingDeepface.csv"
) -> Tuple[List[np.ndarray], List[str]]:
    """
    Load known faces from the database
    
    Args:
        database_path (str): Path to the CSV database file
    
    Returns:
        tuple: (list of embeddings, list of names)
    """
    if not os.path.exists(database_path):
        return [], []
    
    df = pd.read_csv(database_path)
    names = df['name'].tolist()
    
    # Reconstruct face embeddings from the CSV
    embeddings = []
    embedding_cols = [col for col in df.columns if col.startswith('embedding_')]
    for _, row in df.iterrows():
        embedding = [row[col] for col in embedding_cols]
        embeddings.append(np.array(embedding))
    
    return embeddings, names

def recognize_faces_deepface(
    image_path: str,
    database_path: str = "faceEncodingDeepface.csv",
    model_name: str = MODEL,
    detector_backend: str = "retinaface",
    distance_metric: str = "cosine",
    threshold: float = 0.70
) -> Dict[str, Any]:
    """
    Recognize faces in an image using DeepFace
    
    Args:
        image_path (str): Path to the image to analyze
        database_path (str): Path to the CSV database file
        model_name (str): Face recognition model to use
        detector_backend (str): Face detection model to use
        distance_metric (str): Distance metric for face comparison
        threshold (float): Recognition threshold (lower = more strict)
    
    Returns:
        dict: Dictionary with bounding box, name, and confidence for each recognized face
    """
    results = {}
    print("\n=== Starting DeepFace Recognition ===")
    
    try:
        # Load known faces
        print("📚 Loading known faces from database...")
        known_embeddings, known_names = load_known_faces(database_path)
        if not known_embeddings:
            print("No known faces found in database")
            return results
        print(f"✅ Loaded {len(known_names)} known faces")
        
        # Detect and get information about faces in the image
        print("🔍 Detecting faces in image...")
        faces = DeepFace.extract_faces(
            img_path=image_path,
            enforce_detection=True,
            detector_backend=detector_backend
        )
        print(f"✅ Found {len(faces)} faces")
        
        # Get embeddings for all faces in the image
        embeddings = DeepFace.represent(
            img_path=image_path,
            model_name=model_name,
            detector_backend=detector_backend,
            enforce_detection=True,
            align=True
        )
        
        # Process each detected face
        for i, (face_data, embedding_obj) in enumerate(zip(faces, embeddings)):
            print(f"\n👤 Processing face {i+1}")
            
            try:
                facial_area = face_data['facial_area']
                embedding = np.array(embedding_obj["embedding"])
                
                # Compare with known embeddings
                best_match_name = None
                best_match_distance = float('inf')
                
                for db_embedding, name in zip(known_embeddings, known_names):
                    if distance_metric == "cosine":
                        distance = 1 - np.dot(embedding, db_embedding) / (
                            np.linalg.norm(embedding) * np.linalg.norm(db_embedding)
                        )
                    elif distance_metric == "euclidean":
                        distance = np.linalg.norm(embedding - db_embedding)
                    else:
                        raise ValueError(f"Unsupported distance metric: {distance_metric}")
                    
                    if distance < best_match_distance:
                        best_match_distance = distance
                        best_match_name = name
                
                # Convert distance to confidence
                confidence = 1 - best_match_distance
                
                if confidence >= (1 - threshold):
                    face_data = {
                        'bounding_box': (
                            facial_area['y'],
                            facial_area['x'] + facial_area['w'],
                            facial_area['y'] + facial_area['h'],
                            facial_area['x']
                        ),
                        'name': best_match_name,
                        'confidence': float(confidence)
                    }
                    
                    # Update results
                    if best_match_name not in results or confidence > results[best_match_name]['confidence']:
                        results[best_match_name] = face_data
                        print(f"✅ Matched with {best_match_name} (confidence: {confidence:.2%})")
                else:
                    print(f"❌ Best match below threshold (confidence: {confidence:.2%})")
                    
            except Exception as e:
                print(f"Error processing face {i+1}: {str(e)}")
                continue
                
    except Exception as e:
        print(f"Error in recognize_faces_deepface: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
    print(f"\n✅ Recognition complete. Found {len(results)} matches.")
    return results




