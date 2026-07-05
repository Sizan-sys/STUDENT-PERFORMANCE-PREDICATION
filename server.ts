import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Local JSON File Database for persistent, resilient live preview
const DB_FILE = path.join(process.cwd(), "src", "db.json");

// Helper to load or initialize local database
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    
    // Default seeded database
    const initialDb = {
      users: [
        { id: 1, fullname: "System Administrator", email: "admin@spps-system.edu", password: "admin", role: "admin" },
        { id: 2, fullname: "Dr. Clara Evans", email: "clara.evans@spps-system.edu", password: "teacher", role: "teacher" },
        { id: 3, fullname: "Aarav Sharma", email: "aarav.s@uni.edu", password: "student", role: "student" },
        { id: 4, fullname: "Aayush Adhikari", email: "aayush.a@uni.edu", password: "student", role: "student" }
      ],
      students: [
        { id: "STU001", user_id: 3, name: "Aarav Sharma", faculty: "Computer Science", semester: "Semester 4", gpa: 3.82, prediction: "Pass", probability: "96.4%", attendance: "98%", risk: "Low Risk", email: "aarav.s@uni.edu", gender: "Male", phone: "+1 234 567 8901", advisors: "Dr. Clara Evans", midterm: 89, final: 94, study_hours: 18, sleep_hours: 8, internet_access: "yes" },
        { id: "STU002", user_id: 4, name: "Aayush Adhikari", faculty: "Engineering", semester: "Semester 2", gpa: 2.15, prediction: "Fail", probability: "38.2%", attendance: "68%", risk: "High Risk", email: "aayush.a@uni.edu", gender: "Male", phone: "+1 234 567 8902", advisors: "Prof. Arthur Miller", midterm: 48, final: 40, study_hours: 4, sleep_hours: 5, internet_access: "no" },
        { id: "STU003", user_id: null, name: "Sagar Thapa", faculty: "Business", semester: "Semester 6", gpa: 3.45, prediction: "Pass", probability: "89.1%", attendance: "92%", risk: "Low Risk", email: "sagar.t@uni.edu", gender: "Male", phone: "+1 234 567 8903", advisors: "Dr. Clara Evans", midterm: 82, final: 85, study_hours: 12, sleep_hours: 7.5, internet_access: "yes" },
        { id: "STU004", user_id: null, name: "Roshan Karki", faculty: "Sciences", semester: "Semester 1", gpa: 2.80, prediction: "Pass (At Risk)", probability: "62.5%", attendance: "81%", risk: "Medium Risk", email: "roshan.k@uni.edu", gender: "Male", phone: "+1 234 567 8904", advisors: "Dr. Sarah Paul", midterm: 60, final: 55, study_hours: 6, sleep_hours: 6, internet_access: "yes" },
        { id: "STU005", user_id: null, name: "Prakash Gautam", faculty: "Arts", semester: "Semester 3", gpa: 3.10, prediction: "Pass", probability: "79.8%", attendance: "88%", risk: "Low Risk", email: "prakash.g@uni.edu", gender: "Male", phone: "+1 234 567 8905", advisors: "Prof. Arthur Miller", midterm: 75, final: 78, study_hours: 10, sleep_hours: 7, internet_access: "yes" }
      ],
      predictions: [
        { id: 1, student_id: "STU001", student_name: "Aarav Sharma", result: "Pass", probability: "96.4%", risk_level: "Low Risk", confidence: "High", created_at: "2026-07-03T04:00:00Z" },
        { id: 2, student_id: "STU002", student_name: "Aayush Adhikari", result: "Fail", probability: "38.2%", risk_level: "High Risk", confidence: "Moderate", created_at: "2026-07-03T04:10:00Z" }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
    return initialDb;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parsing
  app.use(express.json());

  /* ==========================================================================
     AUTHENTICATION API
     ========================================================================== */

  app.post("/api/auth/register", (req, res) => {
    const { fullname, email, password, role, studentId, faculty, semester } = req.body;
    const db = getDb();

    if (db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const nextUserId = db.users.length > 0 ? Math.max(...db.users.map((u: any) => u.id)) + 1 : 1;
    const newUser = { id: nextUserId, fullname, email, password, role };
    db.users.push(newUser);

    if (role === "student") {
      const actualStudentId = studentId || `STU${String(nextUserId).padStart(3, "0")}`;
      const newStudent = {
        id: actualStudentId,
        user_id: nextUserId,
        name: fullname,
        faculty: faculty || "Computer Science",
        semester: semester || "Semester 1",
        gpa: 0.0,
        attendance: "0%",
        risk: "Low Risk",
        email: email,
        gender: "Male",
        phone: "",
        advisors: "Dr. Clara Evans",
        midterm: 0,
        final: 0,
        study_hours: 0,
        sleep_hours: 8,
        internet_access: "yes",
        prediction: "Pass",
        probability: "100.0%"
      };
      db.students.push(newStudent);
    }

    saveDb(db);
    res.status(201).json({ message: "Registration successful", user: { id: newUser.id, fullname, email, role } });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const db = getDb();
    
    const user = db.users.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    res.json({
      user: { id: user.id, fullname: user.fullname, email: user.email, role: user.role },
      token: "mock-jwt-token-spps"
    });
  });

  /* ==========================================================================
     STUDENTS CRUD API
     ========================================================================== */

  app.get("/api/students", (req, res) => {
    const db = getDb();
    res.json(db.students);
  });

  app.post("/api/students", (req, res) => {
    const db = getDb();
    const student = req.body;

    if (db.students.find((s: any) => s.id === student.id)) {
      return res.status(400).json({ error: "Student ID already exists" });
    }

    const newStudent = {
      ...student,
      gpa: parseFloat(student.gpa) || 0,
      attendance: student.attendance.includes("%") ? student.attendance : `${student.attendance}%`,
      midterm: parseInt(student.midterm) || 0,
      final: parseInt(student.final) || 0,
      study_hours: parseFloat(student.study_hours) || 0,
      sleep_hours: parseFloat(student.sleep_hours) || 8,
      risk: student.risk || "Low Risk",
      prediction: student.prediction || "Pass",
      probability: student.probability || "100.0%"
    };

    db.students.push(newStudent);
    saveDb(db);
    res.status(201).json(newStudent);
  });

  app.put("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const db = getDb();
    const index = db.students.findIndex((s: any) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Student not found" });
    }

    db.students[index] = { ...db.students[index], ...req.body };
    saveDb(db);
    res.json(db.students[index]);
  });

  app.delete("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const db = getDb();
    const filtered = db.students.filter((s: any) => s.id !== id);

    if (filtered.length === db.students.length) {
      return res.status(404).json({ error: "Student not found" });
    }

    db.students = filtered;
    db.predictions = db.predictions.filter((p: any) => p.student_id !== id);
    saveDb(db);
    res.status(204).end();
  });

  /* ==========================================================================
     PREDICTIONS & INFERENCE API
     ========================================================================== */

  app.get("/api/predictions", (req, res) => {
    const db = getDb();
    res.json(db.predictions);
  });

  app.post("/api/predictions/predict", (req, res) => {
    const { student_id, study_hours, attendance, assignment_score, mid_exam, final_exam, prev_gpa, internet_access, sleep_hours } = req.body;
    
    const db = getDb();
    const student = db.students.find((s: any) => s.id === student_id);

    // Calculate prediction exactly using the logical ML algorithm
    const attendanceScore = Math.min((parseFloat(attendance) / 100) * 25, 25);
    const finalScore = Math.min((parseFloat(final_exam) / 100) * 30, 30);
    const midScore = Math.min((parseFloat(mid_exam) / 100) * 15, 15);
    const studyScore = Math.min((parseFloat(study_hours) / 20) * 15, 15);
    const assignmentWeight = Math.min((parseFloat(assignment_score) / 100) * 15, 15);

    let totalPerformanceScore = attendanceScore + finalScore + midScore + studyScore + assignmentWeight;

    if (internet_access === "no") totalPerformanceScore -= 4;
    if (parseFloat(sleep_hours) < 6) totalPerformanceScore -= 5;
    if (parseFloat(prev_gpa) < 2.0) totalPerformanceScore -= 5;

    totalPerformanceScore = Math.max(0, Math.min(100, totalPerformanceScore));

    let predictedResult = "Pass";
    let riskLevel = "Low Risk";
    let badgeClass = "badge-success";
    let cardBorderColor = "var(--accent)";
    let confidence = "High";
    let probability = totalPerformanceScore;

    if (totalPerformanceScore < 50) {
      predictedResult = "Fail";
      riskLevel = "High Risk";
      badgeClass = "badge-danger";
      cardBorderColor = "var(--danger)";
      probability = 100 - totalPerformanceScore;
    } else if (totalPerformanceScore < 70) {
      predictedResult = "Pass (At Risk)";
      riskLevel = "Medium Risk";
      badgeClass = "badge-warning";
      cardBorderColor = "var(--warning)";
    }

    if (parseFloat(study_hours) > 15 && parseFloat(attendance) > 90 && parseFloat(final_exam) > 80) {
      confidence = "Very High";
    } else if (parseFloat(study_hours) < 5 || parseFloat(attendance) < 75) {
      confidence = "Moderate";
    }

    const probabilityStr = probability.toFixed(1) + "%";

    // Update student's parameters & predicted values in database
    if (student) {
      student.attendance = `${attendance}%`;
      student.gpa = parseFloat(prev_gpa) || student.gpa;
      student.midterm = parseInt(mid_exam) || student.midterm;
      student.final = parseInt(final_exam) || student.final;
      student.study_hours = parseFloat(study_hours) || student.study_hours;
      student.sleep_hours = parseFloat(sleep_hours) || student.sleep_hours;
      student.internet_access = internet_access;
      student.prediction = predictedResult;
      student.probability = probabilityStr;
      student.risk = riskLevel;
    }

    // Save prediction history
    const nextPredId = db.predictions.length > 0 ? Math.max(...db.predictions.map((p: any) => p.id)) + 1 : 1;
    const newPrediction = {
      id: nextPredId,
      student_id,
      student_name: student ? student.name : "Unknown",
      result: predictedResult,
      probability: probabilityStr,
      risk_level: riskLevel,
      confidence: confidence,
      created_at: new Date().toISOString()
    };
    db.predictions.push(newPrediction);

    saveDb(db);

    res.json({
      result: predictedResult,
      probability: probabilityStr,
      confidence: confidence,
      riskLevel: riskLevel,
      badgeClass: badgeClass,
      borderColor: cardBorderColor,
      rawScore: totalPerformanceScore
    });
  });

  /* ==========================================================================
     DASHBOARD STATISTICS API
     ========================================================================= */

  app.get("/api/dashboard/stats", (req, res) => {
    const db = getDb();
    
    const totalStudents = db.students.length;
    const totalTeachers = db.users.filter((u: any) => u.role === "teacher" || u.role === "admin").length;
    const totalPredictions = db.predictions.length;

    // Averages
    let gpaSum = 0;
    let attendanceSum = 0;
    db.students.forEach((s: any) => {
      gpaSum += s.gpa;
      attendanceSum += parseFloat(s.attendance.replace("%", "")) || 0;
    });

    const averageGpa = totalStudents > 0 ? (gpaSum / totalStudents) : 3.12;
    const averageAttendance = totalStudents > 0 ? (attendanceSum / totalStudents) : 85.4;

    // Risk levels
    const riskCounts = { "High Risk": 0, "Medium Risk": 0, "Low Risk": 0 };
    db.students.forEach((s: any) => {
      if (s.risk in riskCounts) {
        riskCounts[s.risk as keyof typeof riskCounts]++;
      } else {
        riskCounts["Low Risk"]++;
      }
    });

    // Faculty averages
    const facultyGpas: { [key: string]: number } = {};
    const facultyCounts: { [key: string]: number } = {};
    db.students.forEach((s: any) => {
      facultyGpas[s.faculty] = (facultyGpas[s.faculty] || 0) + s.gpa;
      facultyCounts[s.faculty] = (facultyCounts[s.faculty] || 0) + 1;
    });

    const finalFacultyGpas: { [key: string]: number } = {};
    Object.keys(facultyGpas).forEach((fac) => {
      finalFacultyGpas[fac] = parseFloat((facultyGpas[fac] / facultyCounts[fac]).toFixed(2));
    });

    res.json({
      total_students: totalStudents,
      total_teachers: totalTeachers,
      total_predictions: totalPredictions,
      average_gpa: parseFloat(averageGpa.toFixed(2)),
      average_attendance: parseFloat(averageAttendance.toFixed(1)),
      risk_counts: riskCounts,
      faculty_gpas: finalFacultyGpas,
      recent_predictions: db.predictions.slice(-5).reverse()
    });
  });

  /* ==========================================================================
     VITE DEV / PRODUCTION ROUTER
     ========================================================================== */

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SPPS Server] Full-Stack server operational on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
