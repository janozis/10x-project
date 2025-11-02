# AI Evaluation Prompt Template - Szablon promptu dla workera

## Przegląd

Ten dokument opisuje jak powinien wyglądać prompt wysyłany do LLM w celu oceny aktywności harcerskiej.

## Kontekst systemowy (role: system)

```
Jesteś ekspertem w ocenie programów harcerskich oraz zgodności zajęć z wybraną tematyką lore.

Twoim zadaniem jest ocenić zajęcie harcerskie pod dwoma względami:
1. **Zgodność z lore** (1-10): Jak dobrze zajęcie pasuje do wybranej tematyki/klimatu obozu
2. **Wartości harcerskie** (1-10): Jak dobrze zajęcie realizuje cele wychowania harcerskiego

Dodatkowo, wygeneruj 3-5 pytań prowokujących instruktorów do przemyślenia i ewentualnego ulepszenia zajęcia.

## Skala ocen:
- 1-3: Wymaga znacznych poprawek
- 4-6: Dobra podstawa, sugerujemy zmiany
- 7-8: Bardzo dobre
- 9-10: Doskonałe

## Format odpowiedzi (JSON Schema):
{
  "lore_score": number (1-10),
  "lore_feedback": string (1-3 zdania uzasadnienia),
  "scouting_values_score": number (1-10),
  "scouting_feedback": string (1-3 zdania uzasadnienia),
  "suggestions": string[] (3-5 pytań prowokujących)
}
```

## Prompt użytkownika (role: user)

### Dane wejściowe z aktywności:

Worker pobiera z bazy następujące dane:
- `group.lore_theme` - tematyka obozu (np. "Słowiańszczyzna", "Fantasy", "Sci-Fi")
- `activity.title` - tytuł zajęcia
- `activity.objective` - cel zajęcia (perspektywa prowadzącego)
- `activity.tasks` - zadania/cele poboczne dla uczestników
- `activity.duration_minutes` - czas trwania
- `activity.location` - miejsce
- `activity.materials` - potrzebne materiały
- `activity.responsible` - osoby odpowiedzialne
- `activity.knowledge_scope` - wymagana wiedza
- `activity.participants` - uczestnicy (liczba, poziom)
- `activity.flow` - szczegółowy przebieg zbiórki
- `activity.summary` - podsumowanie

### Przykładowy prompt:

```
Oceń następujące zajęcie harcerskie:

## Kontekst obozu:
- Tematyka (lore): {group.lore_theme}

## Szczegóły zajęcia:
- Tytuł: {activity.title}
- Cel: {activity.objective}
- Zadania dla uczestników: {activity.tasks}
- Czas trwania: {activity.duration_minutes} minut
- Miejsce: {activity.location}
- Materiały: {activity.materials}
- Osoby odpowiedzialne: {activity.responsible}
- Wymagana wiedza: {activity.knowledge_scope}
- Uczestnicy: {activity.participants}
- Przebieg:
{activity.flow}
- Podsumowanie: {activity.summary}

## Kryteria oceny:
1. **Zgodność z lore**: Czy zajęcie wpisuje się w tematykę "{group.lore_theme}"? Czy klimat jest zachowany?
2. **Wartości harcerskie**: Czy zajęcie rozwija kompetencje harcerskie (praca w zespole, samodzielność, odpowiedzialność, umiejętności survivalowe, kreatywność)?

## Zadanie:
Oceń to zajęcie na skali 1-10 dla każdego kryterium i wygeneruj 3-5 pytań, które pomogą instruktorom zastanowić się jak ulepszyć zajęcie.
```

## Implementacja workera (szkic)

### Lokalizacja proponowana:
- `src/workers/ai-evaluation-worker.ts` (nowy plik)
- lub osobny serwis: `src/services/ai-evaluation-worker/` (katalog z modułami)

### Pseudokod workera:

