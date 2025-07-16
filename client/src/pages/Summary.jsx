import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function Summary() {
  const { roomId } = useParams();
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [actionItems, setActionItems] = useState([]);

  useEffect(() => {
    const savedSummary = localStorage.getItem(`summary-${roomId}`);
    const savedTranscript = localStorage.getItem(`transcript-${roomId}`);

    if (savedSummary) {
      const lines = savedSummary.split("\n").filter(Boolean); // removes empty lines

      // Look for first non-bullet line = summary
      const summaryText =
        lines.find(
          (line) => !line.trim().startsWith("-") && !line.trim().startsWith("•")
        ) || "No summary found";

      // Get all bullet-style lines
      const items = lines.filter(
  (line) =>
    line.trim().startsWith("-") ||
    line.trim().startsWith("•") ||
    line.trim().startsWith("*")
);


      setSummary(summaryText);
      setActionItems(items);
    } else {
      setSummary("No summary found.");
    }

    if (savedTranscript) {
      setTranscript(savedTranscript);
    }
  }, [roomId]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧠 Meeting Summary</h1>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">📋 Summary</h2>
        <p className="text-gray-700">{summary}</p>
      </div>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">✅ Action Items</h2>
        <ul className="list-disc pl-6 text-gray-700">
  {actionItems.map((item, idx) => (
    <li key={idx}>{item.replace(/^(\*+|\-|\•)\s*/, "")}</li>
  ))}
</ul>

      </div>

      <div className="bg-white rounded shadow p-4 space-y-3">
        <h2 className="font-semibold text-lg">📝 Transcript</h2>
        <pre className="whitespace-pre-wrap text-gray-600">{transcript}</pre>
      </div>
    </div>
  );
}

export default Summary;
