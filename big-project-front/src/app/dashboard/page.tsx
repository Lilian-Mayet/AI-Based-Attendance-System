"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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
  courseid: number;
}

const Dashboard: React.FC = () => {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<{ [key: number]: string[] }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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

      // Fetch all courses
      const response = await axios.get<{ courses: Course[] }>("http://localhost:8000/courses/");
      const teacherCourses = response.data.courses?.filter(course => course.teacherid === teacherId) || [];
      setCourses(teacherCourses);

// Fetch all students for each course in parallel
const studentRequests = teacherCourses.map(course =>
  axios.get<{ enrolled_students: { name: string }[] }>(
    `http://localhost:8000/courses/${course.courseid}`
  )
);

const studentResponses = await Promise.all(studentRequests);

const studentData: { [key: number]: string[] } = {};

studentResponses.forEach((res, index) => {
  const courseId = teacherCourses[index].courseid;
  studentData[courseId] = res.data.enrolled_students?.map(s => s.name) || [];
});

setStudents(studentData);
    } catch (error) {
      console.error("Error fetching courses or students:", error);
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
    const allowedStudents = students[course.courseid] || [];
    localStorage.setItem("allowedStudents", JSON.stringify(allowedStudents));
    router.push(`/face-recognition?courseId=${course.courseid}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <div className="flex items-center">
            <span className="mr-4">Bonjour, {teacher?.name}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white py-1 px-3 rounded-md hover:bg-red-700"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Vos cours</h2>
          {error && <p className="text-red-500">{error}</p>}
          {courses.length === 0 ? (
            <p>Vous n'avez pas encore de cours.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.courseid}
                  className="border rounded-lg p-4 hover:shadow-md cursor-pointer bg-white"
                  onClick={() => handleCourseClick(course)}
                >
                  <h3 className="font-medium text-lg">{course.subject}</h3>
                  <p className="text-gray-600">ID du cours: {course.courseid}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
