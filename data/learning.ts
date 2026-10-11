import type { Category, Course } from "./courses";
export type Question = { question: string; options: string[]; answer: number; explanation: string };
type Entry = [string, string[], number, string];
const python: Entry[] = [
  ["Which function displays output in Python?", ["print()", "show()", "echo()", "display()"], 0, "print() sends text and values to the output."],
  ["Which command checks the installed Python version?", ["python --version", "python install", "python --name", "python run"], 0, "The --version option displays the interpreter version."],
  ["Which value is a string?", ["42", "True", "'Learnova'", "3.14"], 2, "Text enclosed in quotes is a string."],
  ["Which operator checks equality?", ["=", "==", "+=", "=>"], 1, "== compares values; = assigns a value."],
  ["Which keyword starts a conditional branch?", ["for", "def", "if", "class"], 2, "if evaluates a condition to select a branch."],
  ["What values does range(3) produce?", ["1, 2, 3", "0, 1, 2", "0, 1, 2, 3", "3 only"], 1, "range starts at zero and excludes the stop value."],
  ["Which keyword defines a function?", ["def", "function", "func", "return"], 0, "def declares a named Python function."],
  ["Which list index refers to the first item?", ["1", "-2", "0", "2"], 2, "Python lists use zero-based indexing."],
  ["Which structure associates keys with values?", ["String", "Dictionary", "Boolean", "Integer"], 1, "A dictionary maps keys to corresponding values."],
  ["What does self refer to in an instance method?", ["The current instance", "The module", "A global variable", "The interpreter"], 0, "self is the instance on which the method is called."],
];
const banks: Record<Category, Entry[]> = {
  Programming: [
    ["What is a variable used for?", ["Naming a value", "Styling a screen", "Deleting a file", "Measuring a monitor"], 0, "Variables give names to values used by a program."],
    ["Why use a function?", ["To duplicate code", "To group reusable behavior", "To remove input", "To hide every error"], 1, "Functions make a focused behavior reusable."],
    ["Which structure repeats a task?", ["Comment", "Constant", "Loop", "Import"], 2, "Loops repeat statements over items or conditions."],
    ["What is a boolean value?", ["An image", "A list", "A font", "True or false"], 3, "Booleans represent truth values."],
    ["What should input validation do?", ["Check that input meets rules", "Accept any value", "Remove all prompts", "Skip error messages"], 0, "Validation checks the form and range of incoming data."],
    ["Why use semantic HTML?", ["Only for color", "To express content structure", "To encrypt data", "To avoid CSS"], 1, "Semantic elements communicate meaning and structure."],
    ["What is responsive design?", ["Fixed desktop sizing", "Always hiding content", "Adapting to different screens", "Only using images"], 2, "Responsive layouts adapt across screen sizes."],
    ["What does a test help verify?", ["A code theme", "Internet speed", "A screen size", "Expected behavior"], 3, "Tests check behavior against expectations."],
    ["What is state in an interface?", ["Data that affects the current UI", "Only page colors", "A filename", "A browser brand"], 0, "State tracks data that changes the interface."],
    ["What makes a useful error message?", ["It hides the problem", "It explains a recovery step", "It blames the user", "It has no context"], 1, "Clear error messages help people recover."],
  ],
  Design: [
    ["What is the purpose of user research?", ["Understand user needs", "Choose random colors", "Skip testing", "Add more screens"], 0, "Research grounds design decisions in user needs."],
    ["What does a wireframe describe?", ["Final code", "Layout and structure", "Server settings", "Payment details"], 1, "Wireframes explore the structure before visual polish."],
    ["What does visual hierarchy guide?", ["File size", "Server speed", "Attention", "Passwords"], 2, "Hierarchy helps people notice and understand information."],
    ["Which is an accessibility practice?", ["Tiny text", "Color-only labels", "Hidden controls", "Clear labels and contrast"], 3, "Labels and readable contrast support more users."],
    ["What is a prototype?", ["A testable representation of a design", "A finished database", "A font license", "A user password"], 0, "Prototypes let you test interactions before implementation."],
    ["Why use a design system?", ["To avoid consistency", "To reuse coherent patterns", "To eliminate research", "To hide navigation"], 1, "Shared components and rules improve consistency."],
    ["What does usability testing observe?", ["Only colors", "Only file names", "People completing tasks", "Only page count"], 2, "Testing reveals how people use a design."],
    ["What makes typography readable?", ["Very small text", "Crowded lines", "Many fonts", "Clear size and spacing"], 3, "Readable type supports comprehension."],
    ["What should feedback after an action do?", ["Explain its result", "Disappear instantly", "Hide errors", "Change every layout"], 0, "Feedback confirms what happened and what comes next."],
    ["What should a portfolio case study explain?", ["Only screenshots", "Problem, decisions, and outcomes", "Only a logo", "Only tools used"], 1, "Case studies show the reasoning behind a design."],
  ],
  Marketing: [
    ["What comes before a marketing campaign?", ["Audience and goal definition", "Random posting", "Deleting metrics", "Ignoring the product"], 0, "Audience and goals guide a campaign."],
    ["What is a target audience?", ["Every website", "The people a campaign aims to reach", "A font", "A schedule only"], 1, "A target audience is a defined group of people."],
    ["What does SEO help improve?", ["Office layout", "Password strength", "Search visibility", "File storage"], 2, "SEO helps relevant content be discovered in search."],
    ["Which metric measures engagement?", ["File size", "Screen width", "A username", "Comments and shares"], 3, "Interactions are signals of audience engagement."],
    ["What is a call to action?", ["A prompt to take a next step", "A hidden link", "A logo only", "A file format"], 0, "A call to action helps people know what to do next."],
    ["Why maintain a content calendar?", ["To avoid planning", "To organize publishing", "To hide campaigns", "To skip review"], 1, "Calendars align content with timing and goals."],
    ["What is brand voice?", ["Audio volume", "A browser setting", "A consistent communication style", "A file name"], 2, "Brand voice describes how a brand communicates."],
    ["What should campaign evaluation compare?", ["Only colors", "Only length", "Only images", "Results against goals"], 3, "Evaluation compares outcomes with intended goals."],
    ["What is A/B testing?", ["Comparing two variations", "Posting twice randomly", "Removing analytics", "Copying a competitor"], 0, "A/B tests compare variations using a defined outcome."],
    ["What supports trust in marketing?", ["Unsupported promises", "Clear and accurate claims", "Hidden terms", "Misleading prices"], 1, "Honest, understandable communication builds trust."],
  ],
  Business: [], "Data Science": [], "Personal Development": [],
};
banks.Business = [
  ["What is a KPI?", ["A key performance indicator", "A password", "A file type", "A logo"], 0, "KPIs measure progress toward business goals."],
  ["What should an analysis start with?", ["Random charts", "A clear business question", "A font", "A prediction without data"], 1, "A question gives the analysis a purpose."],
  ["Which makes evidence more useful?", ["Ignoring sources", "Hiding uncertainty", "Checking data quality", "Removing context"], 2, "Data quality affects the reliability of conclusions."],
  ["What is a forecast?", ["A guaranteed result", "A past receipt", "An expense only", "An estimate of future outcomes"], 3, "Forecasts estimate outcomes using assumptions and evidence."],
  ["What is a budget?", ["A plan for income and spending", "Only a logo", "A file format", "A login"], 0, "Budgets help plan and control resources."],
  ["Why compare alternatives?", ["To delay every decision", "To assess tradeoffs", "To avoid evidence", "To hide costs"], 1, "Comparison makes the benefits and costs clearer."],
  ["What does revenue measure?", ["Only expenses", "Only headcount", "Income from sales", "Only profit"], 2, "Revenue is income before subtracting expenses."],
  ["What should a dashboard emphasize?", ["Every possible number", "Only decorations", "Hidden labels", "Relevant metrics"], 3, "Relevant metrics support decisions."],
  ["Why document assumptions?", ["To make conclusions reviewable", "To hide uncertainty", "To remove context", "To skip analysis"], 0, "Assumptions explain the limits of an analysis."],
  ["What is a useful recommendation?", ["An unsupported guess", "A clear action supported by evidence", "A chart without labels", "A promise without risks"], 1, "Recommendations connect evidence to an action."],
];
banks["Data Science"] = [
  ["What should precede data collection?", ["A clear question", "A random model", "A logo", "A password"], 0, "A question defines which data is useful."],
  ["What is data cleaning?", ["Deleting all rows", "Addressing missing or inconsistent values", "Changing fonts", "Hiding the source"], 1, "Cleaning improves data quality."],
  ["What helps explore a distribution?", ["A password", "A logo", "A histogram", "A file name"], 2, "Histograms show the distribution of values."],
  ["Which is a classification task?", ["Estimating temperature", "Predicting a price", "Adding two values", "Labeling an email as spam"], 3, "Classification predicts a category."],
  ["What is regression used for?", ["Predicting a numeric value", "Only grouping fonts", "Storing passwords", "Naming files"], 0, "Regression estimates continuous values."],
  ["Why separate training and test data?", ["To waste data", "To evaluate on unseen examples", "To avoid validation", "To guarantee perfection"], 1, "Unseen data helps assess generalization."],
  ["What is overfitting?", ["A perfect model", "Missing all data", "Learning training details that do not generalize", "A data format"], 2, "Overfit models perform poorly on new examples."],
  ["What should a chart include?", ["Only colors", "No scale", "Hidden units", "Labels and meaningful scales"], 3, "Labels make charts interpretable."],
  ["Does correlation prove causation?", ["No", "Always", "Only with a chart", "Only with many rows"], 0, "Correlation alone does not establish a causal relationship."],
  ["What is responsible reporting?", ["Hiding uncertainty", "Explaining methods and limitations", "Removing sources", "Promising certainty"], 1, "Transparent reporting supports informed interpretation."],
];
banks["Personal Development"] = [
  ["What makes a study goal useful?", ["A clear measurable outcome", "A vague promise", "No deadline", "No next step"], 0, "Concrete outcomes make progress visible."],
  ["What is active recall?", ["Only rereading", "Retrieving information from memory", "Skipping practice", "Copying notes"], 1, "Recall practice helps strengthen learning."],
  ["What is spaced practice?", ["All study in one night", "No review", "Review over multiple sessions", "Only watching videos"], 2, "Spacing gives repeated opportunities to retrieve knowledge."],
  ["What supports sustained focus?", ["Constant notifications", "No breaks", "Many unrelated tasks", "Planned work and breaks"], 3, "Planned intervals help manage attention."],
  ["Why reflect after a study session?", ["To identify what to improve", "To avoid practice", "To remove goals", "To compare unrelated topics"], 0, "Reflection helps adjust the next session."],
  ["How should a large task be planned?", ["As one vague step", "As smaller actionable steps", "Without priorities", "Without time estimates"], 1, "Smaller steps make the work manageable."],
  ["What should a weekly plan include?", ["Only work", "Only breaks", "Priorities and realistic time", "No flexibility"], 2, "Realistic planning supports consistency."],
  ["What is useful feedback?", ["Only praise", "Only criticism", "No examples", "Specific guidance for improvement"], 3, "Specific guidance makes feedback actionable."],
  ["What helps track progress?", ["Recording completed goals", "Ignoring results", "Changing every goal daily", "Avoiding reflection"], 0, "Recording outcomes makes growth visible."],
  ["What makes a learning habit sustainable?", ["Unrealistic hours", "Consistent, manageable practice", "No recovery", "No purpose"], 1, "Manageable practice is easier to sustain."],
];

export const quizFor = (course: Course): Question[] => course.quiz ?? (course.id === "1" ? python : banks[course.category]).map(([question, options, answer, explanation]) => ({ question, options, answer, explanation }));
export type Assignment = { id: string; courseId: string; title: string; instructions: string; due: string };
export const assignmentFor = (course: Course): Assignment => ({
  id: `assignment-${course.id}`, courseId: course.id, title: course.assignment?.title ?? `${course.title}: Practical Project`, due: course.assignment?.due ?? "2026-10-21",
  instructions: course.assignment?.instructions ?? `Create a practical project applying the concepts from ${course.title}. Describe the problem, explain your approach, and include evidence of your result. Submit a 200–500 word reflection and optionally attach your project. Assessment: understanding (40%), practical application (40%), and clarity (20%).`,
});
