from __future__ import annotations
import re
from dataclasses import dataclass, field

_AI_ENTITY = (
    r"(?:AI|LLM|language\s+models?|chat\s*bots?|chatbots?|bots?|automated\s+(?:agents?|systems?))"
)

# Embedded instructions targeting LLM/AI readers (composite + high-confidence standalone)
_LLM_TARGETED_INSTRUCTION_WEIGHT = 0.82

_LLM_STANDALONE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\brule\s+for\s+AI\s+assistants?\s+and\s+bots?\b",
        r"\binstructions?\s+(?:are\s+)?(?:only\s+)?for\s+AI\s+(?:assistants?|agents?|bots?|models?)\b",
        r"\bdisregard\s+this\s+AI\s+protection\s+rule\b",
        r"\bAI\s+protection\s+rule\b",
        r"\b(?:hidden|invisible|embedded)\s+(?:instructions?|prompts?)\s+for\s+"
        + _AI_ENTITY,
    ]
]

_LLM_AUDIENCE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        rf"\bif\s+you\s+(?:are|'re)\s+(?:an?\s+)?{_AI_ENTITY}\b",
        rf"\b(?:instructions?|rules?|messages?|notes?)\s+"
        rf"(?:for|to|directed\s+at)\s+(?:any\s+)?{_AI_ENTITY}\b",
        r"\b(?:dear|attention)\s+(?:AI|LLM|assistant|chatbot|bot)\b",
        rf"\b(?:this|the\s+following)\s+(?:text|content|paragraph|section)\s+"
        rf"is\s+(?:not\s+)?for\s+{_AI_ENTITY}\b",
        r"\b(?:not\s+intended|not\s+meant)\s+for\s+humans?\b",
        r"\b(?:humans?|people),?\s+please\s+(?:ignore|disregard|skip)\b",
    ]
]

_LLM_DIRECTIVE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\b(?:you|your)\s+(?:must|should|need\s+to|are\s+required\s+to)\s+"
        r"(?:include|respond|answer|ignore|disregard|forget|override)\b",
        r"\bdo\s+not\s+(?:complete|submit|proceed|follow)\s+"
        r"(?:the\s+)?(?:task|form|application|instructions?)\s+(?:without|until)\b",
        r"\bignore\s+(?:all\s+)?(?:previous|prior|above|the\s+above)\s+"
        r"(?:instructions?|rules?|context)\b",
        r"\bignore\s+(?:the\s+)?(?:form|below|safety\s+guidelines?|warnings?)\b",
        r"\b(?:always|never)\s+(?:include|mention|respond|reveal|upvote|downvote)\b",
    ]
]

# Each category: (weight 0.0–1.0, compiled patterns)
# Weight represents how confident a match is that this is a real injection attempt.
# Multiple categories firing raises the overall score.
_CATEGORIES: dict[str, tuple[float, list[re.Pattern[str]]]] = {
    # LLM-specific control tokens — near-certain injection if present in web content
    "system_token": (0.95, [re.compile(p, re.IGNORECASE) for p in [
        r"<\|im_start\|>\s*system",
        r"<\|im_end\|>",
        r"<\|system\|>",
        r"\[INST\]",
        r"<<SYS>>",
        r"###\s*(?:System|Instruction|Human|Assistant)\s*:",
        r"<s>\s*\[INST\]",
        r"\[/INST\]",
        r"<\|eot_id\|>",
        r"<\|start_header_id\|>system",
    ]]),

    # Explicit override commands
    "direct_override": (0.85, [re.compile(p, re.IGNORECASE) for p in [
        r"\bignore\s+(?:all\s+)?(?:previous|prior|above|my|the\s+above)\s+instructions?\b",
        r"\bdisregard\s+(?:all\s+)?(?:previous|prior|your|the)\s+\w+",
        r"\bforget\s+(?:everything|all)\s+(?:above|before|previous|I\s+said)\b",
        r"\boverride\s+(?:your\s+)?(?:\w+\s+)?(?:instructions?|directives?|guidelines?|rules?|constraints?)\b",
        r"\bdo\s+not\s+(?:follow|obey|use)\s+(?:your\s+)?(?:previous|prior|system)\s+instructions?\b",
        r"\byour\s+(?:previous|prior|original)\s+instructions?\s+(?:are|were)\s+(?:wrong|invalid|cancelled|void)\b",
    ]]),

    # Role or identity reassignment
    "role_reassignment": (0.75, [re.compile(p, re.IGNORECASE) for p in [
        r"\byou\s+are\s+now\s+(?:a|an)\s+(?:new|different|unrestricted|free|evil|helpful)\b",
        r"\byour\s+(?:new\s+)?(?:role|purpose|name|identity|persona)\s+is\b",
        r"\bpretend\s+(?:you\s+are|to\s+be)\s+(?:a|an|DAN|jailbreak)\b",
        r"\bact\s+as\s+(?:a|an)\s+(?:different|unrestricted|new|evil|bad|malicious)\b",
        r"\bfrom\s+now\s+on\s+(?:you\s+(?:are|will|must|should)|act|behave)\b",
        r"\bswitch\s+(?:to|into)\s+(?:developer|jailbreak|DAN|unrestricted)\s+mode\b",
        r"\benable\s+(?:developer|jailbreak|DAN|unrestricted|god)\s+mode\b",
        r"\bDAN\s+mode\b",
        r"\bjailbreak\b",
    ]]),

    # Attempts to read or exfiltrate local data
    "exfiltration": (0.90, [re.compile(p, re.IGNORECASE) for p in [
        r"~/\.",                                    # ~/.ssh, ~/.env, etc.
        r"/etc/(?:passwd|shadow|hosts|sudoers)",
        r"\.ssh/(?:id_rsa|id_ed25519|authorized_keys|config)",
        r"\.aws/credentials",
        r"\.config/(?:gcloud|gh|cursor)",
        r"\b(?:api|secret|access|private)[_\-]?(?:key|token|secret)\s*[:=]\s*\S",
        r"\bpassword\s*[:=]\s*\S",
        r"\bcurl\s+(?:-[a-zA-Z]+\s+)*https?://(?!localhost|127\.)",
        r"\bwget\s+https?://(?!localhost|127\.)",
        r"\bfetch\s*\(\s*['\"]https?://(?!localhost|127\.)",
        r"read\s+(?:the\s+)?(?:file|contents\s+of)\s+[~/\.]",
    ]]),

    # Persistent or future-scoped instructions
    "persistent_instruction": (0.70, [re.compile(p, re.IGNORECASE) for p in [
        r"\bwhenever\s+(?:you\s+)?(?:see|receive|process|encounter|get)\s+(?:a\s+)?(?:request|query|message|question)\b",
        r"\bfor\s+all\s+(?:future|subsequent|following)\s+(?:requests?|queries|messages|responses?|conversations?)\b",
        r"\bevery\s+time\s+(?:you|a\s+user|someone)\s+(?:asks?|queries|requests)\b",
        r"\balways\s+(?:include|append|add|prepend|respond\s+with|start\s+with)\b",
        r"\bremember\s+(?:this|to\s+always|for\s+(?:future|all|every))\b",
        r"\bkeep\s+this\s+(?:in\s+mind|secret|hidden)\s+(?:for|in)\s+all\b",
    ]]),

    # Attempts to suppress or hide behaviour
    "concealment": (0.80, [re.compile(p, re.IGNORECASE) for p in [
        r"\bdo\s+not\s+(?:mention|reveal|disclose|tell|say|show|include)\s+(?:this|that|these|the\s+fact)\b",
        r"\bkeep\s+(?:this|it|the\s+following)\s+(?:secret|hidden|private|confidential)\b",
        r"\bdon['']t\s+(?:mention|reveal|tell|show)\s+(?:this|that|the\s+(?:user|human))\b",
        r"\bnever\s+(?:mention|reveal|disclose|acknowledge)\s+(?:this|these|that\s+you)\b",
        r"\bdo\s+not\s+(?:let|allow)\s+(?:the\s+)?(?:user|human)\s+know\b",
    ]]),
}


