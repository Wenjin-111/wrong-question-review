"""
FSRS (Free Spaced Repetition Scheduler) implementation.

Rating scale (mapped from review results):
  1 = Again   — answered incorrectly
  2 = Hard    — correct but struggled (self-rated)
  3 = Good    — correct with normal effort (default for correct)
  4 = Easy    — correct effortlessly (self-rated)
"""

import math


def compute_retrievability(elapsed_days: float, stability: float) -> float:
    """Probability of recall after elapsed_days given current stability."""
    if stability <= 0:
        return 1.0
    return math.exp(math.log(0.9) * elapsed_days / stability)


def compute_next_difficulty(d: float, rating: int) -> float:
    """Update difficulty based on rating feedback."""
    # rating 1 → harder, rating 4 → easier
    delta = -0.15 * (rating - 3)
    d_prime = d + delta * (1.0 / 3.0)
    # Clamp to valid range
    return round(max(0.3, min(0.95, d_prime)), 4)


def compute_next_stability(
    s: float, d: float, rating: int, r: float, request_retention: float = 0.90
) -> float:
    """Compute post-review stability using FSRS-like formula."""
    if rating == 1:
        # Again: stability drops significantly
        s_prime = s * max(0.3, 1.0 - 0.7 * d)
        s_prime = max(0.1, s_prime)
    elif rating == 2:
        # Hard: modest gain
        s_prime = s * (1.0 + 0.15 * math.exp(-d * 3))
    elif rating == 3:
        # Good: normal gain factoring retrievability
        factor = math.exp(0.5 * (1.0 - r))
        gain = 1.0 + (factor - 1.0) * (1.0 - d * 0.5)
        s_prime = s * gain
    else:
        # Easy: large gain
        factor = math.exp(1.0 * (1.0 - r))
        gain = 1.0 + (factor - 1.0) * (1.0 - d * 0.3)
        s_prime = s * gain

    s_prime = round(max(0.1, s_prime), 4)
    return s_prime


def compute_interval(stability: float, request_retention: float = 0.90) -> float:
    """Convert stability to an interval in days."""
    if stability <= 0:
        return 1.0 / 1440.0  # 1 minute as minimum
    # interval = stability * ln(retention) / ln(0.9)
    interval = stability * math.log(request_retention) / math.log(0.9)
    # Cap at 365 days
    return round(max(1.0 / 1440.0, min(365.0, abs(interval))), 4)


def init_fsrs_state() -> dict:
    """Return the initial FSRS state for a new question."""
    return {
        "stability": 0.5,  # 30 minutes initial
        "difficulty": 0.5,
        "reps": 0,
        "state": 0,  # 0=new
    }


def apply_fsrs(
    current_stability: float,
    current_difficulty: float,
    rating: int,
    elapsed_days: float = 0,
    request_retention: float = 0.90,
) -> dict:
    """
    Apply FSRS to compute new state after a review.

    Returns dict with: stability, difficulty, interval_days, retrievability, reps_increment
    """
    r = compute_retrievability(elapsed_days, current_stability) if current_stability > 0 else 1.0
    new_s = compute_next_stability(current_stability, current_difficulty, rating, r, request_retention)
    new_d = compute_next_difficulty(current_difficulty, rating)
    interval = compute_interval(new_s, request_retention)
    return {
        "stability": new_s,
        "difficulty": new_d,
        "interval_days": interval,
        "retrievability": round(r, 4),
    }
