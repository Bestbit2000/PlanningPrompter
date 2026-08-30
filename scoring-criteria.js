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
                { id: "safety", name: "Safety / Tone", description: "Educational tone, clear disclaimers, strictly avoids giving regulated financial advice." }
            ]
        }
    ]
};