"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";

interface Course {
    courseid: number;
    subject: string;
    teacherid: number;
    teacher_name: string;
    teacher_username: string;
}

interface Student {
    studentid: number;
    name: string;
}

const TestActionsPage: React.FC = () => {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [errorCourses, setErrorCourses] = useState<string | null>(null);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [errorStudents, setErrorStudents] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoadingCourses(true);
                setErrorCourses(null);
                const response = await fetch("http://localhost:8000/courses/");
                if (!response.ok) {
                    throw new Error("Failed to fetch courses");
                }
                const data = await response.json();
                setCourses(data.courses);
            } catch (error: any) {
                setErrorCourses("Failed to load courses.");
                console.error("Error fetching courses:", error);
            } finally {
                setLoadingCourses(false);
            }
        };

        fetchCourses();
    }, []);

    useEffect(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        setFilteredCourses(
            courses.filter(course => course.subject.toLowerCase().includes(lowerCaseQuery))
        );
    }, [searchQuery, courses]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleCourseSelect = (courseId: number) => {
        setSelectedCourseId(courseId);
        setEnrolledStudents([]); // Clear previous students
    };

    const handleGoToFaceRecognition = async () => {
        if (selectedCourseId) {
            setLoadingStudents(true);
            setErrorStudents(null);
            try {
                const response = await fetch(`http://localhost:8000/courses/${selectedCourseId}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch course details for ID ${selectedCourseId}`);
                }
                const data = await response.json();
                setEnrolledStudents(data.enrolled_students);
                const allowedStudentsParam = encodeURIComponent(JSON.stringify(data.enrolled_students.map(student => student.name)));
                router.push(`/face-recognition?allowedStudents=${allowedStudentsParam}`);
            } catch (error: any) {
                setErrorStudents(`Failed to load students for course ${selectedCourseId}.`);
                console.error("Error fetching enrolled students:", error);
            } finally {
                setLoadingStudents(false);
            }
        } else {
            alert("Please select a course first.");
        }
    };

    const handleCreateCourse = () => {
        router.push("/create-course");
    };

    const handleEditCourse = () => {
        router.push("/dashboard"); // Navigate to dashboard for editing
    };

    const handleAddFace = () => {
        router.push("/add-face");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 p-6 space-y-6">
            <h1 className="text-3xl font-semibold text-gray-800 mb-4">Test Actions</h1>

            <Card className="w-full max-w-md p-6">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Select Course for Face Recognition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Filter courses by subject..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    <div className="max-h-48 overflow-y-auto rounded-md border">
                        {loadingCourses ? (
                            <p className="p-2 text-sm text-gray-500 italic">Loading courses...</p>
                        ) : errorCourses ? (
                            <p className="p-2 text-sm text-red-500">{errorCourses}</p>
                        ) : filteredCourses.length > 0 ? (
                            <ul>
                                {filteredCourses.map(course => (
                                    <li
                                        key={course.courseid}
                                        className={`p-2 cursor-pointer hover:bg-gray-100 rounded-md ${
                                            selectedCourseId === course.courseid ? 'bg-blue-100 font-semibold' : ''
                                        }`}
                                        onClick={() => handleCourseSelect(course.courseid)}
                                    >
                                        {course.subject} (Teacher: {course.teacher_name})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="p-2 text-sm text-gray-500 italic">No courses found.</p>
                        )}
                    </div>
                    <Button onClick={handleGoToFaceRecognition} disabled={!selectedCourseId || loadingStudents}>
                        {loadingStudents ? "Loading Students..." : "Go to Face Recognition"}
                    </Button>
                    {errorStudents && <p className="text-sm text-red-500 mt-2">{errorStudents}</p>}
                </CardContent>
            </Card>

            <div className="space-x-4">
                <Button onClick={handleCreateCourse}>Create Course</Button>
                <Button onClick={handleEditCourse}>Edit Course</Button>
                <Button onClick={handleAddFace}>Add Face</Button>
            </div>
        </div>
    );
};

export default TestActionsPage;