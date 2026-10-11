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

const pythonLessons = ["Introduction to Python", "Installing Python", "Variables and Data Types", "Operators", "Conditional Statements", "Loops", "Functions", "Lists and Dictionaries", "Object-Oriented Programming", "Final Project"];
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

type Seed = [string, string, Category, Level, number, number, string, number, string, string[]];
const seeds: Seed[] = [
  ["1", "Python Programming", "Programming", "Beginner", 4.8, 1250, "8 weeks", 23, "Learn Python from the beginning through practical coding exercises and a final project.", pythonLessons],
  ["2", "UI/UX Design", "Design", "Beginner", 4.8, 840, "6 weeks", 35, "Create thoughtful interfaces with research, wireframing, typography, and prototyping.", ["Understanding User Experience", "Design Principles", "User Research", "Wireframing", "Typography and Color", "Interactive Prototyping"]],
  ["3", "Digital Marketing", "Marketing", "Beginner", 4.8, 920, "7 weeks", 73, "Build effective campaigns with content strategy, SEO, social media, and analytics.", ["Marketing Fundamentals", "Audience Research", "Content Strategy", "Social Media Campaigns", "SEO Basics", "Campaign Analytics"]],
  ["4", "Python Advanced", "Programming", "Advanced", 4.9, 630, "8 weeks", 40, "Deepen your Python skills with advanced concepts, testing, and practical projects.", ["Advanced Collections", "Generators", "Decorators", "Error Handling", "Testing", "Project Architecture"]],
  ["5", "UI/UX Design Masterclass", "Design", "Advanced", 4.7, 480, "8 weeks", 45, "Develop professional design systems and accessible product experiences.", ["Product Discovery", "Research Synthesis", "Design Systems", "Accessibility", "Usability Testing", "Portfolio Project"]],
  ["6", "Social Media Marketing", "Marketing", "Intermediate", 4.9, 710, "5 weeks", 50, "Create social campaigns that connect with audiences and grow online brands.", ["Brand Voice", "Content Planning", "Community Management", "Paid Campaigns", "Analytics", "Campaign Project"]],
  ["7", "Web Development", "Programming", "Beginner", 4.8, 1100, "10 weeks", 39, "Build responsive websites using HTML, CSS, and JavaScript.", ["How the Web Works", "Semantic HTML", "CSS Layouts", "Responsive Design", "JavaScript Fundamentals", "Website Project"]],
  ["8", "Data Science Fundamentals", "Data Science", "Beginner", 4.7, 760, "8 weeks", 49, "Turn raw data into clear insights with analysis and visualization.", ["Asking Data Questions", "Data Collection", "Cleaning Data", "Exploratory Analysis", "Visualization", "Communicating Insights"]],
  ["9", "React Development", "Programming", "Intermediate", 4.9, 890, "8 weeks", 55, "Create interactive applications with components, state, and reusable patterns.", ["Components and JSX", "Props", "State and Events", "Forms", "Data and Effects", "Application Project"]],
  ["10", "Graphic Design", "Design", "Beginner", 4.7, 560, "6 weeks", 29, "Develop visual communication skills through composition, color, and typography.", ["Visual Hierarchy", "Composition", "Color Theory", "Typography", "Brand Identity", "Design Portfolio"]],
  ["11", "Business Analytics", "Business", "Intermediate", 4.8, 420, "7 weeks", 45, "Use evidence and practical analysis to make better business decisions.", ["Business Questions", "Performance Metrics", "Spreadsheet Analysis", "Forecasting", "Decision Making", "Business Case"]],
  ["12", "Machine Learning Basics", "Data Science", "Intermediate", 4.8, 690, "9 weeks", 59, "Understand models, training data, evaluation, and responsible experimentation.", ["Learning from Data", "Preparing Datasets", "Regression", "Classification", "Model Evaluation", "Capstone Experiment"]],
  ["13", "Learning and Time Management", "Personal Development", "Beginner", 4.9, 350, "4 weeks", 19, "Build sustainable study habits and plan your learning with confidence.", ["Setting Goals", "Planning Your Week", "Active Recall", "Focus and Breaks", "Reflective Practice", "Personal Learning Plan"]],
];

export const courses: Course[] = seeds.map(([id, title, category, level, rating, students, duration, price, description, lessonTitles]) => ({
  id, title, category, level, rating, students, duration, price, description,
  image: categoryImages[category],
  instructor: category === "Design" ? "Sarah Williams" : category === "Marketing" || category === "Business" ? "Michael Brown" : "Dr. Alex Johnson",
  instructorId: category === "Design" ? "instructor-2" : category === "Marketing" || category === "Business" ? "instructor-3" : "instructor-1",
  outcomes: [`Understand the core concepts of ${title.toLowerCase()}`, "Apply your skills through practical exercises", "Evaluate your work and improve with feedback", "Complete a project you can share in your portfolio"],
  lessons: makeLessons(lessonTitles, title),
}));
