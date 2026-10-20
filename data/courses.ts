export type Category = "Programming" | "Design" | "Marketing" | "Business" | "Data Science" | "Personal Development";
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type Lesson = { id: string; title: string; duration: string; content: string; exercise: string };
export type Course = {
  id: string; title: string; image: string; instructor: string; instructorId: string;
  category: Category; level: Level; rating: number; students: number; duration: string;
  description: string; price: number; outcomes: string[]; lessons: Lesson[];
  quiz?: { question: string; options: string[]; answer: number; explanation: string }[];
  assignment?: { title: string; instructions: string; due: string };
};

export const categories: Category[] = ["Programming", "Design", "Marketing", "Business", "Data Science", "Personal Development"];
export const levels: Level[] = ["Beginner", "Intermediate", "Advanced"];
export const categoryImages: Record<Category, string> = {
  Programming: "/images/python.jpg", Design: "/images/ux-design.jpg",
  Marketing: "/images/digital-marketing.jpg", Business: "/images/digital-marketing.jpg",
  "Data Science": "/images/python.jpg", "Personal Development": "/images/ux-design.jpg",
};

const pythonContent = [
  "Python is a readable, general-purpose programming language. A program is a sequence of instructions. Start with print('Hello, Learnova!') and observe the output. Indentation groups statements into blocks; keep indentation consistent.",
  "Install Python from its official distribution and verify the interpreter with python --version. Create a project folder and a virtual environment with python -m venv .venv. A virtual environment keeps project dependencies separate.",
  "Variables give names to values: name = 'Aisha', age = 20, and enrolled = True. Common types include strings, integers, floats, and booleans. Use type(value) to inspect a type and explicit conversions such as int('20') when appropriate.",
  "Arithmetic operators include +, -, *, /, //, and %. Comparisons such as == and > return booleans. Combine conditions with and, or, and not. Use parentheses to make the order of evaluation clear.",
  "Use if, elif, and else to choose a branch. Each condition ends with a colon, followed by an indented block. For example, if score >= 70: can select a passing message. Test values at the boundary as well as values on either side.",
  "A for loop visits items in a sequence, while a while loop repeats as long as its condition is true. range(5) produces numbers from 0 to 4. Update the condition of a while loop to avoid an infinite loop.",
  "Define reusable behavior with def. Parameters receive input and return sends a result to the caller. A function should have a clear purpose. For example, def total(a, b): followed by return a + b adds two numbers.",
  "Lists are ordered collections, such as scores = [75, 90, 82]. Indexes begin at zero. Dictionaries associate keys with values, such as student = {'name': 'Aisha', 'score': 90}. Choose a list for a sequence and a dictionary for named lookup.",
  "A class groups related data and behavior. __init__ initializes an instance and self refers to that instance. Model a Student with a name and scores, then add a method that calculates the average. Keep methods focused and avoid unnecessary inheritance.",
  "Bring the course concepts together in a command-line learning tracker. Accept input, validate it, store course information in a dictionary, and calculate completion. Split behavior into functions and test invalid input as well as the normal path.",
];

export function makeLessons(titles: string[], topic: string): Lesson[] {
  return titles.map((title, index) => ({
    id: String(index + 1), title, duration: `${20 + index * 5} min`,
    content: topic === "Python Programming" ? pythonContent[index] : `${title} is part of building a solid foundation in ${topic}. Begin by identifying the problem, the audience, and the outcome you want to achieve. Break the work into small steps, compare possible approaches, and document why you chose one. Review your result against the original goal and improve it using feedback. Apply this process to a real example from your studies or work.`,
    exercise: `Create a small example that demonstrates ${title.toLowerCase()}. Explain your approach in three to five sentences, test the result, and record one improvement you would make.`,
  }));
}

