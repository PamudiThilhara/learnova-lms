export type Role = "student" | "instructor" | "admin";
export type User = { id: string; name: string; email: string; role: Role; phone: string; bio: string; avatar: string; status: "Active" | "Blocked"; joined: string };
export const users: User[] = [
  { id: "student-1", name: "Aisha Perera", email: "student@learnova.demo", role: "student", phone: "", bio: "Computer science student. Learning something new every day.", avatar: "", status: "Active", joined: "2026-09-01" },
  { id: "student-2", name: "Daniel Silva", email: "daniel@learnova.demo", role: "student", phone: "", bio: "Interested in design and technology.", avatar: "", status: "Active", joined: "2026-09-12" },
  { id: "instructor-1", name: "Dr. Alex Johnson", email: "instructor@learnova.demo", role: "instructor", phone: "", bio: "Teaching programming and data science through practical projects.", avatar: "", status: "Active", joined: "2026-08-15" },
  { id: "instructor-2", name: "Sarah Williams", email: "sarah@learnova.demo", role: "instructor", phone: "", bio: "Designer and educator focused on accessible experiences.", avatar: "", status: "Active", joined: "2026-08-20" },
  { id: "instructor-3", name: "Michael Brown", email: "michael@learnova.demo", role: "instructor", phone: "", bio: "Marketing educator helping learners build effective campaigns.", avatar: "", status: "Active", joined: "2026-08-22" },
  { id: "admin-1", name: "Learnova Administrator", email: "admin@learnova.demo", role: "admin", phone: "", bio: "Supporting the Learnova learning community.", avatar: "", status: "Active", joined: "2026-08-01" },
];
export const dashboardPath = (role: Role = "student") => `/${role}-dashboard`;
