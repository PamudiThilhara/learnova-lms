export type Role = "student" | "instructor" | "admin";
export type User = { id: string; name: string; email: string; role: Role; phone: string; bio: string; avatar: string; status: "Active" | "Blocked"; joined: string };
export const dashboardPath = (role: Role = "student") => `/${role}-dashboard`;
