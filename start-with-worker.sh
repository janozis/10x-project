#!/bin/bash
# Uruchamia Astro dev server + AI Evaluation Worker równolegle

echo "🚀 Starting AI Evaluation Worker in background..."
npm run worker:ai-eval > worker.log 2>&1 &
WORKER_PID=$!
echo "✓ Worker started (PID: $WORKER_PID)"
echo "📝 Worker logs: tail -f worker.log"

echo ""
echo "🚀 Starting Astro dev server..."
npm run dev

# Po Ctrl+C w Astro, zatrzymaj też workera
echo ""
echo "🛑 Stopping worker..."
kill $WORKER_PID 2>/dev/null
echo "✓ Done"

