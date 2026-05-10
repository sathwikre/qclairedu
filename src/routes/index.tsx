import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  // The quiz is a self-contained static app served from /public.
  return (
    <iframe
      src="/quiz.html"
      title="QuantumQuiz"
      style={{ border: 0, width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
