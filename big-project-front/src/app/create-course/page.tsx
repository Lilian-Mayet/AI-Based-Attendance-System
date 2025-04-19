"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ListBox } from "../components/ui/list-box";
import { ListBoxItem } from "../components/ui/list-box";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { User } from "lucide-react";

interface Teacher {
    teacherid: number;
    name: string;
}

interface Student {
    studentid: number;
    name: string;
}

const CreateCoursePage: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
    const [subject, setSubject] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [studentsToAdd, setStudentsToAdd] = useState<number[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const response = await axios.get<{ teachers: Teacher[] }>("http://localhost:8000/teachers/");
                setTeachers(response.data.teachers);
            } catch (err: any) {
                setError("Failed to load teachers.");
                toast.error("Failed to load teachers.");
            }
        };

        const fetchAllStudents = async () => {
            try {
                const response = await axios.get<{ students: Student[] }>("http://localhost:8000/students/");
                setAllStudents(response.data.students);
            } catch (err: any) {
                setError("Failed to load student list.");
                toast.error("Failed to load student list.");
            }
        };

        fetchTeachers();
        fetchAllStudents();
    }, []);

    useEffect(() => {
        if (allStudents) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            setFilteredStudents(
                allStudents.filter(student =>
                    student.name.toLowerCase().includes(lowerCaseQuery) &&
                    !studentsToAdd.includes(student.studentid)
                )
            );
        }
    }, [searchQuery, allStudents, studentsToAdd]);

    const handleTeacherSelect = (teacherId: number) => {
        setSelectedTeacherId(teacherId);
    };

    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSubject(e.target.value);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleAddStudent = (studentId: number) => {
        if (!studentsToAdd.includes(studentId)) {
            setStudentsToAdd([...studentsToAdd, studentId]);
        }
    };

    const handleRemoveStudent = (studentId: number) => {
        setStudentsToAdd(studentsToAdd.filter(id => id !== studentId));
    };

    const handleCreateCourse = async () => {
        if (!selectedTeacherId) {
            toast.error("Please select a teacher.");
            return;
        }
        if (!subject.trim()) {
            toast.error("Please enter a subject for the course.");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await axios.post("http://localhost:8000/courses/", {
                teacherid: selectedTeacherId,
                subject: subject,
                initial_students: studentsToAdd,
            });
            toast.success("Course created successfully!");
            router.push("/dashboard");
        } catch (err: any) {
            setError("Failed to create course.");
            toast.error("Failed to create course.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen bg-gray-50 py-6">
            <div className="max-w-3xl mx-auto bg-white shadow-md rounded-md p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold">Create New Course</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="teacher">Teacher</Label>
                            {teachers.length > 0 ? (
                                <ListBox onValueChange={(value) => handleTeacherSelect(parseInt(value, 10))}>
                                    <ListBoxItem value="">Select a teacher</ListBoxItem>
                                    {teachers.map((teacher) => (
                                        <ListBoxItem key={teacher.teacherid} value={teacher.teacherid.toString()}>
                                            {teacher.name}
                                        </ListBoxItem>
                                    ))}
                                </ListBox>
                            ) : (
                                <p className="text-sm text-gray-500 italic">Loading teachers...</p>
                            )}
                            {selectedTeacherId && (
                                <p className="mt-2 text-sm text-gray-700">Selected Teacher ID: {selectedTeacherId}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                type="text"
                                id="subject"
                                placeholder="Enter course subject"
                                value={subject}
                                onChange={handleSubjectChange}
                            />
                        </div>

                        <div>
                            <Label htmlFor="search">Add Initial Students</Label>
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
                                <div className="mt-2">
                                    <p className="text-sm text-green-500">Initial Students to Add:</p>
                                    <ul className="mt-1 space-y-1">
                                        {studentsToAdd.map((studentId) => {
                                            const student = allStudents.find(s => s.studentid === studentId);
                                            return (
                                                <li key={studentId} className="flex items-center justify-between rounded-md border px-3 py-2">
                                                    <span>{student?.name}</span>
                                                    <Button variant="destructive" size="sm" onClick={() => handleRemoveStudent(studentId)}>
                                                        Remove
                                                    </Button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateCourse} disabled={loading}>
                                {loading ? "Creating..." : "Create Course"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CreateCoursePage;