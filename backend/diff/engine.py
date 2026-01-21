"""Diff engine for comparing transcription outputs."""
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import difflib
import re

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

try:
    from ..models.base import TranscriptionResult
except ImportError:
    from models.base import TranscriptionResult


class DiffType(Enum):
    """Type of difference between words."""
    MATCH = "match"       # Word matches baseline
    CHANGED = "changed"   # Word differs from baseline
    MISSING = "missing"   # Word in baseline but not in model output
    ADDED = "added"       # Word in model output but not in baseline


@dataclass
class WordDiff:
    """Represents a difference at a single word position."""
    word_index: int
    baseline_word: Optional[str]
    model_word: Optional[str]
    diff_type: DiffType


@dataclass
class ModelComparison:
    """Comparison results for a single model against baseline."""
    model_name: str
    model_id: str
    transcription: str
    duration: float
    diffs: list[WordDiff] = field(default_factory=list)
    match_percent: float = 100.0
    color: str = "white"  # Rich color for this model


# Model colors for diff display
MODEL_COLORS = {
    "faster-whisper": "white",      # Baseline
    "openai-whisper": "green",
    "vosk": "cyan",
    "whisper-cpp": "yellow",
    "wav2vec2": "magenta",
    "parakeet": "blue",
}


def normalize_text(text: str) -> list[str]:
    """Normalize text and split into words for comparison."""
    # Lowercase, remove punctuation except apostrophes
    text = text.lower()
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.split()


