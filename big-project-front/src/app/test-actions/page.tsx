"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/ui/button"; // Assuming these components are themed separately
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
                // Ensure the correct backend URL
                const response = await fetch("http://localhost:8000/courses/");
                if (!response.ok) {
                    // Attempt to read error message from response if available
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Failed to fetch courses: ${response.statusText}`);
                }
                const data = await response.json();
                // Assuming data.courses is an array of Course objects
                setCourses(data.courses);
            } catch (error: any) {
                setErrorCourses(`Failed to load courses: ${error.message}`);
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
        // No need to fetch students immediately, fetch happens when going to FR page
    };

    const handleGoToFaceRecognition = async () => {
        if (selectedCourseId) {
            setLoadingStudents(true);
            setErrorStudents(null);
            try {
                // Ensure the correct backend URL
                const response = await fetch(`http://localhost:8000/courses/${selectedCourseId}`);
                if (!response.ok) {
                     const errorData = await response.json().catch(() => ({}));
                     throw new Error(errorData.detail || `Failed to fetch course details for ID ${selectedCourseId}: ${response.statusText}`);
                }
                const data = await response.json();
                // Assuming data.enrolled_students is an array of Student objects
                setEnrolledStudents(data.enrolled_students);
                const allowedStudentsParam = encodeURIComponent(JSON.stringify(data.enrolled_students.map(student => student.name)));
                router.push(`/face-recognition?allowedStudents=${allowedStudentsParam}`);
            } catch (error: any) {
                setErrorStudents(`Failed to load students for course ${selectedCourseId}: ${error.message}`);
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
        if (selectedCourseId) {
            router.push(`/edit-course?courseId=${selectedCourseId}`);
        } else {
            alert("Please select a course to edit.");
        }
    };

    const handleAddFace = () => {
        router.push("/add-face");
    };

    return (
        // Changed background to pastel green
        <div className="min-h-screen flex flex-col items-center justify-start bg-green-50 p-6 space-y-6">
            {/* Changed title color to dark green */}
            <h1 className="text-3xl font-semibold text-green-800 mb-4">Demo Mode</h1>

            {/* Card component styling depends on your shadcn/ui theme */}
            <Card className="w-full max-w-md p-6">
                <CardHeader>
                     {/* Changed card title color */}
                    <CardTitle className="text-lg font-semibold text-green-700">Select Course for Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Input component styling depends on your shadcn/ui theme */}
                    <Input
                        type="text"
                        placeholder="Filter courses by subject..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    {/* Adjusted border and scrollbar background */}
                    <div className="max-h-48 overflow-y-auto rounded-md border border-green-200 bg-white">
                        {loadingCourses ? (
                            <p className="p-2 text-sm text-gray-500 italic">Loading courses...</p>
                        ) : errorCourses ? (
                            <p className="p-2 text-sm text-red-500">{errorCourses}</p>
                        ) : filteredCourses.length > 0 ? (
                            <ul>
                                {filteredCourses.map(course => (
                                    <li
                                        key={course.courseid}
                                        className={`p-2 cursor-pointer hover:bg-green-100 rounded-md transition duration-150 ease-in-out ${
                                             // Changed selection highlight color
                                            selectedCourseId === course.courseid ? 'bg-green-200 font-semibold text-green-800' : 'text-gray-700'
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
                    <div className="flex space-x-2">
                         {/* Button styling depends on your shadcn/ui theme */}
                        <Button
                            onClick={handleGoToFaceRecognition}
                            disabled={!selectedCourseId || loadingStudents}
                        >
                            {loadingStudents ? "Loading Students..." : "Go to Face Recognition"}
                        </Button>
                         {/* Button styling depends on your shadcn/ui theme */}
                        <Button
                            onClick={handleEditCourse}
                            disabled={!selectedCourseId || loadingStudents} // Disable if loading students too
                            // Custom disabled style might be overridden by shadcn/ui theme
                            // className={!selectedCourseId ? "bg-gray-400 cursor-not-allowed text-gray-200" : ""}
                        >
                            Edit Course
                        </Button>
                    </div>
                    {errorStudents && <p className="text-sm text-red-500 mt-2">{errorStudents}</p>}
                </CardContent>
            </Card>

             {/* Button styling depends on your shadcn/ui theme */}
            <div className="space-x-4">
                <Button onClick={handleCreateCourse}>Create Course</Button>
                <Button onClick={handleAddFace}>Add Face</Button>
            </div>
        </div>
    );
};

export default TestActionsPage;