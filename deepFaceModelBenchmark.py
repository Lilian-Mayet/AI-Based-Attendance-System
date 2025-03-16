from deepface import DeepFace
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from typing import Dict, List, Tuple

# Define all available models
MODELS = [
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

def get_embedding(image_path: str, model_name: str) -> np.ndarray:
    """Get face embedding for a single image."""
    try:
        embedding_objs = DeepFace.represent(
            img_path=image_path,
            model_name=model_name,
            detector_backend="retinaface",
            enforce_detection=True,
            align=True
        )
        
        if not embedding_objs:
            raise ValueError("No face detected")
            
        # If multiple faces, we'll get all embeddings
        return [np.array(obj["embedding"]) for obj in embedding_objs]
        
    except Exception as e:
        print(f"Error getting embedding for {image_path} with model {model_name}: {str(e)}")
        return []

def calculate_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Calculate cosine similarity between two embeddings."""
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

def evaluate_models() -> Dict[str, List[float]]:
    """Evaluate all models and return their similarity scores."""
    # Path to the original Matteo image
    original_path = "imgTest/matteoOG.jpg"
    
    # Results dictionary
    results = {model: [] for model in MODELS}
    
    # Process each model
    for model in MODELS:
        print(f"\n=== Evaluating {model} ===")
        
        try:
            # Get embedding for original image
            original_embeddings = get_embedding(original_path, model)
            if not original_embeddings:
                print(f"Skipping {model} - couldn't get original embedding")
                continue
            original_embedding = original_embeddings[0]  # Use first face if multiple detected
            
            # Test against each test image
            for i in range(1, 12):  # Testing images 1-11
                test_path = f"imgTest/matteo{i}.jpg"
                if not os.path.exists(test_path):
                    print(f"Warning: {test_path} not found")
                    results[model].append(0.0)
                    continue
                
                # Get embeddings for test image
                test_embeddings = get_embedding(test_path, model)
                if not test_embeddings:
                    print(f"No faces found in {test_path}")
                    results[model].append(0.0)
                    continue
                
                # Calculate similarities with all faces and take the highest
                similarities = [calculate_similarity(original_embedding, test_emb) 
                              for test_emb in test_embeddings]
                max_similarity = max(similarities)
                results[model].append(max_similarity)
                print(f"Image {i}: Similarity = {max_similarity:.3f}")
                
        except Exception as e:
            print(f"Error processing model {model}: {str(e)}")
            results[model] = [0.0] * 11  # Fill with zeros if model fails
            
    return results

def plot_results(results: Dict[str, List[float]]):
    """Plot the results for all models."""
    plt.figure(figsize=(15, 10))
    
    # Create x-axis labels
    x = np.arange(1, 12)
    
    # Plot line for each model
    for model, scores in results.items():
        plt.plot(x, scores, marker='o', label=model, alpha=0.7)
    
    plt.xlabel('Test Image Number')
    plt.ylabel('Similarity Score')
    plt.title('Face Recognition Model Comparison')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    
    # Save plot
    plt.savefig('model_comparison.png')
    plt.close()
    
    # Also save numerical results
    df = pd.DataFrame(results)
    df.index = [f'Image {i}' for i in range(1, 12)]
    df.to_csv('model_comparison_results.csv')

if __name__ == "__main__":
    # Run evaluation
    print("Starting model evaluation...")
    results = evaluate_models()
    
    # Plot and save results
    print("\nGenerating plots and saving results...")
    plot_results(results)
    
    print("\nEvaluation complete! Results saved to 'model_comparison.png' and 'model_comparison_results.csv'")