```typescript
import { OpenRouterService } from "@/lib/services/openrouter";
import { supabase } from "@/db/supabase.client";

interface AIEvaluationResponse {
  lore_score: number;
  lore_feedback: string;
  scouting_values_score: number;
  scouting_feedback: string;
  suggestions: string[];
}

const AI_EVAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    lore_score: { type: "number", minimum: 1, maximum: 10 },
    lore_feedback: { type: "string", maxLength: 500 },
    scouting_values_score: { type: "number", minimum: 1, maximum: 10 },
    scouting_feedback: { type: "string", maxLength: 500 },
    suggestions: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: { type: "string", maxLength: 300 }
    }
  },
  required: ["lore_score", "lore_feedback", "scouting_values_score", "scouting_feedback", "suggestions"]
};

async function processAIEvaluationRequest(requestId: string) {
  // 1. Pobierz request ze statusem 'queued'
  const { data: request } = await supabase
    .from("ai_evaluation_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  // 2. Zmień status na 'processing'
  await supabase
    .from("ai_evaluation_requests")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", requestId);

  try {
    // 3. Pobierz dane aktywności + lore_theme z grupy
    const { data: activity } = await supabase
      .from("activities")
      .select(`
        *,
        groups!inner(lore_theme)
      `)
      .eq("id", request.activity_id)
      .single();

    // 4. Zbuduj prompt
    const systemPrompt = `Jesteś ekspertem w ocenie programów harcerskich...`; // (patrz wyżej)
    
    const userPrompt = `Oceń następujące zajęcie harcerskie:

## Kontekst obozu:
- Tematyka (lore): ${activity.groups.lore_theme}

## Szczegóły zajęcia:
- Tytuł: ${activity.title}
- Cel: ${activity.objective}
- Zadania dla uczestników: ${activity.tasks}
- Czas trwania: ${activity.duration_minutes} minut
- Miejsce: ${activity.location}
- Materiały: ${activity.materials}
- Osoby odpowiedzialne: ${activity.responsible}
- Wymagana wiedza: ${activity.knowledge_scope}
- Uczestnicy: ${activity.participants}
- Przebieg:
${activity.flow}
- Podsumowanie: ${activity.summary}

## Kryteria oceny:
1. **Zgodność z lore**: Czy zajęcie wpisuje się w tematykę "${activity.groups.lore_theme}"? Czy klimat jest zachowany?
2. **Wartości harcerskie**: Czy zajęcie rozwija kompetencje harcerskie?

## Zadanie:
Oceń to zajęcie na skali 1-10 dla każdego kryterium i wygeneruj 3-5 pytań prowokujących.`;

    // 5. Wywołaj LLM
    const llm = new OpenRouterService({
      defaultModel: "anthropic/claude-3.5-sonnet",
      defaultParams: {
        temperature: 0.3, // Niska temperatura dla bardziej konsystentnych ocen
        max_tokens: 2000
      }
    });

    const result = await llm.completeChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "AIEvaluation",
            strict: true,
            schema: AI_EVAL_SCHEMA
          }
        }
      }
    );

    // 6. Parsuj odpowiedź
    const evaluation: AIEvaluationResponse = JSON.parse(result.content);

    // 7. Walidacja (dodatkowa, na wypadek błędów LLM)
    if (evaluation.lore_score < 1 || evaluation.lore_score > 10) {
      evaluation.lore_score = Math.max(1, Math.min(10, Math.round(evaluation.lore_score)));
    }
    if (evaluation.scouting_values_score < 1 || evaluation.scouting_values_score > 10) {
      evaluation.scouting_values_score = Math.max(1, Math.min(10, Math.round(evaluation.scouting_values_score)));
    }
    if (evaluation.suggestions.length > 10) {
      evaluation.suggestions = evaluation.suggestions.slice(0, 10);
    }

    // 8. Wstaw do ai_evaluations (trigger nadaje version)
    await supabase
      .from("ai_evaluations")
      .insert({
        activity_id: request.activity_id,
        lore_score: evaluation.lore_score,
        lore_feedback: evaluation.lore_feedback,
        scouting_values_score: evaluation.scouting_values_score,
        scouting_feedback: evaluation.scouting_feedback,
        suggestions: evaluation.suggestions,
        tokens: result.usage?.total_tokens || null
      });

    // 9. Aktualizuj request na 'completed'
    await supabase
      .from("ai_evaluation_requests")
      .update({
        status: "completed",
        finished_at: new Date().toISOString()
      })
      .eq("id", requestId);

  } catch (error) {
    // 10. W przypadku błędu: oznacz jako 'failed'
    console.error("AI Evaluation failed:", error);
    await supabase
      .from("ai_evaluation_requests")
      .update({
        status: "failed",
        error_code: "INTERNAL_ERROR",
        error_message: String(error),
        finished_at: new Date().toISOString()
      })
      .eq("id", requestId);
  }
}

// Główna pętla workera (cron lub infinite loop)
async function runWorker() {
  while (true) {
    // Pobierz pending requesty
    const { data: requests } = await supabase
      .from("ai_evaluation_requests")
      .select("id")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(5); // Przetwarzaj max 5 na raz

    if (requests && requests.length > 0) {
      await Promise.all(
        requests.map(req => processAIEvaluationRequest(req.id))
      );
    }

    // Czekaj 10 sekund przed kolejnym sprawdzeniem
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

// Export dla cron job lub standalone service
export { processAIEvaluationRequest, runWorker };
```

