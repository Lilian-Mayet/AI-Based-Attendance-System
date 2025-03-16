from deepface import DeepFace
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import time
from mpl_toolkits.mplot3d import Axes3D
from typing import Dict, List
from datetime import datetime
from face_lookalike import detect_faces
import face_recognition
import cv2

# Define all available models
MODELS = [
    "face_recognition" ,
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

# List of non-Matteo images for misidentification check
NON_MATTEO_IMAGES = [
    "imgTest/victor.jpg", "imgTest/romain.jpg", "imgTest/mathilde.jpg",
    "imgTest/lilian.jpg", "imgTest/leo.jpg", "imgTest/dimitar.jpg",
    "imgTest/maxence.jpg", "imgTest/remi.jpg"
]


def get_face_recognition_embedding(image_path: str) -> tuple[List[np.ndarray], float, Dict]:
    """Get face embedding using face_recognition library."""
    try:
        start_time = time.time()
        
        # Detect faces using YOLOv8
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        print(1)
        face_locations = detect_faces(image)
        print(2)
        
        if not face_locations:
            raise ValueError("No face detected")
        
        # Generate encodings
        face_encodings = face_recognition.face_encodings(image, face_locations, num_jitters=2, model="large")
        elapsed_time = time.time() - start_time
        
        if not face_encodings:
            raise ValueError("Could not generate encodings for detected faces")
        
        return face_encodings, elapsed_time, {
            "faces_detected": len(face_encodings),
            "time_per_face": elapsed_time / len(face_encodings)
        }
        
    except Exception as e:
        print(f"Error processing image with face_recognition: {str(e)}")
        return [], 0.0, {"faces_detected": 0, "time_per_face": 0.0}

def get_embedding(image_path: str, model_name: str) -> tuple[List[np.ndarray], float, Dict]:
    """Get face embedding for a single image."""
    if model_name == "face_recognition":
        return get_face_recognition_embedding(image_path)
    
    try:
        start_time = time.time()
        embedding_objs = DeepFace.represent(
            img_path=image_path,
            model_name=model_name,
            detector_backend="retinaface",
            enforce_detection=True,
            align=True
        )
        elapsed_time = time.time() - start_time
        
        if not embedding_objs:
            raise ValueError("No face detected")
            
        return [np.array(obj["embedding"]) for obj in embedding_objs], elapsed_time, {
            "faces_detected": len(embedding_objs),
            "time_per_face": elapsed_time / len(embedding_objs)
        }
        
    except Exception as e:
        print(f"Error getting embedding for {image_path} with model {model_name}: {str(e)}")
        return [], 0.0, {"faces_detected": 0, "time_per_face": 0.0}

def calculate_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Calculate cosine similarity between two embeddings."""
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

def evaluate_models() -> tuple[Dict[str, Dict[str, List]], List[Dict]]:
    """Evaluate all models and return their metrics."""
    original_path = "imgTest/matteoOG.jpg"
    results = {model: {
        "scores": [], 
        "times": [], 
        "embedding_lengths": [], 
        "misidentification_scores": [],
        "faces_detected": [],
        "time_per_face": []
    } for model in MODELS}
    
    # List to store all results for CSV
    benchmark_results = []
    
    for model in MODELS:
        print(f"\n=== Evaluating {model} ===")
        try:
            # Get embeddings for reference image
                

            original_embeddings, time_taken, metrics = get_embedding(original_path, model)
            if not original_embeddings:
                print(f"Skipping {model} - couldn't get original embedding")
                continue
            
            original_embedding = original_embeddings[0]
            embedding_length = len(original_embedding)
            
            # Store reference image metrics
            benchmark_results.append({
                "timestamp": datetime.now().isoformat(),
                "model": model,
                "image_type": "reference",
                "image_path": original_path,
                "similarity_score": 1.0,  # Self-similarity
                "computation_time": time_taken,
                "embedding_length": embedding_length,
                "faces_detected": metrics["faces_detected"],
                "time_per_face": metrics["time_per_face"]
            })
            
            # Process Matteo test images
            for i in range(1, 12):
                test_path = f"imgTest/matteo{i}.jpg"
                if not os.path.exists(test_path):
                    print(f"Warning: {test_path} not found")
                    continue
                
                test_embeddings, time_taken, metrics = get_embedding(test_path, model)
                
                if not test_embeddings:
                    print(f"No faces found in {test_path}")
                    similarity = 0.0
                else:
                    similarities = [calculate_similarity(original_embedding, test_emb) for test_emb in test_embeddings]
                    similarity = max(similarities)
                
                results[model]["scores"].append(similarity)
                results[model]["times"].append(time_taken)
                results[model]["embedding_lengths"].append(embedding_length)
                results[model]["faces_detected"].append(metrics["faces_detected"])
                results[model]["time_per_face"].append(metrics["time_per_face"])
                
                benchmark_results.append({
                    "timestamp": datetime.now().isoformat(),
                    "model": model,
                    "image_type": "test_matteo",
                    "image_path": test_path,
                    "similarity_score": similarity,
                    "computation_time": time_taken,
                    "embedding_length": embedding_length,
                    "faces_detected": metrics["faces_detected"],
                    "time_per_face": metrics["time_per_face"]
                })
                
                print(f"Image {i}: Similarity = {similarity:.3f}, Time = {time_taken:.3f}s")
            
            # Process non-Matteo images
            for non_matteo in NON_MATTEO_IMAGES:
                test_embeddings, time_taken, metrics = get_embedding(non_matteo, model)
                
                if not test_embeddings:
                    similarity = 0.0
                else:
                    similarities = [calculate_similarity(original_embedding, test_emb) for test_emb in test_embeddings]
                    similarity = max(similarities)
                
                results[model]["misidentification_scores"].append(similarity)
                
                benchmark_results.append({
                    "timestamp": datetime.now().isoformat(),
                    "model": model,
                    "image_type": "non_matteo",
                    "image_path": non_matteo,
                    "similarity_score": similarity,
                    "computation_time": time_taken,
                    "embedding_length": embedding_length,
                    "faces_detected": metrics["faces_detected"],
                    "time_per_face": metrics["time_per_face"]
                })
                
                print(f"Non-Matteo Image {non_matteo}: Similarity = {similarity:.3f}")
                
        except Exception as e:
            print(f"Error processing model {model}: {str(e)}")
    
    return results, benchmark_results

def plot_additional_results(results: Dict[str, Dict[str, List]]):
    """Plot misidentification rates."""
    plt.figure(figsize=(15, 10))
    x = range(len(NON_MATTEO_IMAGES))
    for model, data in results.items():
        plt.plot(x, data["misidentification_scores"], marker='x', label=model, alpha=0.7)
    plt.xlabel('Non-Matteo Image')
    plt.ylabel('Similarity Score')
    plt.title('Misidentification Risk per Model')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True, alpha=0.3)
    plt.xticks(x, [img.split('/')[-1] for img in NON_MATTEO_IMAGES], rotation=45)
    plt.tight_layout()
    plt.savefig('misidentification_risk.png')
    plt.close()

def save_benchmark_results(benchmark_results: List[Dict]):
    """Save comprehensive benchmark results to CSV."""
    df = pd.DataFrame(benchmark_results)
    
    # Calculate and add summary statistics
    summary_stats = df.groupby('model').agg({
        'computation_time': ['mean', 'std', 'min', 'max'],
        'time_per_face': ['mean', 'std', 'min', 'max'],
        'similarity_score': ['mean', 'std', 'min', 'max'],
        'embedding_length': 'first',
        'faces_detected': ['sum', 'mean']
    }).round(4)
    
    # Save detailed results
    df.to_csv('face_recognition_benchmark_detailed.csv', index=False)
    
    # Save summary statistics
    summary_stats.to_csv('face_recognition_benchmark_summary.csv')

if __name__ == "__main__":
    print("Starting model evaluation...")
    results, benchmark_results = evaluate_models()
    
    print("\nGenerating plots and saving results...")
    plot_additional_results(results)
    save_benchmark_results(benchmark_results)
    
    print("\nEvaluation complete! Results saved to:")
    print("- face_recognition_benchmark_detailed.csv")
    print("- face_recognition_benchmark_summary.csv")
    print("- misidentification_risk.png")