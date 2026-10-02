const EVALUATION_CONFIG = {
    pillars: [
        {
            id: "accuracy",
            title: "1. Accuracy",
            metrics: [
                { id: "temporal", name: "Up to date responses", description: "Uses current/up-to-date figures from the latest tax year. Penalize outdated data heavily." },
                { id: "jurisdictional", name: "Localised to the UK", description: "Accurately uses UK frameworks (ISA, SIPP) and terminology (not US)." },
                { id: "factual", name: "Factually correct", description: "Math, definitions, and technical rules are correct and can be justified by official sources." }
            ]
        },
        {
            id: "structure",
            title: "2. Structure & Usability",
            metrics: [
                { id: "directness", name: "Immediate answer", description: "Core answer is shown immediately and the response can be reprentative of the first line of each paragraph. Penalize buried answers." },
                { id: "hierarchy", name: "Easy to scan", description: "Excellent scannability, no walls of text. Avoids repetitive nested sub-labels and don't repeat who you are or the instructions." },
                { id: "formatting", name: "Formatting", description: "Uses headers, bold, tables, horizontal rules, and bullet points appropriately to make it easier to read." }
            ]
        },
        {
            id: "readability",
            title: "3. Readability",
            metrics: [
                { id: "britishEnglish", name: "British English", description: "STRICTLY uses British English spelling and phrasing (e.g., colour, analyse, pension rather than 401k)." },
                { id: "conciseness", name: "Conciseness", description: "Target length is 250 to 500 words. Responses over 500 words must be heavily penalized as poor/unreadable. The answer should suggest drill-down follow up questions for further detail rather than dumping it all at once." },
                { id: "clarity", name: "Jargon free", description: "Plain language, completely avoids unexplained jargon. No technical or hard to understand wording" }
            ]
        },
        {
            id: "actionSafety",
            title: "4. Action & Safety",
            metrics: [
                { id: "actionability", name: "Actionability", description: "Provides concrete guidance, clear trade-offs, and next steps." },
                { id: "intent", name: "Intent Resolution", description: "Actually answers the user's core query without excessive scope creep or unsolicited lectures." },
                { id: "safety", name: "Safety / Tone", description: "Educational tone. Opens by saying it is general information, not regulated financial advice. Does not recommend a specific product, provider, fund or course of action. States the tax year its figures are for. Flags irreversible steps. Ends by pointing to MoneyHelper, Pension Wise and a regulated adviser. Penalize heavily if any of these is missing." }
            ]
        }
    ]
};

// Guardrails every optimised prompt must carry, whatever the question. The
// optimiser adds them to its rewrite instructions. See RISKS.md (R1-R3, R6-R8).
const PROMPT_GUARDRAIL_RULES = [
    "Tell the AI to open its answer by saying this is general information and not regulated financial advice.",
    "Tell the AI not to recommend a specific product, provider, fund or course of action; it should explain the options and their trade-offs instead.",
    "Do not write any tax year, allowance or other figure into the prompt. Tell the AI to use the current UK tax year, to state which tax year its figures are for, and to tell the user to check them on GOV.UK.",
    "Tell the AI to say when it is unsure rather than guess, and to state any assumptions it makes.",
    "Tell the AI to flag any step that cannot be undone (for example transferring a defined benefit pension, cashing in a pot or buying an annuity) and to mention pension scam warning signs where relevant.",
    "Tell the AI to end by pointing to free, impartial guidance from MoneyHelper and Pension Wise, and to a regulated financial adviser who can be checked on the FCA Register."
];