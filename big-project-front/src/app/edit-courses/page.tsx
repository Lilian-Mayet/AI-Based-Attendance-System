"use client";

import React, { useState, useEffect, ChangeEvent } from 'react';

interface Student {
    studentid: number;
    name: string;
}

interface CourseDetails {
    course: {
        courseid: number;
        subject: string;
    };
    enrolled_students: Student[];
}

const CourseEdit = ({ courseId }: { courseId: number }) => {
    const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [studentsToAdd, setStudentsToAdd] = useState<number[]>([]);
    const [studentsToRemove, setStudentsToRemove] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

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
            } catch (e) {
                setError(e.message);
            }
        };

        const fetchAllStudents = async () => {
            try {
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
        fetchAllStudents();
    }, [courseId]);

    useEffect(() => {
        if (allStudents) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            setFilteredStudents(
                allStudents.filter(student =>
                    student.name.toLowerCase().includes(lowerCaseQuery)
                )
            );
        }
    }, [searchQuery, allStudents]);

    const handleAddStudent = (studentId: number) => {
        if (!studentsToAdd.includes(studentId) && !courseDetails?.enrolled_students?.some(s => s.studentid === studentId)) {
            setStudentsToAdd([...studentsToAdd, studentId]);
            setStudentsToRemove(studentsToRemove.filter(id => id !== studentId));
            setMessage(null);
        }
    };

    const handleRemoveStudent = (studentId: number) => {
        if (!studentsToRemove.includes(studentId) && courseDetails?.enrolled_students?.some(s => s.studentid === studentId)) {
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

    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    if (loading) {
        return <div style={styles.loading}>Loading course details...</div>;
    }

    if (error) {
        return <div style={styles.error}>Error: {error}</div>;
    }

    if (!courseDetails) {
        return <div style={styles.notFound}>Course not found.</div>;
    }

    const notEnrolledStudents = filteredStudents.filter(student =>
        !courseDetails.enrolled_students?.some(s => s.studentid === student.studentid)
    );

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Edit Course: {courseDetails.course.subject} (ID: {courseDetails.course.courseid})</h2>
            {message && <p style={styles.message}>{message}</p>}
            {error && <p style={styles.error}>{error}</p>}

            <div style={styles.section}>
                <h3>Enrolled Students:</h3>
                {courseDetails.enrolled_students?.length > 0 ? (
                    <ul style={styles.list}>
                        {courseDetails.enrolled_students.map(student => (
                            <li key={student.studentid} style={styles.listItem}>
                                <span>{student.name} (ID: {student.studentid})</span>
                                <button style={styles.removeButton} onClick={() => handleRemoveStudent(student.studentid)}>Remove</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={styles.emptyMessage}>No students enrolled in this course.</p>
                )}
            </div>

            <div style={styles.section}>
                <h3>Add Students:</h3>
                <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={handleSearch}
                    style={styles.searchInput}
                />
                {notEnrolledStudents.length > 0 ? (
                    <ul style={styles.list}>
                        {notEnrolledStudents.map(student => (
                            <li key={student.studentid} style={styles.listItem}>
                                <span>{student.name} (ID: {student.studentid})</span>
                                <button style={styles.addButton} onClick={() => handleAddStudent(student.studentid)}>Add</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={styles.emptyMessage}>{searchQuery ? 'No matching students found.' : 'No other students available.'}</p>
                )}
            </div>

            {(studentsToAdd.length > 0 || studentsToRemove.length > 0) && (
                <div style={styles.actions}>
                    {studentsToAdd.length > 0 && (
                        <p>Students to Add: {studentsToAdd.join(', ')}</p>
                    )}
                    {studentsToRemove.length > 0 && (
                        <p>Students to Remove: {studentsToRemove.join(', ')}</p>
                    )}
                    <button style={styles.saveButton} onClick={handleSubmit}>Save Changes</button>
                </div>
            )}
        </div>
    );
};

const EditCoursePage = ({ searchParams }: { searchParams: { courseId: string } }) => {
    const courseId = parseInt(searchParams.courseId || '1');
    return <CourseEdit courseId={courseId} />;
};

const styles = {
    container: {
        maxWidth: '800px',
        margin: '20px auto',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    heading: {
        textAlign: 'center',
        marginBottom: '20px',
        color: '#333',
    },
    section: {
        marginBottom: '20px',
        padding: '15px',
        border: '1px solid #eee',
        borderRadius: '6px',
        backgroundColor: '#fff',
    },
    list: {
        listStyle: 'none',
        padding: 0,
    },
    listItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid #eee',
    },
    listItemLast: {
        borderBottom: 'none',
    },
    addButton: {
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    removeButton: {
        backgroundColor: '#f44336',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    searchInput: {
        width: '100%',
        padding: '10px',
        marginBottom: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '1em',
    },
    actions: {
        marginTop: '20px',
        padding: '15px',
        border: '1px solid #eee',
        borderRadius: '6px',
        backgroundColor: '#fff',
    },
    saveButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    message: {
        color: 'green',
        marginBottom: '10px',
        textAlign: 'center',
    },
    error: {
        color: 'red',
        marginBottom: '10px',
        textAlign: 'center',
    },
    loading: {
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '1.1em',
        color: '#777',
    },
    notFound: {
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '1.1em',
        color: '#777',
    },
    emptyMessage: {
        fontStyle: 'italic',
        color: '#555',
    },
};

export default EditCoursePage;