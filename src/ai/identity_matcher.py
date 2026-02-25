import sys
import json
from difflib import SequenceMatcher

def calculate_similarity(a, b):
    # Normalize
    a_parts = sorted(a.strip().upper().split())
    b_parts = sorted(b.strip().upper().split())
    
    a_norm = " ".join(a_parts)
    b_norm = " ".join(b_parts)
    
    # Direct match (order independent)
    if a_norm == b_norm:
        return 1.0
    
    # sequence matcher on normalized strings
    return SequenceMatcher(None, a_norm, b_norm).ratio()

def solve_query():
    try:
        # Expecting JSON input from stdin
        input_data = sys.stdin.read()
        if not input_data:
            return
            
        params = json.loads(input_data)
        
        name_a = params.get('name_a', '')
        name_b = params.get('name_b', '')
        
        score = calculate_similarity(name_a, name_b)
        
        # Cross-reference parts check
        parts_a = set(name_a.upper().split())
        parts_b = set(name_b.upper().split())
        
        inter = parts_a.intersection(parts_b)
        parts_match_ratio = len(inter) / max(len(parts_a), 1)
        
        # AI Logic: if overall similarity is > 0.6 and we have at least 2 name parts matching
        # OR if similarity is very high (> 0.85)
        passed = (score > 0.85) or (score > 0.6 and len(inter) >= 2)
        
        result = {
            "score": round(score, 4),
            "common_parts": list(inter),
            "passed": passed,
            "message": "Identity Verified" if passed else "Identity Mismatch Detected",
            "similarity_percent": f"{round(score * 100, 2)}%"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "passed": False}))

if __name__ == "__main__":
    solve_query()
