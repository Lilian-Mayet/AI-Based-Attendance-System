from deepface import DeepFace
import os
import pandas as pd
import numpy as np
import cv2
import psycopg2
from typing import Dict, Any, Tuple, List
import logging
from dotenv import load_dotenv
load_dotenv()
import json
import time
import concurrent.futures
from psycopg2.extras import RealDictCursor

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
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def add_known_faces():
    add_face_to_deepface_db("imgTest/victor.jpg", "Victor")

    add_face_to_deepface_db("imgTest/romain.jpg", "Romain")

    add_face_to_deepface_db("imgTest/mathilde.jpg", "Mathilde")

    add_face_to_deepface_db("imgTest/lilian.jpg", "Lilian")

    add_face_to_deepface_db("imgTest/leo.jpg", "Leo")

    add_face_to_deepface_db("imgTest/dimitar.jpg", "Dimitar")

    add_face_to_deepface_db("imgTest/maxence.jpg", "Maxence")

    add_face_to_deepface_db("imgTest/remi.jpg", "Rémi")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            dbname=os.getenv("DB_NAME"),
            port=os.getenv("DB_PORT")
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise

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


def add_face_to_db(
    image_path: str,
    name: str,
    model_name: str = MODEL,
    detector_backend: str = "retinaface"
) -> bool:
    """
    Add a face embedding to the PostgreSQL database
    
    Args:
        image_path (str): Path to the image file
        name (str): Name of the person
        model_name (str): Face recognition model to use
        detector_backend (str): Face detection model to use
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        conn = get_db_connection()
        
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
            if isinstance(embedding, np.ndarray):
                embedding = embedding.tolist()  # Convert NumPy array to list for JSON serialization
        except Exception as e:
            print(f"Error extracting face embedding: {str(e)}")
            return False
        
        cursor = conn.cursor()
        
        # Check for the next available studentID
        cursor.execute("""
            SELECT COALESCE(MAX(studentID) + 1, 1) FROM Student;
        """)
        student_id = cursor.fetchone()[0]
        
        # Insert student into Student table
        cursor.execute("""
            INSERT INTO Student (studentID, name) 
            VALUES (%s, %s) 
            ON CONFLICT (studentID) DO NOTHING;
        """, (student_id, name))
        
        # Convert embedding to JSON
        face_encoding_json = json.dumps(embedding)
        
        # Insert or update face encoding into FaceEncoding table
        cursor.execute("""
            INSERT INTO FaceEncoding (studentID, faceEncoding) 
            VALUES (%s, %s) 
            ON CONFLICT (studentID) DO UPDATE SET faceEncoding = EXCLUDED.faceEncoding;
        """, (student_id, face_encoding_json))
        
        # Commit changes
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"Successfully added or updated face encoding for {name} with ID {student_id}")
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

        startTime = time.time()

        faces = DeepFace.extract_faces(
            img_path=image_path,
            enforce_detection=True,
            detector_backend=detector_backend
        )
        endTime = time.time()
        timePassed = endTime-startTime
        print("Time passed = "+str(timePassed))
        print(f"✅ Found {len(faces)} faces")
        
        startTime = time.time()
        # Get embeddings for all faces in the image
        embeddings = DeepFace.represent(
            img_path=image_path,
            model_name=model_name,
            detector_backend=detector_backend,
            enforce_detection=True,
            align=True
        )
        endTime = time.time()
        timePassed = endTime-startTime
        print("Time passed for embeddings = "+str(timePassed)) 
        

        startTime = time.time()
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
                    # Assign a placeholder name for strangers
                    stranger_id = f"stranger_{len([k for k in results if k.startswith('stranger_')]) + 1}"
                    face_data = {
                        'bounding_box': (
                            facial_area['y'],
                            facial_area['x'] + facial_area['w'],
                            facial_area['y'] + facial_area['h'],
                            facial_area['x']
                        ),
                        'name': stranger_id,
                        'confidence': float(confidence)
                    }
                    results[stranger_id] = face_data
                    print(f"❓ Stranger detected: {stranger_id} (confidence: {confidence:.2%})")
                    
            except Exception as e:
                print(f"Error processing face {i+1}: {str(e)}")
                continue

        endTime = time.time()
        timePassed = endTime-startTime
        print("Time passed for processing= "+str(timePassed)) 
    except Exception as e:
        print(f"Error in recognize_faces_deepface: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
    print(f"\n✅ Recognition complete. Found {len(results)} matches.")
    return results


def load_known_faces_from_db() -> Tuple[Dict[Tuple[float, ...], str]]:
    """
    Load known face encodings and student names from the database.

    Returns:
        Dict[Tuple[float, ...], str]: A dictionary where keys are face embeddings
                               (as tuples) and values are the
                               corresponding student names.
    """
    known_faces = {}
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Fetch student IDs and their encodings
        cursor.execute("SELECT studentid, faceencoding FROM faceencoding")
        encoding_rows = cursor.fetchall()

        # Fetch student IDs and their names
        student_name_map = {}
        cursor.execute("SELECT studentid, name FROM student")
        student_rows = cursor.fetchall()
        for row in student_rows:
            student_name_map[str(row['studentid'])] = row['name']

        for row in encoding_rows:
            student_id = str(row['studentid'])
            encoding_str = row['faceencoding']
            try:
                # Convert the string representation of the list to an actual list of floats
                encoding_list = json.loads(encoding_str)
                encoding_array = np.array(encoding_list, dtype=np.float32)
                # Convert NumPy array to a tuple to make it hashable
                encoding_tuple = tuple(encoding_array.flatten().tolist())
                if student_id in student_name_map:
                    known_faces[encoding_tuple] = student_name_map[student_id]
                else:
                    print(f"Warning: Student ID {student_id} found in faceencoding but not in student table.")
            except json.JSONDecodeError as e:
                print(f"Error decoding face encoding for student {student_id}: {e}")
            except Exception as e:
                print(f"Error processing face encoding for student {student_id}: {e}")

    except Exception as e:
        print(f"Error loading known faces from database: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    return known_faces

def recognize_faces_deepface_parralelisation(
    image_path: str,
    model_name: str = MODEL,
    detector_backend: str = "retinaface",
    distance_metric: str = "cosine",
    threshold: float = 0.40
) -> Dict[str, Any]:
    """
    Recognize faces in an image using DeepFace, fetching known faces and names from the database.

    Args:
        image_path (str): Path to the image to analyze
        model_name (str): Face recognition model to use
        detector_backend (str): Face detection model to use
        distance_metric (str): Distance metric for face comparison
        threshold (float): Recognition threshold (lower = more strict)

    Returns:
        dict: Dictionary with bounding box, name (student name or 'stranger'),
              and confidence for each recognized face.
    """
    results = {}
    print("\n=== Starting DeepFace Recognition (Database with Names) ===")

    try:
        # Load known faces and names from the database
        print("📚 Loading known faces and names from database...")
        known_faces = load_known_faces_from_db()
        if not known_faces:
            print("No known faces found in the database.")
            return results
        print(f"✅ Loaded {len(known_faces)} known faces.")

        known_embeddings = list(known_faces.keys())
        known_names = list(known_faces.values())

        # Detect and get information about faces in the image
        print("🔍 Detecting faces in image...")
        startTime = time.time()

        with concurrent.futures.ThreadPoolExecutor() as executor:
            face_future = executor.submit(
                DeepFace.extract_faces,
                img_path=image_path,
                enforce_detection=True,
                detector_backend=detector_backend
            )

            embedding_future = executor.submit(
                DeepFace.represent,
                img_path=image_path,
                model_name=model_name,
                detector_backend=detector_backend,
                enforce_detection=True,
                align=True
            )

        faces = face_future.result()
        embeddings = embedding_future.result()
        endTime = time.time()
        timePassed = endTime - startTime
        print(f"Time passed for detection and representation: {timePassed:.4f} seconds")

        startTime = time.time()
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
                        print(f"✅ Matched with Student {best_match_name} (confidence: {confidence:.2%})")
                else:
                    # Assign a placeholder name for strangers
                    stranger_id = f"stranger_{len([k for k in results if k.startswith('stranger_')]) + 1}"
                    face_data = {
                        'bounding_box': (
                            facial_area['y'],
                            facial_area['x'] + facial_area['w'],
                            facial_area['y'] + facial_area['h'],
                            facial_area['x']
                        ),
                        'name': stranger_id,
                        'confidence': float(confidence)
                    }
                    results[stranger_id] = face_data
                    print(f"❓ Stranger detected: {stranger_id} (confidence: {confidence:.2%})")

            except Exception as e:
                print(f"Error processing face {i+1}: {str(e)}")
                continue

        endTime = time.time()
        timePassed = endTime - startTime
        print(f"Time passed for recognition: {timePassed:.4f} seconds")

    except Exception as e:
        print(f"Error in recognize_faces_deepface: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

    print(f"\n✅ Recognition complete. Found {len(results)} matches.")
    return results
#recognize_faces_deepface(image_path="imgTest/class.jpg")
#recognize_faces_deepface_parralelisation(image_path="imgTest/class.jpg")