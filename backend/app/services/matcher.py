from sentence_transformers.SentenceTransformer import SentenceTransformer
from sentence_transformers import util

# Load a lightweight, pre-trained model optimized for semantic similarity
# 'all-MiniLM-L6-v2' is fast and has high accuracy for this use case.
model = SentenceTransformer("all-MiniLM-L6-v2")


def calculate_matches(event_text: str, sponsors: list):
    """
    1. Encodes the event text.
    2. Encodes all sponsor descriptions.
    3. Calculates Cosine Similarity.
    4. Returns sorted results.
    """
    if not sponsors:
        return []

    # Prepare Sponsor Texts (Company Name + Notes regarding what they fund)
    sponsor_texts = [f"{s.company_name}: {s.notes or ''}" for s in sponsors]

    # Generate Embeddings
    event_embedding = model.encode(event_text, convert_to_tensor=True)
    sponsor_embeddings = model.encode(sponsor_texts, convert_to_tensor=True)

    # Calculate Cosine Similarity
    # Returns a list of scores corresponding to each sponsor
    cosine_scores = util.cos_sim(event_embedding, sponsor_embeddings)[0]

    # Format Results
    results = []
    for idx, score in enumerate(cosine_scores):
        results.append(
            {
                "sponsor_id": sponsors[idx].id,
                "company_name": sponsors[idx].company_name,
                "match_score": float(score),  # Convert tensor to float (0.0 to 1.0)
                "notes": sponsors[idx].notes,
            }
        )

    # Sort by Score (Highest First)
    results = sorted(results, key=lambda x: x["match_score"], reverse=True)

    return results
