import { useState, type FormEvent } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { askAi } from "../api/analytics";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const res = await askAi(userMessage.content);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer },
      ]);
    } catch (err: any) {
      setError(
        err?.response?.status === 503
          ? "AI Analyst is unavailable — make sure Ollama is running locally (`ollama serve`). Analytics and monitoring features still work normally."
          : (err?.response?.data?.detail ??
              "Something went wrong asking the AI Analyst."),
      );
    } finally {
      setLoading(false);
    }
  }

  const suggestedQuestions = [
    "Why is the application slow?",
    "Which endpoint is the slowest?",
    "Which service has the highest error rate?",
    "Which region is performing worst?",
    "What should I investigate first?",
  ];

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom>
        AI Analyst
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ask questions about your application's performance. Answers are grounded
        in computed metrics — the model never sees raw logs directly.
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, minHeight: 240, maxHeight: 480, overflowY: "auto" }}
      >
        {messages.length === 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {suggestedQuestions.map((q) => (
              <Button
                key={q}
                size="small"
                variant="outlined"
                onClick={() => setQuestion(q)}
              >
                {q}
              </Button>
            ))}
          </Box>
        )}
        {messages.map((m, i) => (
          <Box
            key={i}
            sx={{
              mb: 2,
              textAlign: m.role === "user" ? "right" : "left",
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                display: "inline-block",
                p: 1.5,
                maxWidth: "80%",
                bgcolor: m.role === "user" ? "primary.main" : "grey.100",
                color: m.role === "user" ? "primary.contrastText" : "inherit",
              }}
            >
              <Typography variant="body2">{m.content}</Typography>
            </Paper>
          </Box>
        ))}
        {loading && <CircularProgress size={20} />}
      </Paper>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", gap: 1 }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Ask about performance, errors, or reliability..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={loading}>
          Ask
        </Button>
      </Box>
    </Box>
  );
}