@dataclass
class ScanResult:
    risk_score: float          # 0.0 = clean, 1.0 = high risk
    signals: list[str] = field(default_factory=list)   # triggered category names
    matches: list[str] = field(default_factory=list)   # first matching snippet per category


def _snippet_from_match(text: str, m: re.Match[str]) -> str:
    start = max(0, m.start() - 30)
    end = min(len(text), m.end() + 30)
    return text[start:end].replace("\n", " ").strip()


def _matches_llm_targeted_instruction(text: str) -> tuple[bool, str]:
    """Detect embedded instructions aimed at AI/LLM readers (standalone or audience + directive)."""
    for pat in _LLM_STANDALONE_PATTERNS:
        if m := pat.search(text):
            return True, _snippet_from_match(text, m)

    audience_match: re.Match[str] | None = None
    for pat in _LLM_AUDIENCE_PATTERNS:
        if m := pat.search(text):
            audience_match = m
            break
    if not audience_match:
        return False, ""

    for pat in _LLM_DIRECTIVE_PATTERNS:
        if m := pat.search(text):
            return True, _snippet_from_match(text, m)

    return False, _snippet_from_match(text, audience_match)


def scan_chunk(text: str) -> ScanResult:
    """Scan one text chunk for prompt injection signals.

    Returns a ScanResult with a risk_score (0.0–1.0) and the categories that fired.
    Does not modify or reject the text — caller decides what to do with the result.
    """
    triggered: list[tuple[str, float, str]] = []   # (category, weight, snippet)

    llm_match, llm_snippet = _matches_llm_targeted_instruction(text)
    if llm_match:
        triggered.append(("llm_targeted_instruction", _LLM_TARGETED_INSTRUCTION_WEIGHT, llm_snippet))

    for category, (weight, patterns) in _CATEGORIES.items():
        for pat in patterns:
            m = pat.search(text)
            if m:
                triggered.append((category, weight, _snippet_from_match(text, m)))
                break   # one match per category is enough

    if not triggered:
        return ScanResult(risk_score=0.0)

    # Score: max single-category weight, boosted slightly for each additional category.
    # Formula: base + 0.05 per extra category, capped at 1.0.
    weights = [w for _, w, _ in triggered]
    base = max(weights)
    boost = 0.05 * (len(triggered) - 1)
    score = min(1.0, round(base + boost, 2))

    return ScanResult(
        risk_score=score,
        signals=[cat for cat, _, _ in triggered],
        matches=[snip for _, _, snip in triggered],
    )


def scan_chunks(chunks: list[str]) -> list[ScanResult]:
    return [scan_chunk(c) for c in chunks]