## Deployment workera

### Opcja 1: Cron job (rekomendowane dla MVP)
- Supabase Edge Function z cron triggerem
- Skanuje kolejkę co 30-60 sekund
- Prosty deployment: `supabase functions deploy ai-evaluation-worker`

### Opcja 2: Standalone service
- Node.js service działający jako daemon
- Deploy na DigitalOcean obok głównej aplikacji
- PM2 lub systemd do zarządzania procesem

### Opcja 3: Serverless (przyszłość)
- AWS Lambda / Google Cloud Functions
- Trigger przez SQS/Pub-Sub
- Autoscaling przy dużym obciążeniu

## Bezpieczeństwo promptu

### Sanityzacja danych wejściowych:
```typescript
function sanitizeForPrompt(text: string): string {
  // Usuń potencjalnie niebezpieczne znaki
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // XSS
    .replace(/<[^>]+>/g, '') // HTML tags
    .substring(0, 5000); // Limit długości
}
```

### Rate limiting:
- Cooldown 5 minut (już zaimplementowany w RPC)
- Opcjonalnie: dzienny limit per grupa/użytkownik
- Monitoring kosztów API

## Monitorowanie

### Metryki do śledzenia:
- Czas przetwarzania żądania
- Liczba tokenów użytych
- Współczynnik sukcesu/błędów
- Średnie oceny generowane
- Koszt na żądanie

### Logi:
```typescript
console.log(`[AI Eval] Processing request ${requestId}`, {
  activityId: request.activity_id,
  startedAt: new Date().toISOString()
});

console.log(`[AI Eval] Completed request ${requestId}`, {
  loreScore: evaluation.lore_score,
  scoutingScore: evaluation.scouting_values_score,
  tokens: result.usage?.total_tokens,
  duration: Date.now() - startTime
});
```

## Testowanie

### Mock dla testów lokalnych:
```typescript
// Mock response dla development
const MOCK_EVALUATION: AIEvaluationResponse = {
  lore_score: 7,
  lore_feedback: "Zajęcie dobrze wpisuje się w tematykę słowiańską poprzez wykorzystanie tradycyjnych elementów kultury.",
  scouting_values_score: 8,
  scouting_feedback: "Aktywność rozwija umiejętności pracy w zespole oraz samodzielność uczestników.",
  suggestions: [
    "Czy można wzbogacić zajęcie o więcej elementów interaktywnych związanych z tematyką?",
    "Jak zapewnić, że wszyscy uczestnicy będą aktywnie zaangażowani?",
    "Czy można dodać element rywalizacji lub współpracy między grupami?"
  ]
};
```

## Następne kroki implementacji

1. ✅ API endpoints - **GOTOWE**
2. ✅ Database schema & RPC - **GOTOWE**
3. ✅ Frontend UI - **GOTOWE**
4. ⏳ **Worker implementation** - **DO ZROBIENIA**
   - Stwórz plik workera
   - Zaimplementuj logikę promptu
   - Dodaj sanityzację i walidację
   - Deploy jako edge function lub service
5. ⏳ Monitoring i logi
6. ⏳ Testy end-to-end

---

**Status**: Dokumentacja gotowa do implementacji workera
**Data**: 2025-11-01

