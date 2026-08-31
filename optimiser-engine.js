// Shared prompt-optimisation engine.
//
// Holds the Gemini API call, the scoring-rubric plumbing, and the iterative
// "rewrite -> test -> score -> keep best" loop used to turn a rough prompt into
// one that scores well against scoring-criteria.js's EVALUATION_CONFIG. Used by
// both prompt-evaluater.html (manual side-by-side testing) and prompt-editor.html
// (one-click "Create optimised prompt" from a question's human version), so the
// methodology only lives in one place.
//
// Requires scoring-criteria.js (EVALUATION_CONFIG) to be loaded first.

(function () {
  const MODEL_NAME = "gemini-2.5-flash";

  const SETTINGS_KEYS = {
    apiKey: 'gemini_api_key',
    logDelay: 'gemini_log_delay',
    targetScore: 'gemini_target_score',
    maxIterations: 'gemini_max_iterations'
  };
  const SETTINGS_DEFAULTS = {
    logDelay: 3,
    targetScore: 95,
    maxIterations: 3
  };

  function getSettings() {
    return {
      apiKey: localStorage.getItem(SETTINGS_KEYS.apiKey) || '',
      logDelay: parseInt(localStorage.getItem(SETTINGS_KEYS.logDelay)) || SETTINGS_DEFAULTS.logDelay,
      targetScore: parseInt(localStorage.getItem(SETTINGS_KEYS.targetScore)) || SETTINGS_DEFAULTS.targetScore,
      maxIterations: parseInt(localStorage.getItem(SETTINGS_KEYS.maxIterations)) || SETTINGS_DEFAULTS.maxIterations
    };
  }

  function saveSettings(partial) {
    if (partial.apiKey !== undefined) localStorage.setItem(SETTINGS_KEYS.apiKey, partial.apiKey);
    if (partial.logDelay !== undefined) localStorage.setItem(SETTINGS_KEYS.logDelay, partial.logDelay);
    if (partial.targetScore !== undefined) localStorage.setItem(SETTINGS_KEYS.targetScore, partial.targetScore);
    if (partial.maxIterations !== undefined) localStorage.setItem(SETTINGS_KEYS.maxIterations, partial.maxIterations);
  }

  // Lifetime telemetry — persisted so token spend and optimisation timing build up
  // across visits, not just within one page session.
  const TELEMETRY_KEYS = {
    totalTokens: 'gemini_lifetime_tokens',
    totalCalls: 'gemini_lifetime_calls',
    optRunCount: 'gemini_opt_run_count',
    optTotalMs: 'gemini_opt_total_ms'
  };

  function getTelemetry() {
    const optRunCount = parseInt(localStorage.getItem(TELEMETRY_KEYS.optRunCount)) || 0;
    const optTotalMs = parseInt(localStorage.getItem(TELEMETRY_KEYS.optTotalMs)) || 0;
    return {
      totalTokens: parseInt(localStorage.getItem(TELEMETRY_KEYS.totalTokens)) || 0,
      totalCalls: parseInt(localStorage.getItem(TELEMETRY_KEYS.totalCalls)) || 0,
      optRunCount,
      optAverageMs: optRunCount > 0 ? Math.round(optTotalMs / optRunCount) : null
    };
  }

  function recordApiCall(tokens) {
    const curTokens = parseInt(localStorage.getItem(TELEMETRY_KEYS.totalTokens)) || 0;
    const curCalls = parseInt(localStorage.getItem(TELEMETRY_KEYS.totalCalls)) || 0;
    localStorage.setItem(TELEMETRY_KEYS.totalTokens, curTokens + (tokens || 0));
    localStorage.setItem(TELEMETRY_KEYS.totalCalls, curCalls + 1);
  }

  function recordOptimisationDuration(ms) {
    const curCount = parseInt(localStorage.getItem(TELEMETRY_KEYS.optRunCount)) || 0;
    const curTotalMs = parseInt(localStorage.getItem(TELEMETRY_KEYS.optTotalMs)) || 0;
    localStorage.setItem(TELEMETRY_KEYS.optRunCount, curCount + 1);
    localStorage.setItem(TELEMETRY_KEYS.optTotalMs, curTotalMs + ms);
  }

  function formatDuration(ms) {
    if (ms == null) return null;
    const secs = ms / 1000;
    if (secs < 60) return secs.toFixed(1) + 's';
    const mins = Math.floor(secs / 60);
    const rem = Math.round(secs % 60);
    return `${mins}m ${rem}s`;
  }

  function getMaxPossibleScore() {
    let max = 0;
    EVALUATION_CONFIG.pillars.forEach((p) => { max += p.metrics.length * 10; });
    return max;
  }

  function calculatePercentageScore(dataNode) {
    let computed = 0;
    EVALUATION_CONFIG.pillars.forEach((pillar) => {
      pillar.metrics.forEach((metric) => { computed += (dataNode[pillar.id][metric.id] || 0); });
    });
    return Math.round((computed / getMaxPossibleScore()) * 100);
  }

  function generateJudgeInstructions(single = false) {
    let instructions = "";
    let jsonSchema = single ? { result: {} } : { promptA: {}, promptB: {} };

    EVALUATION_CONFIG.pillars.forEach((pillar, i) => {
      instructions += `${i + 1}. ${pillar.title}\n`;
      if (single) jsonSchema.result[pillar.id] = {};
      else { jsonSchema.promptA[pillar.id] = {}; jsonSchema.promptB[pillar.id] = {}; }

      pillar.metrics.forEach((metric) => {
        instructions += `   - ${metric.id}: ${metric.description}\n`;
        if (single) jsonSchema.result[pillar.id][metric.id] = 0;
        else { jsonSchema.promptA[pillar.id][metric.id] = 0; jsonSchema.promptB[pillar.id][metric.id] = 0; }
      });
    });

    if (single) {
      jsonSchema.result.overall = 0;
      jsonSchema.result.feedback = "Brief specific reason noting exact flaws.";
    } else {
      jsonSchema.promptA.overall = 0;
      jsonSchema.promptA.feedback = "Brief specific reason noting exact flaws.";
      jsonSchema.promptB.overall = 0;
      jsonSchema.promptB.feedback = "Brief specific reason noting exact flaws.";
    }
    return { text: instructions, schema: JSON.stringify(jsonSchema, null, 2) };
  }

  function buildSingleJudgePrompt(rubricSetup, styleConstraint, responseText) {
    return `You are an expert financial auditor. Evaluate this response based on the pillars. Score strictly out of 10.
Target Style: "${styleConstraint}"
${rubricSetup.text}
Return ONLY valid JSON matching this structure:
${rubricSetup.schema}
Response to Evaluate: "${responseText}"`;
  }

  function buildRewritePrompt(currentPrompt, styleConstraint, feedback) {
    return `
You are an expert prompt engineer. Rewrite the user's prompt to fix flaws and score a perfect 100% on our Rubric.
Current prompt: "${currentPrompt}"
Target style: "${styleConstraint}"
Previous flaws/feedback to fix: "${feedback}"

INSTRUCTIONS:
Split the prompt into two clear sections:
- "Part 1: Core Task" (Define scenario, UK context, factual requirements).
- "Part 2: Formatting & Guardrails" (Explicit instructions enforcing 250-500 word limit, BLUF, drill-downs, and Target Style).
Return ONLY the finalized prompt text.
`;
  }

  async function callGeminiApi(apiKey, promptText, expectJson = false) {
    if (!apiKey) throw new Error("Missing API key. Please add it in settings.");

    const payload = { contents: [{ parts: [{ text: promptText }] }] };
    if (expectJson) payload.generationConfig = { responseMimeType: "application/json" };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err.error && err.error.message) || "API request failed");
    }

    const data = await response.json();
    const tokens = data.usageMetadata ? data.usageMetadata.totalTokenCount : 0;
    recordApiCall(tokens);
    return { text: data.candidates[0].content.parts[0].text, tokens };
  }

  // Runs the baseline-then-rewrite-loop optimisation.
  //
  // opts:
  //   apiKey, startingPrompt, styleConstraint, maxIterations, targetScore
  //   logger: { log(message, tokens = 0) } — called for every step.
  //     Optional richer callbacks, called if present:
  //       onBaseline({ score, responseText, feedback })
  //       onIteration({ iteration, score, isNewBest, prompt, responseText, feedback })
  //   initial (optional): { score, responseText, feedback } — a pre-computed
  //     baseline (e.g. from a prior "Score AI output" run) to skip re-testing
  //     startingPrompt from scratch.
  //
  // Returns: { initialScore, initialResponseText, initialFeedback,
  //            bestScore, bestPrompt, bestResponseText, bestFeedback, iterationsRun, elapsedMs }
  async function runOptimisationLoop({ apiKey, startingPrompt, styleConstraint, maxIterations, targetScore, logger, initial }) {
    const startTime = Date.now();
    const rubricSetup = generateJudgeInstructions(true);
    let initialScore, initialResponseText, initialFeedback;

    if (initial) {
      initialScore = initial.score;
      initialResponseText = initial.responseText;
      initialFeedback = initial.feedback;
    } else {
      logger.log('Testing starting prompt...');
      const genResp = await callGeminiApi(apiKey, startingPrompt, false);
      logger.log('Got baseline output.', genResp.tokens);
      const judgeResp = await callGeminiApi(apiKey, buildSingleJudgePrompt(rubricSetup, styleConstraint, genResp.text), true);
      logger.log('Scored baseline output.', judgeResp.tokens);
      const judgeData = JSON.parse(judgeResp.text);
      initialScore = calculatePercentageScore(judgeData.result);
      initialResponseText = genResp.text;
      initialFeedback = judgeData.result.feedback;
    }

    if (logger.onBaseline) logger.onBaseline({ score: initialScore, responseText: initialResponseText, feedback: initialFeedback });

    let bestPrompt = startingPrompt;
    let bestScore = initialScore;
    let currentFeedback = initialFeedback;
    let bestResponseText = initialResponseText;
    let iterationsRun = 0;

    if (bestScore >= targetScore) {
      logger.log(`Starting prompt already meets target (${bestScore}%). No iterations needed.`);
      const elapsedMs = Date.now() - startTime;
      recordOptimisationDuration(elapsedMs);
      return { initialScore, initialResponseText, initialFeedback, bestScore, bestPrompt, bestResponseText, bestFeedback: currentFeedback, iterationsRun, elapsedMs };
    }

    for (let i = 1; i <= maxIterations; i++) {
      iterationsRun = i;
      logger.log(`[Loop ${i}/${maxIterations}] Starting optimisation phase...`);

      const rewritePrompt = buildRewritePrompt(bestPrompt, styleConstraint, currentFeedback);
      const genPromptResponse = await callGeminiApi(apiKey, rewritePrompt, false);
      logger.log(`Generated improved prompt (Iteration ${i}).`, genPromptResponse.tokens);
      const newPrompt = genPromptResponse.text.trim();

      const newGenResponse = await callGeminiApi(apiKey, newPrompt, false);
      logger.log(`Tested new prompt outcome (Iteration ${i}).`, newGenResponse.tokens);

      const judgePrompt = buildSingleJudgePrompt(rubricSetup, styleConstraint, newGenResponse.text);
      const judgeEvalResponse = await callGeminiApi(apiKey, judgePrompt, true);
      logger.log(`Scored new outcome (Iteration ${i}).`, judgeEvalResponse.tokens);
      const judgeData = JSON.parse(judgeEvalResponse.text);
      const newScore = calculatePercentageScore(judgeData.result);
      const isNewBest = newScore > bestScore;

      if (logger.onIteration) {
        logger.onIteration({ iteration: i, score: newScore, isNewBest, prompt: newPrompt, responseText: newGenResponse.text, feedback: judgeData.result.feedback });
      }

      if (isNewBest) {
        logger.log(`[Loop ${i}] New best score achieved: ${newScore}%`);
        bestScore = newScore;
        bestPrompt = newPrompt;
        currentFeedback = judgeData.result.feedback;
        bestResponseText = newGenResponse.text;
      } else {
        logger.log(`[Loop ${i}] Score ${newScore}% did not beat current best (${bestScore}%).`);
      }

      if (bestScore >= targetScore) {
        logger.log('[Auto-Loop] Target score reached! Stopping early.');
        break;
      } else if (i === maxIterations) {
        logger.log('[Auto-Loop] Max iterations reached.');
      }
    }

    const elapsedMs = Date.now() - startTime;
    recordOptimisationDuration(elapsedMs);
    logger.log(`Finished in ${formatDuration(elapsedMs)}.`);

    return { initialScore, initialResponseText, initialFeedback, bestScore, bestPrompt, bestResponseText, bestFeedback: currentFeedback, iterationsRun, elapsedMs };
  }

  window.PromptOptimiser = {
    MODEL_NAME,
    getSettings,
    saveSettings,
    getTelemetry,
    formatDuration,
    getMaxPossibleScore,
    calculatePercentageScore,
    generateJudgeInstructions,
    buildSingleJudgePrompt,
    buildRewritePrompt,
    callGeminiApi,
    runOptimisationLoop
  };
})();
