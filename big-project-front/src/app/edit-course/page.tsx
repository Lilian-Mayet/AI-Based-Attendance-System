"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Teacher {
    teacherid: number;
    name: string;
}

interface Course {
    courseid: number;
    subject: string;
    teacherid: number;
}

interface Student {
    studentid: number;
    name: string;
}

const EditCoursePage: React.FC = () => {
    const searchParams = useSearchParams(); // Use the hook to get search parameters
    const courseId = React.useMemo(() => { // Memoize the parsing
        const id = searchParams.get("courseId");
        return id ? parseInt(id, 10) : undefined;
    }, [searchParams]);

    const [course, setCourse] = useState<Course | null>(null);
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [studentsToAdd, setStudentsToAdd] = useState<number[]>([]);
    const [studentsToRemove, setStudentsToRemove] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchCourseDetails = async () => {
            try {
                setLoading(true);
                setError(null);
                if (courseId) {
                    const courseResponse = await axios.get<{ course: Course; enrolled_students: Student[] }>(
                        `http://localhost:8000/courses/${courseId}`
                    );
                    setCourse(courseResponse.data.course);
                    setEnrolledStudents(courseResponse.data.enrolled_students);
                    setLoading(false);
                } else {
                    setError("Invalid Course ID in URL.");
                    toast.error("Invalid Course ID in URL.");
                    setLoading(false);
                }
            } catch (err: any) {
                setError("Failed to load course details.");
                toast.error("Failed to load course details.");
                setLoading(false);
            }
        };

        const fetchAllStudents = async () => {
            try {
                const studentsResponse = await axios.get<{ students: Student[] }>("http://localhost:8000/students/");
                setAllStudents(studentsResponse.data.students);
            } catch (err: any) {
                setError("Failed to load student list.");
                toast.error("Failed to load student list.");
            }
        };

        fetchAllStudents();
        fetchCourseDetails();
    }, [courseId]); // Re-run if courseId changes

    useEffect(() => {
        if (allStudents) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            setFilteredStudents(
                allStudents.filter(student =>
                    student.name.toLowerCase().includes(lowerCaseQuery) &&
                    !enrolledStudents.some(enrolled => enrolled.studentid === student.studentid) &&
                    !studentsToAdd.includes(student.studentid)
                )
            );
        }
    }, [searchQuery, allStudents, enrolledStudents, studentsToAdd]);

    const handleAddStudent = (studentId: number) => {
        if (!studentsToAdd.includes(studentId)) {
            setStudentsToAdd([...studentsToAdd, studentId]);
            setStudentsToRemove(studentsToRemove.filter(id => id !== studentId));
        }
    };

    const handleRemoveStudent = (studentId: number) => {
        if (!studentsToRemove.includes(studentId)) {
            setStudentsToRemove([...studentsToRemove, studentId]);
            setStudentsToAdd(studentsToAdd.filter(id => id !== studentId));
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);
            if (courseId) {
                await axios.put(`http://localhost:8000/edit-courses/${courseId}/students`, {
                    add: studentsToAdd,
                    remove: studentsToRemove,
                });
                toast.success("Course updated successfully!");
                router.push("/dashboard");
            } else {
                setError("Course ID is missing, cannot save.");
                toast.error("Course ID is missing, cannot save.");
            }
        } catch (err: any) {
            setError("Failed to update course.");
            toast.error("Failed to update course.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push("/dashboard");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <span className="text-xl">Loading course details...</span>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <p className="text-red-500">{error || "Failed to load course."}</p>
                <Button className="ml-4" onClick={() => router.push("/dashboard")}>
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-3xl mx-auto bg-white shadow-md rounded-md p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">Edit Course: {course.subject}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="courseId">Course ID</Label>
                            <Input id="courseId" value={course.courseid.toString()} readOnly />
                        </div>
                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" value={course.subject} readOnly />
                        </div>

                        <div>
                            <Label>Enrolled Students</Label>
                            {enrolledStudents.length > 0 ? (
                                <ul className="mt-2 space-y-1">
                                    {enrolledStudents.map((student) => (
                                        <li key={student.studentid} className="flex items-center justify-between rounded-md border px-3 py-2">
                                            <span>{student.name}</span>
                                            <Button variant="destructive" size="sm" onClick={() => handleRemoveStudent(student.studentid)}>
                                                Remove
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No students currently enrolled.</p>
                            )}
                            {studentsToRemove.length > 0 && (
                                <p className="mt-2 text-sm text-orange-500">Removing: {studentsToRemove.map(id => enrolledStudents.find(s => s.studentid === id)?.name).filter(Boolean).join(", ")}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="search">Add Students</Label>
                            <Input
                                type="text"
                                id="search"
                                placeholder="Search students to add..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="mt-1"
                            />
                            {filteredStudents.length > 0 && (
                                <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto rounded-md border">
                                    {filteredStudents.map((student) => (
                                        <li
                                            key={student.studentid}
                                            className="cursor-pointer rounded-md border-b px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
                                        >
                                            <span>{student.name}</span>
                                            <Button size="sm" onClick={() => handleAddStudent(student.studentid)}>
                                                Add
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {searchQuery && filteredStudents.length === 0 && (
                                <p className="mt-2 text-sm text-gray-500 italic">No students found matching your search.</p>
                            )}
                            {studentsToAdd.length > 0 && (
                                <p className="mt-2 text-sm text-green-500">Adding: {studentsToAdd.map(id => allStudents.find(s => s.studentid === id)?.name).filter(Boolean).join(", ")}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EditCoursePage;