from rapidfuzz import fuzz, distance
from typing import List, Dict

# Thresholds for flagged similarities
LEVENSHTEIN_THRESHOLD = 85.0 # For typo-squatted domains
JACCARD_THRESHOLD = 75.0     # For complex URL paths/metadata

def detect_typosquatting(new_domain: str, known_domains: List[str]) -> List[Dict[str, str]]:
    """
    Compares a newly extracted domain against a list of known legitimate or already analyzed domains
    using normalized Levenshtein distance.
    Returns a list of high-risk matches (e.g., 'micros0ft.com' vs 'microsoft.com').
    """
    matches = []
    for known in known_domains:
        # Rapidfuzz normalized distance returns a ratio 0-100
        ratio = fuzz.ratio(new_domain.lower(), known.lower())
        if ratio >= LEVENSHTEIN_THRESHOLD and ratio < 100: # 100 is exact match, handled normally
            matches.append({
                "known_domain": known,
                "typo_domain": new_domain,
                "similarity_score": round(ratio, 2)
            })
    return matches

def calculate_jaccard_similarity(str1: str, str2: str) -> float:
    """
    Calculates Jaccard similarity between two strings by tokenizing them.
    Highly effective for comparing long URL paths or file metadata strings 
    to identify related artifacts. 
    """
    # Tokenize by splitting on common URL/Path delimiters
    tokens1 = set(str1.replace('/', ' ').replace('-', ' ').replace('_', ' ').split())
    tokens2 = set(str2.replace('/', ' ').replace('-', ' ').replace('_', ' ').split())
    
    if not tokens1 or not tokens2:
        return 0.0
        
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    
    # Return as a 0-100 percentage
    return (len(intersection) / len(union)) * 100.0

def find_similar_paths(new_path: str, known_paths: List[str]) -> List[Dict[str, str]]:
    """Identifies highly similar URL structures utilizing Jaccard similarity."""
    matches = []
    for known in known_paths:
        score = calculate_jaccard_similarity(new_path.lower(), known.lower())
        if score >= JACCARD_THRESHOLD and score < 100.0:
            matches.append({
                "known_path": known,
                "similar_path": new_path,
                "jaccard_score": round(score, 2)
            })
    return matches
