"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Teacher {
  teacherid: number;
  name: string;
}

interface Course {
  courseid: number;
  subject: string;
  teacherid: number;
}

const Dashboard: React.FC = () => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<{ [key: number]: string[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showStudents, setShowStudents] = useState<{ [key: number]: boolean }>({});
  const router = useRouter();

  useEffect(() => {
    const storedTeacher = localStorage.getItem("teacher");
    if (!storedTeacher) {
      router.push("/login");
      return;
    }

    const parsedTeacher: Teacher = JSON.parse(storedTeacher);
    setTeacher(parsedTeacher);
    fetchTeacherCourses(parsedTeacher.teacherid);
  }, [router]);

  const fetchTeacherCourses = async (teacherId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<{ courses: Course[] }>("http://localhost:8000/courses/");
      const teacherCourses = response.data.courses.filter(course => course.teacherid === teacherId);
      setCourses(teacherCourses);

      const studentRequests = teacherCourses.map(course =>
        axios.get<{ enrolled_students: { name: string }[] }>(
          `http://localhost:8000/courses/${course.courseid}`
        )
      );

      const studentResponses = await Promise.all(studentRequests);

      const studentData: { [key: number]: string[] } = {};
      studentResponses.forEach((res, index) => {
        const courseId = teacherCourses[index].courseid;
        studentData[courseId] = res.data.enrolled_students.map(s => s.name);
      });

      setStudents(studentData);
    } catch (error) {
      setError("Failed to load courses and students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("teacher");
    router.push("/login");
  };

  const handleCourseClick = (course: Course) => {
    localStorage.setItem("allowedStudents", JSON.stringify(students[course.courseid] || []));
    router.push(`/face-recognition?courseId=${course.courseid}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <span className="text-xl">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="font-medium">Hello, {teacher?.name}</span>
            <Button variant="destructive" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {courses.length === 0 ? (
              <p>You have no courses available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <Card key={course.courseid} className="hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                      <h3 className="text-xl font-semibold mb-2">{course.subject}</h3>
                      <p className="text-sm text-gray-600">Course ID: {course.courseid}</p>
                      <div className="mt-4 flex justify-between items-center">
                        <Button onClick={() => handleCourseClick(course)}>Start Recognition</Button>
                        <Button variant="outline" size="icon" onClick={() => setShowStudents(prev => ({ ...prev, [course.courseid]: !prev[course.courseid] }))}>
                          {showStudents[course.courseid] ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                      </div>
                      {showStudents[course.courseid] && (
                        <ul className="mt-4 bg-gray-100 rounded-md p-3">
                          {students[course.courseid].map((student, idx) => (
                            <li key={idx} className="text-gray-700">• {student}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
