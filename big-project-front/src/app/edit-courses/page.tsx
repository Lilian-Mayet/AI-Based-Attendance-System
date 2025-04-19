"use client"; 
import React, { useState, useEffect } from 'react';

const CourseEdit = ({ courseId }) => {
    const [courseDetails, setCourseDetails] = useState(null);
    const [allStudents, setAllStudents] = useState([]);
    const [studentsToAdd, setStudentsToAdd] = useState([]);
    const [studentsToRemove, setStudentsToRemove] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const fetchCourseDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const courseResponse = await fetch(`http://localhost:8000/courses/${courseId}`);
                if (!courseResponse.ok) {
                    throw new Error(`HTTP error! status: ${courseResponse.status}`);
                }
                const courseData = await courseResponse.json();
                setCourseDetails(courseData);

                const studentsResponse = await fetch('http://localhost:8000/students/');
                if (!studentsResponse.ok) {
                    throw new Error(`HTTP error! status: ${studentsResponse.status}`);
                }
                const studentsData = await studentsResponse.json();
                setAllStudents(studentsData.students);
            } catch (e) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCourseDetails();
    }, [courseId]);

    const handleAddStudent = (studentId) => {
        if (!studentsToAdd.includes(studentId) && !courseDetails.enrolled_students.some(s => s.studentid === studentId)) {
            setStudentsToAdd([...studentsToAdd, studentId]);
            setStudentsToRemove(studentsToRemove.filter(id => id !== studentId));
            setMessage(null);
        }
    };

    const handleRemoveStudent = (studentId) => {
        if (!studentsToRemove.includes(studentId) && courseDetails.enrolled_students.some(s => s.studentid === studentId)) {
            setStudentsToRemove([...studentsToRemove, studentId]);
            setStudentsToAdd(studentsToAdd.filter(id => id !== studentId));
            setMessage(null);
        }
    };

    const handleSubmit = async () => {
        setMessage(null);
        setError(null);
        try {
            const response = await fetch(`http://localhost:8000/courses/${courseId}/students`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ add: studentsToAdd, remove: studentsToRemove }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            setMessage(responseData.message);

            // Refresh course details after update
            const updatedCourseResponse = await fetch(`http://localhost:8000/courses/${courseId}`);
            if (updatedCourseResponse.ok) {
                const updatedCourseData = await updatedCourseResponse.json();
                setCourseDetails(updatedCourseData);
                setStudentsToAdd([]);
                setStudentsToRemove([]);
            }
        } catch (e) {
            setError(e.message);
        }
    };

    if (loading) {
        return <div>Loading course details...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!courseDetails) {
        return <div>Course not found.</div>;
    }

    return (
        <div>
            <h2>Edit Course: {courseDetails.course.subject} (ID: {courseDetails.course.courseid})</h2>
            {message && <p style={{ color: 'green' }}>{message}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <h3>Enrolled Students:</h3>
            {courseDetails.enrolled_students.length > 0 ? (
                <ul>
                    {courseDetails.enrolled_students.map(student => (
                        <li key={student.studentid}>
                            {student.name} (ID: {student.studentid})
                            <button onClick={() => handleRemoveStudent(student.studentid)}>Remove</button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No students enrolled in this course.</p>
            )}

            <h3>Add Students:</h3>
            {allStudents.length > 0 ? (
                <ul>
                    {allStudents
                        .filter(student => !courseDetails.enrolled_students.some(s => s.studentid === student.studentid))
                        .map(student => (
                            <li key={student.studentid}>
                                {student.name} (ID: {student.studentid})
                                <button onClick={() => handleAddStudent(student.studentid)}>Add</button>
                            </li>
                        ))}
                </ul>
            ) : (
                <p>No students available to add.</p>
            )}

            <h3>Actions:</h3>
            {studentsToAdd.length > 0 && (
                <p>Students to Add: {studentsToAdd.join(', ')}</p>
            )}
            {studentsToRemove.length > 0 && (
                <p>Students to Remove: {studentsToRemove.join(', ')}</p>
            )}
            {(studentsToAdd.length > 0 || studentsToRemove.length > 0) && (
                <button onClick={handleSubmit}>Save Changes</button>
            )}
        </div>
    );
};

// Example usage (you would typically get the courseId from routing)
const EditCoursePage = () => {
    // Replace with the actual course ID you want to edit
    const courseIdToEdit = 1;
    return <CourseEdit courseId={courseIdToEdit} />;
};

export default EditCoursePage;