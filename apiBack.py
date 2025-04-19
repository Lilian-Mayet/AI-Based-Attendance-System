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
import tempfile
import sys
import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from face_lookalike import recognize_facesAPI
import time

from face_lookalike_deepface import recognize_faces_deepface, load_known_faces,add_face_to_db, recognize_faces_deepface_parralelisation

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
# Load environment variables from .env file
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)
print(os.getenv("DB_HOST"))
# Database connection function
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

        print(" Starting face recognition using database...", flush=True)

        results = recognize_faces_deepface_parralelisation(filename)
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
@app.route("/add_face/", methods=['POST'])
def add_face_endpoint():
    time.sleep(5)
    if 'file' not in request.files or 'name' not in request.form:
        return jsonify({"error": "File and name are required"}), 400

    file = request.files['file']
    name = request.form['name']

    # Temporarily save uploaded image
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
        file.save(tmp_file.name)
        temp_image_path = tmp_file.name

    try:
        # Load existing names from database
        _, known_names = load_known_faces()

        if name in known_names:
            os.unlink(temp_image_path)
            return jsonify({"error": f"The name '{name}' already exists in the database."}), 400

        # Add face to database
        success = add_face_to_db(temp_image_path, name)

        # Remove temporary file
        os.unlink(temp_image_path)

        if success:
            return jsonify({"message": f"Successfully added '{name}' to the database."}), 201
        else:
            return jsonify({"error": "Failed to add face to database."}), 500

    except Exception as e:
        if os.path.exists(temp_image_path):
            os.unlink(temp_image_path)
        return jsonify({"error": str(e)}), 500

@app.route("/students/", methods=['GET'])
def get_all_students():
    """Get all students from the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT * FROM student ORDER BY name")
        students = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({"students": students})
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error in get_all_students: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500

@app.route("/students/<int:student_id>", methods=['GET'])
def get_student_detail(student_id):
    """Get detailed information about a specific student, including courses"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get student info
        cursor.execute("SELECT * FROM student WHERE studentid = %s", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            return jsonify({"error": "Student not found"}), 404
        
        # Get courses the student is enrolled in
        cursor.execute("""
            SELECT c.courseid, c.subject, t.name as teacher_name 
            FROM course c 
            JOIN studentcourses sc ON c.courseid = sc.courseid 
            JOIN teacher t ON c.teacherid = t.teacherid
            WHERE sc.studentid = %s
        """, (student_id,))
        courses = cursor.fetchall()
        
        # Get face encoding if exists
        cursor.execute("SELECT * FROM faceencoding WHERE studentid = %s", (student_id,))
        face_encoding = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        result = {
            "student": student,
            "courses": courses,
            "has_face_encoding": face_encoding is not None
        }
        
        return jsonify(result)
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error in get_student_detail: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500

@app.route("/students/batch", methods=['POST'])
def get_students_by_ids():
    """Get multiple students by their IDs"""
    try:
        data = request.get_json()
        if not data or 'student_ids' not in data:
            return jsonify({"error": "No student IDs provided"}), 400
            
        student_ids = data['student_ids']
        if not isinstance(student_ids, list):
            return jsonify({"error": "student_ids must be an array"}), 400
            
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Format the list for SQL IN clause
        ids_string = ','.join(['%s'] * len(student_ids))
        query = f"SELECT * FROM student WHERE studentid IN ({ids_string}) ORDER BY name"
        
        cursor.execute(query, tuple(student_ids))
        students = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({"students": students})
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error in get_students_by_ids: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500

@app.route("/courses/", methods=['GET'])
def get_all_courses():
    """Get all courses with their teacher information"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT c.courseid, c.subject, c.teacherid, 
                   t.name as teacher_name, t.username as teacher_username
            FROM course c
            JOIN teacher t ON c.teacherid = t.teacherid
            ORDER BY c.subject
        """)
        courses = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({"courses": courses})
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error in get_all_courses: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500