class DiffEngine:
    """Engine for comparing transcription outputs from multiple models."""

    def __init__(self, baseline: TranscriptionResult):
        """
        Initialize with a baseline transcription.

        Args:
            baseline: The reference transcription to compare against
        """
        self.baseline = baseline
        self.baseline_words = normalize_text(baseline.text)

    def compare(self, other: TranscriptionResult) -> ModelComparison:
        """
        Compare another transcription against the baseline.

        Args:
            other: Transcription result to compare

        Returns:
            ModelComparison with diff details
        """
        other_words = normalize_text(other.text)

        # Use SequenceMatcher for word-level diff
        matcher = difflib.SequenceMatcher(None, self.baseline_words, other_words)

        diffs = []
        matches = 0
        word_index = 0

        for op, i1, i2, j1, j2 in matcher.get_opcodes():
            if op == 'equal':
                matches += (i2 - i1)
                word_index += (i2 - i1)
            elif op == 'replace':
                # Words changed
                for i in range(max(i2 - i1, j2 - j1)):
                    baseline_word = self.baseline_words[i1 + i] if i1 + i < i2 else None
                    model_word = other_words[j1 + i] if j1 + i < j2 else None

                    if baseline_word and model_word:
                        diffs.append(WordDiff(
                            word_index=word_index,
                            baseline_word=baseline_word,
                            model_word=model_word,
                            diff_type=DiffType.CHANGED
                        ))
                    elif baseline_word:
                        diffs.append(WordDiff(
                            word_index=word_index,
                            baseline_word=baseline_word,
                            model_word=None,
                            diff_type=DiffType.MISSING
                        ))
                    else:
                        diffs.append(WordDiff(
                            word_index=word_index,
                            baseline_word=None,
                            model_word=model_word,
                            diff_type=DiffType.ADDED
                        ))
                    word_index += 1
            elif op == 'delete':
                # Words in baseline but not in other
                for i in range(i1, i2):
                    diffs.append(WordDiff(
                        word_index=word_index,
                        baseline_word=self.baseline_words[i],
                        model_word=None,
                        diff_type=DiffType.MISSING
                    ))
                    word_index += 1
            elif op == 'insert':
                # Words in other but not in baseline
                for j in range(j1, j2):
                    diffs.append(WordDiff(
                        word_index=word_index,
                        baseline_word=None,
                        model_word=other_words[j],
                        diff_type=DiffType.ADDED
                    ))
                    word_index += 1

        # Calculate match percentage
        total_words = max(len(self.baseline_words), 1)
        match_percent = (matches / total_words) * 100

        return ModelComparison(
            model_name=other.model_name,
            model_id=getattr(other, 'model_id', other.model_name.lower().replace(' ', '-')),
            transcription=other.text,
            duration=other.duration,
            diffs=diffs,
            match_percent=match_percent,
            color=MODEL_COLORS.get(
                other.model_name.lower().replace(' ', '-'),
                "white"
            )
        )

    def render_comparison(
        self,
        comparisons: list[ModelComparison],
        console: Optional[Console] = None
    ) -> None:
        """
        Render comparison results to the console with colors.

        Args:
            comparisons: List of model comparisons
            console: Rich Console instance (creates one if not provided)
        """
        if console is None:
            console = Console()

        # Header
        console.print()
        console.print("=" * 70, style="bold")
        console.print("MODEL COMPARISON RESULTS", style="bold", justify="center")
        console.print("=" * 70, style="bold")
        console.print()

        # Summary table
        table = Table(title="Summary")
        table.add_column("Model", style="bold")
        table.add_column("Time", justify="right")
        table.add_column("Match", justify="right")
        table.add_column("Status")

        # Add baseline
        table.add_row(
            f"● {self.baseline.model_name}",
            f"{self.baseline.duration:.2f}s",
            "baseline",
            "[white]reference[/white]"
        )

        # Add comparisons
        for comp in comparisons:
            color = MODEL_COLORS.get(comp.model_id, "white")
            status = "✓ identical" if comp.match_percent == 100 else f"{len(comp.diffs)} diff(s)"
            table.add_row(
                f"[{color}]● {comp.model_name}[/{color}]",
                f"{comp.duration:.2f}s",
                f"{comp.match_percent:.0f}%",
                status
            )

        console.print(table)
        console.print()

        # Differences detail
        all_diffs = []
        for comp in comparisons:
            if comp.diffs:
                all_diffs.extend((comp, diff) for diff in comp.diffs)

        if not all_diffs:
            console.print("[green]All models produced identical transcriptions![/green]")
        else:
            console.print("-" * 70)
            console.print(f"DIFFERENCES FOUND ({len(set(d.word_index for _, d in all_diffs))} word positions differ):")
            console.print("-" * 70)
            console.print()

            # Group diffs by word index
            diffs_by_index: dict[int, list[tuple[ModelComparison, WordDiff]]] = {}
            for comp, diff in all_diffs:
                if diff.word_index not in diffs_by_index:
                    diffs_by_index[diff.word_index] = []
                diffs_by_index[diff.word_index].append((comp, diff))

            # Display each differing word
            for word_idx in sorted(diffs_by_index.keys()):
                word_diffs = diffs_by_index[word_idx]

                # Get baseline word
                baseline_word = None
                for comp, diff in word_diffs:
                    if diff.baseline_word:
                        baseline_word = diff.baseline_word
                        break

                console.print(f"Word #{word_idx + 1}: \"{baseline_word or '[none]'}\"")
                console.print(f"  ├─ Baseline:       {baseline_word or '[none]'}")

                # Show each model's version
                shown_models = set()
                for comp, diff in word_diffs:
                    color = MODEL_COLORS.get(comp.model_id, "white")
                    shown_models.add(comp.model_id)

                    if diff.diff_type == DiffType.CHANGED:
                        console.print(f"  ├─ [{color}]{comp.model_name}:[/{color}]    {diff.model_word}")
                    elif diff.diff_type == DiffType.MISSING:
                        console.print(f"  ├─ [{color}]{comp.model_name}:[/{color}]    [dim][missing][/dim]")
                    elif diff.diff_type == DiffType.ADDED:
                        console.print(f"  ├─ [{color}]{comp.model_name}:[/{color}]    +{diff.model_word}")

                # Show models that matched
                for comp in comparisons:
                    if comp.model_id not in shown_models:
                        console.print(f"  ├─ {comp.model_name}:    {baseline_word}  ✓")

                console.print()

        # Full baseline transcription
        console.print("-" * 70)
        console.print("FULL BASELINE TRANSCRIPTION:")
        console.print("-" * 70)
        console.print(Panel(self.baseline.text, border_style="dim"))
        console.print("=" * 70)

    def to_dict(self, comparisons: list[ModelComparison]) -> dict:
        """
        Convert comparison results to a dictionary (for API response).

        Args:
            comparisons: List of model comparisons

        Returns:
            Dictionary with comparison data
        """
        return {
            "baseline": {
                "model": self.baseline.model_name,
                "text": self.baseline.text,
                "duration": self.baseline.duration,
            },
            "comparisons": [
                {
                    "model": comp.model_name,
                    "model_id": comp.model_id,
                    "text": comp.transcription,
                    "duration": comp.duration,
                    "match_percent": comp.match_percent,
                    "differences": [
                        {
                            "word_index": d.word_index,
                            "baseline": d.baseline_word,
                            "model": d.model_word,
                            "type": d.diff_type.value,
                        }
                        for d in comp.diffs
                    ],
                }
                for comp in comparisons
            ],
        }
