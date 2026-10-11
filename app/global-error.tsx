"use client";
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="en"><body style={{ margin: 0, padding: "4rem 1rem", background: "#f7fbff", color: "#0b1f44", fontFamily: "Arial, sans-serif", textAlign: "center" }}><h1>Learnova could not start.</h1><p>Please try again to return to your learning workspace.</p><button style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: 0, borderRadius: 12, cursor: "pointer" }} onClick={retry}>Try Again</button></body></html>;
}