@app.route("/courses/<int:course_id>", methods=['GET'])
def get_course_detail(course_id):
    """Get detailed information about a course, including students enrolled"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get course info with teacher
        cursor.execute("""
            SELECT c.*, t.name as teacher_name, t.username as teacher_username
            FROM course c
            JOIN teacher t ON c.teacherid = t.teacherid
            WHERE c.courseid = %s
        """, (course_id,))
        course = cursor.fetchone()
        
        if not course:
            return jsonify({"error": "Course not found"}), 404
        
        # Get students enrolled in this course
        cursor.execute("""
            SELECT s.studentid, s.name
            FROM student s
            JOIN studentcourses sc ON s.studentid = sc.studentid
            WHERE sc.courseid = %s
            ORDER BY s.name
        """, (course_id,))
        students = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        result = {
            "course": course,
            "enrolled_students": students,
            "student_count": len(students)
        }
        
        return jsonify(result)
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error in get_course_detail: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500

@app.route("/teachers/", methods=['GET'])
def get_all_teachers():
    """Get all teachers with their courses"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT teacherid, name, username 
            FROM teacher 
            ORDER BY name
        """)
        teachers = cursor.fetchall()
        
        # For each teacher, get their courses
        for teacher in teachers:
            cursor.execute("""
                SELECT courseid, subject 
                FROM course 
                WHERE teacherid = %s
            """, (teacher['teacherid'],))
            teacher['courses'] = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({"teachers": teachers})
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error in get_all_teachers: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500

@app.route("/teachers/login", methods=['POST'])
def teacher_login():
    """Authenticate a teacher with username and password"""
    try:
        data = request.get_json()
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({"error": "Username and password required"}), 400
            
        username = data['username']
        password = data['password']
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT teacherid, name, username 
            FROM teacher 
            WHERE username = %s AND password = %s
        """, (username, password))
        
        teacher = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not teacher:
            return jsonify({"error": "Invalid credentials"}), 401
        
        return jsonify({
            "message": "Login successful",
            "teacher": teacher
        })
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(f"Error in teacher_login: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500


@app.route("/edit-courses/<int:course_id>/students", methods=['PUT'])
def update_course_students(course_id):
    """
    Update the students enrolled in a specific course.
    Expects a JSON payload with 'add' and/or 'remove' lists of student IDs.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        if 'add' in data and isinstance(data['add'], list):
            for student_id in data['add']:
                try:
                    cursor.execute(
                        "INSERT INTO studentcourses (studentid, courseid) VALUES (%s, %s)",
                        (student_id, course_id)
                    )
                except psycopg2.errors.UniqueViolation:
                    logger.warning(f"Student {student_id} is already enrolled in course {course_id}")

        if 'remove' in data and isinstance(data['remove'], list):
            for student_id in data['remove']:
                cursor.execute(
                    "DELETE FROM studentcourses WHERE studentid = %s AND courseid = %s",
                    (student_id, course_id)
                )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": f"Course {course_id} updated successfully."}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        error_traceback = traceback.format_exc()
        logger.error(f"Error updating course students: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500


@app.route("/courses/", methods=['POST'])
def create_course():
    """Create a new course with a teacher and initial students."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400

    teacher_id = data.get('teacherid')
    subject = data.get('subject')
    initial_students = data.get('initial_students', [])

    if not teacher_id or not isinstance(teacher_id, int):
        return jsonify({"error": "Teacher ID is required and must be an integer"}), 400
    if not subject or not isinstance(subject, str) or not subject.strip():
        return jsonify({"error": "Subject is required and must be a non-empty string"}), 400
    if not isinstance(initial_students, list):
        return jsonify({"error": "Initial students must be a list of student IDs"}), 400
    for student_id in initial_students:
        if not isinstance(student_id, int):
            return jsonify({"error": "Student IDs in the initial list must be integers"}), 400

    conn = None
    try:
        conn = get_db_connection()
        if conn is None:
            return jsonify({"error": "Failed to connect to the database"}), 500

        cursor = conn.cursor()

        # 1. Create the new course
        cursor.execute("INSERT INTO course (teacherid, subject) VALUES (%s, %s) RETURNING courseid", (teacher_id, subject))
        new_course_id = cursor.fetchone()[0]

        # 2. Enroll the initial students
        for student_id in initial_students:
            try:
                cursor.execute("INSERT INTO studentcourses (studentid, courseid) VALUES (%s, %s)", (student_id, new_course_id))
            except psycopg2.Error as e:
                # Log the error but continue with other students
                logger.error(f"Error enrolling student {student_id} in course {new_course_id}: {e}")
                conn.rollback() # Rollback the current student enrollment attempt

        conn.commit()
        return jsonify({"message": "Course created successfully", "courseid": new_course_id}), 201

    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        error_traceback = traceback.format_exc()
        logger.error(f"Database error during course creation: {e}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        error_traceback = traceback.format_exc()
        logger.error(f"Unexpected error during course creation: {e}")
        logger.error(f"Traceback: {error_traceback}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()


if __name__ == '__main__':
    # Force stdout to flush immediately
    sys.stdout.reconfigure(line_buffering=True)
    print(" Starting Flask server...", flush=True)
    app.run(debug=True, port=8000)
