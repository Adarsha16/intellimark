import re
import logging
import numpy as np
from typing import List, Dict, Any, Tuple, Set
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter, defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 1. ENHANCED DOMAIN KNOWLEDGE BASE ---
DOMAIN_KNOWLEDGE = {
    # NATURE / ECO - Enhanced with more specific terms
    "nature": {
        "synonyms": [
            "environment",
            "green",
            "sustainable",
            "eco",
            "planting",
            "garden",
            "solar",
            "climate",
            "earth",
            "botanical",
            "organic",
            "agriculture",
            "forest",
            "ecology",
            "conservation",
            "biodiversity",
            "renewable",
            "carbon",
            "zero-waste",
            "recycling",
        ],
        "related": [
            "outdoor",
            "wildlife",
            "clean",
            "energy",
            "water",
            "conservation",
            "farming",
        ],
        "boost_words": ["eco", "green", "sustainable", "environmental"],
    },
    # TECH - Enhanced
    "tech": {
        "synonyms": [
            "software",
            "technology",
            "developer",
            "coding",
            "hackathon",
            "app",
            "digital",
            "saas",
            "cyber",
            "robotics",
            "programming",
            "computer",
            "internet",
            "web",
            "mobile",
            "cloud",
            "devops",
            "api",
            "opensource",
            "blockchain",
        ],
        "related": [
            "innovation",
            "digital",
            "solution",
            "platform",
            "system",
            "network",
        ],
        "boost_words": ["tech", "software", "digital", "app"],
    },
    # BUSINESS
    "business": {
        "synonyms": [
            "entrepreneur",
            "startup",
            "management",
            "marketing",
            "corporate",
            "finance",
            "capital",
            "investment",
            "venture",
            "consulting",
            "enterprise",
            "strategy",
        ],
        "related": ["leadership", "growth", "scaling", "funding", "market", "sales"],
        "boost_words": ["business", "startup", "corporate"],
    },
    # LIFESTYLE
    "food": {
        "synonyms": [
            "beverage",
            "catering",
            "snacks",
            "drinks",
            "restaurant",
            "dining",
            "culinary",
            "coffee",
            "tea",
            "bakery",
            "brewery",
            "winery",
            "organic",
            "farm",
        ],
        "related": ["health", "nutrition", "cooking", "recipe", "meal", "diet"],
        "boost_words": ["food", "restaurant", "coffee", "culinary"],
    },
    # HEALTH
    "health": {
        "synonyms": [
            "wellness",
            "fitness",
            "medical",
            "mental",
            "sports",
            "yoga",
            "gym",
            "therapy",
            "nutrition",
            "mindfulness",
            "rehabilitation",
            "healthcare",
        ],
        "related": ["medicine", "doctor", "hospital", "clinic", "training", "exercise"],
        "boost_words": ["health", "wellness", "fitness", "medical"],
    },
    # ART
    "art": {
        "synonyms": [
            "design",
            "creative",
            "music",
            "performance",
            "media",
            "film",
            "culture",
            "exhibition",
            "photography",
            "painting",
            "sculpture",
            "theater",
            "dance",
        ],
        "related": ["entertainment", "show", "festival", "gallery", "museum", "artist"],
        "boost_words": ["art", "creative", "design", "music"],
    },
    # EDUCATION
    "education": {
        "synonyms": [
            "learning",
            "school",
            "university",
            "course",
            "training",
            "workshop",
            "seminar",
            "academic",
            "research",
            "study",
            "knowledge",
            "tutoring",
        ],
        "related": ["student", "teacher", "certification", "skill", "development"],
        "boost_words": ["education", "learning", "training", "course"],
    },
}

# Common brand/company suffixes
COMPANY_SUFFIXES = {
    "inc",
    "llc",
    "ltd",
    "corp",
    "co",
    "group",
    "technologies",
    "solutions",
    "systems",
}


class EnhancedSmartMatcher:
    def __init__(self):
        # Build enhanced vocabulary
        self._build_enhanced_vocabulary()

        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 3),  # Increased to include trigrams
            min_df=1,
            max_df=0.95,  # Filter out too common words
            use_idf=True,
            smooth_idf=True,
            sublinear_tf=True,
            vocabulary=self.enhanced_vocab,  # Use enhanced vocabulary
        )

        # Cache for processed texts
        self.cache = {}

    def _build_enhanced_vocabulary(self):
        """Build an enhanced vocabulary from domain knowledge"""
        self.enhanced_vocab = set()
        self.synonym_to_category = {}
        self.category_boost_words = {}

        for category, data in DOMAIN_KNOWLEDGE.items():
            # Add category name
            self.enhanced_vocab.add(category)

            # Add synonyms
            for synonym in data["synonyms"]:
                self.enhanced_vocab.add(synonym)
                self.synonym_to_category[synonym] = category

            # Add related terms
            for related in data["related"]:
                self.enhanced_vocab.add(related)

            # Store boost words
            self.category_boost_words[category] = set(data["boost_words"])

        # Add common important words
        common_important = {
            "innovation",
            "community",
            "development",
            "solution",
            "service",
            "product",
            "event",
            "conference",
            "summit",
        }
        self.enhanced_vocab.update(common_important)

    def _clean_text(self, text: str) -> str:
        """Enhanced text cleaning with better normalization"""
        if not text:
            return ""

        # Convert to lowercase
        text = text.lower()

        # Remove company suffixes
        for suffix in COMPANY_SUFFIXES:
            text = re.sub(rf"\b{suffix}\b\.?", "", text)

        # Handle special cases like "AI" -> "artificial intelligence"
        special_cases = {
            r"\bai\b": "artificial intelligence",
            r"\bml\b": "machine learning",
            r"\big\b": "information technology",
            r"\biot\b": "internet of things",
            r"\bvr\b": "virtual reality",
            r"\bar\b": "augmented reality",
        }

        for pattern, replacement in special_cases.items():
            text = re.sub(pattern, replacement, text)

        # Split CamelCase (improved regex)
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
        text = re.sub(r"([A-Z])([A-Z][a-z])", r"\1 \2", text)

        # Remove special characters but keep hyphens in compound words
        text = re.sub(r"[^\w\s-]", " ", text)

        # Normalize whitespace
        text = " ".join(text.split())

        # Remove very short words but keep important ones
        words = text.split()
        filtered_words = []
        for word in words:
            if len(word) > 2 or word in {"ai", "ml", "it", "vr", "ar"}:
                filtered_words.append(word)

        return " ".join(filtered_words)

    def _expand_with_context(self, text: str, is_event: bool = False) -> str:
        """Enhanced semantic expansion with context awareness"""
        cache_key = f"{text}_{is_event}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        cleaned = self._clean_text(text)
        words = set(cleaned.split())

        expanded_terms = []
        found_categories = set()

        # Find categories based on words
        for word in words:
            # Direct category match
            if word in DOMAIN_KNOWLEDGE:
                found_categories.add(word)

            # Synonym match
            if word in self.synonym_to_category:
                found_categories.add(self.synonym_to_category[word])

        # Add expansion terms for found categories
        for category in found_categories:
            if category in DOMAIN_KNOWLEDGE:
                data = DOMAIN_KNOWLEDGE[category]
                # Add category name multiple times for emphasis
                expanded_terms.extend([category] * 3)
                # Add top synonyms
                expanded_terms.extend(data["synonyms"][:5])
                # Add related terms
                expanded_terms.extend(data["related"][:3])

        # Add n-grams from original text
        words_list = cleaned.split()
        for i in range(len(words_list)):
            # Add bigrams
            if i < len(words_list) - 1:
                bigram = f"{words_list[i]}_{words_list[i + 1]}"
                expanded_terms.append(bigram)
            # Add trigrams
            if i < len(words_list) - 2:
                trigram = f"{words_list[i]}_{words_list[i + 1]}_{words_list[i + 2]}"
                expanded_terms.append(trigram)

        result = f"{cleaned} {' '.join(expanded_terms)}"
        self.cache[cache_key] = result
        return result

    def _calculate_enhanced_overlap(
        self, text1: str, text2: str
    ) -> Tuple[float, List[str]]:
        """Calculate overlap with weighting and phrase matching"""
        words1 = text1.split()
        words2 = text2.split()

        # Create word sets and multi-word phrase sets
        set1 = set(words1)
        set2 = set(words2)

        # Create bi-gram and tri-gram sets
        bigrams1 = set(f"{words1[i]}_{words1[i + 1]}" for i in range(len(words1) - 1))
        bigrams2 = set(f"{words2[i]}_{words2[i + 1]}" for i in range(len(words2) - 1))

        # Calculate weighted overlap
        total_weight = 0
        matched_terms = []

        # Check single word matches with weights
        for word in set1:
            if word in set2 and len(word) > 2:
                # Weight by word importance
                weight = 1.0
                if word in self.category_boost_words:
                    weight = 2.0
                elif any(
                    word in data["synonyms"] for data in DOMAIN_KNOWLEDGE.values()
                ):
                    weight = 1.5

                total_weight += weight
                matched_terms.append(word)

        # Check bigram matches (higher weight)
        for bigram in bigrams1:
            if bigram in bigrams2:
                total_weight += 3.0  # Higher weight for phrase matches
                matched_terms.append(bigram.replace("_", " "))

        # Normalize by the smaller text's word count
        min_words = min(len(words1), len(words2))
        if min_words == 0:
            return 0.0, []

        score = total_weight / (min_words * 2)  # Adjusted normalization

        return min(score, 1.0), matched_terms[:5]

    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases using simple heuristic"""
        words = text.split()
        phrases = []

        # Look for adjective-noun combinations
        for i in range(len(words) - 1):
            if len(words[i]) > 3 and len(words[i + 1]) > 3:
                phrases.append(f"{words[i]} {words[i + 1]}")

        return phrases

    def _calculate_semantic_boost(self, event_text: str, sponsor_text: str) -> float:
        """Calculate semantic relationship boost based on domain knowledge"""
        boost = 0.0

        # Find categories in event
        event_words = set(event_text.split())
        event_categories = set()

        for word in event_words:
            if word in DOMAIN_KNOWLEDGE:
                event_categories.add(word)
            elif word in self.synonym_to_category:
                event_categories.add(self.synonym_to_category[word])

        # Find categories in sponsor
        sponsor_words = set(sponsor_text.split())
        sponsor_categories = set()

        for word in sponsor_words:
            if word in DOMAIN_KNOWLEDGE:
                sponsor_categories.add(word)
            elif word in self.synonym_to_category:
                sponsor_categories.add(self.synonym_to_category[word])

        # Calculate boost based on category overlap
        category_overlap = event_categories.intersection(sponsor_categories)
        if category_overlap:
            boost += len(category_overlap) * 0.2

        # Additional boost for boost words
        for category in category_overlap:
            boost_words = self.category_boost_words.get(category, set())
            event_boost_matches = len(event_words.intersection(boost_words))
            sponsor_boost_matches = len(sponsor_words.intersection(boost_words))

            if event_boost_matches and sponsor_boost_matches:
                boost += 0.15

        return min(boost, 0.5)  # Cap the boost

    def match(self, event_text: str, sponsors: List[Any]) -> List[Dict]:
        if not sponsors:
            return []

        logger.info(f"Matching event: {event_text[:100]}...")

        # 1. Enhanced expansion for event
        expanded_event = self._expand_with_context(event_text, is_event=True)
        logger.debug(f"Expanded event: {expanded_event[:200]}")

        # 2. Prepare sponsor texts with enhanced processing
        sponsor_data = []
        sponsor_texts = []

        for idx, sponsor in enumerate(sponsors):
            # Clean sponsor data
            name = self._clean_text(getattr(sponsor, "company_name", ""))
            notes = self._clean_text(getattr(sponsor, "notes", ""))
            industry = self._clean_text(getattr(sponsor, "industry", ""))

            # Weight components
            # Name gets highest weight (repeated multiple times)
            # Industry gets medium weight
            # Notes get standard weight
            weighted_text = f"{name} {name} {name} {industry} {industry} {notes}"

            # Enhanced expansion
            expanded_sponsor = self._expand_with_context(weighted_text, is_event=False)

            sponsor_data.append(
                {
                    "id": getattr(
                        sponsor, "id", idx
                    ),  # Fixed: use idx instead of undefined i
                    "company_name": getattr(sponsor, "company_name", ""),
                    "notes": notes,
                    "industry": industry,
                    "clean_name": name,
                    "expanded_text": expanded_sponsor,
                }
            )
            sponsor_texts.append(expanded_sponsor)

        # 3. TF-IDF Vector Similarity
        try:
            all_texts = [expanded_event] + sponsor_texts
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)

            # Calculate multiple similarity metrics
            cosine_sim = cosine_similarity(
                tfidf_matrix[0:1], tfidf_matrix[1:]
            ).flatten()

            # Also calculate similarity on cleaned texts only
            cleaned_event = self._clean_text(event_text)
            cleaned_sponsor_texts = [
                data["clean_name"] + " " + data["industry"] for data in sponsor_data
            ]
            all_cleaned = [cleaned_event] + cleaned_sponsor_texts

            # Use binary presence for exact matches
            binary_vectorizer = TfidfVectorizer(
                binary=True, vocabulary=self.enhanced_vocab
            )
            binary_matrix = binary_vectorizer.fit_transform(all_cleaned)
            binary_sim = cosine_similarity(
                binary_matrix[0:1], binary_matrix[1:]
            ).flatten()

        except Exception as e:
            logger.error(f"Vectorization error: {e}")
            cosine_sim = [0] * len(sponsors)
            binary_sim = [0] * len(sponsors)

        # 4. Calculate matches with multiple scoring factors
        matches = []

        for i, data in enumerate(sponsor_data):
            # Score A: Main TF-IDF similarity
            vector_score = float(cosine_sim[i])

            # Score B: Binary presence similarity
            binary_score = float(binary_sim[i])

            # Score C: Enhanced keyword overlap
            keyword_score, matched_keywords = self._calculate_enhanced_overlap(
                expanded_event, data["expanded_text"]
            )

            # Score D: Semantic relationship boost
            semantic_boost = self._calculate_semantic_boost(
                expanded_event, data["expanded_text"]
            )

            # Score E: Name exact/substring match
            name_score = 0.0
            event_words = set(cleaned_event.split())
            sponsor_name_words = set(data["clean_name"].split())

            # Check for word overlap in names
            name_word_overlap = len(event_words.intersection(sponsor_name_words))
            if name_word_overlap > 0:
                name_score = min(0.3, name_word_overlap * 0.1)

            # Check for substring matches
            for event_word in event_words:
                for sponsor_word in sponsor_name_words:
                    if len(event_word) > 3 and len(sponsor_word) > 3:
                        if event_word in sponsor_word or sponsor_word in event_word:
                            name_score = max(name_score, 0.25)

            # Score F: Industry relevance
            industry_score = 0.0
            if data["industry"]:
                industry_words = set(data["industry"].split())
                industry_overlap = len(event_words.intersection(industry_words))
                if industry_overlap > 0:
                    industry_score = min(0.2, industry_overlap * 0.1)

            # Combined weighted score
            final_score = (
                vector_score * 0.35  # Context similarity
                + binary_score * 0.25  # Exact term presence
                + keyword_score * 0.20  # Keyword overlap
                + name_score * 0.10  # Name matching
                + industry_score * 0.10  # Industry relevance
            )

            # Add semantic boost
            final_score += semantic_boost

            # Apply non-linear boost to differentiate good matches
            if final_score > 0.15:
                # Sigmoid-like boost for scores above threshold
                boost_factor = 1.0 / (1.0 + np.exp(-10 * (final_score - 0.3)))
                final_score = final_score + (boost_factor * 0.15)

            # Ensure score is between 0 and 1
            final_score = max(0.0, min(0.99, final_score))

            # Threshold and add to results
            if final_score > 0.15:  # Lowered threshold for more inclusive matching
                matches.append(
                    {
                        "sponsor_id": data["id"],
                        "company_name": data["company_name"],
                        "notes": getattr(sponsors[i], "notes", ""),
                        "industry": getattr(sponsors[i], "industry", ""),
                        "contact_email": getattr(sponsors[i], "contact_email", ""),
                        "match_score": round(final_score, 3),
                        "matched_keywords": matched_keywords,
                        "score_components": {
                            "vector": round(vector_score, 3),
                            "binary": round(binary_score, 3),
                            "keyword": round(keyword_score, 3),
                            "name": round(name_score, 3),
                            "industry": round(industry_score, 3),
                            "semantic_boost": round(semantic_boost, 3),
                        },
                    }
                )

        # Sort by score
        matches.sort(key=lambda x: x["match_score"], reverse=True)

        # Apply ranking adjustment (give top matches slight boost)
        for i, match in enumerate(matches[:3]):
            if match["match_score"] > 0.3:
                match["match_score"] = min(0.99, match["match_score"] + 0.05 * (3 - i))

        logger.info(f"Found {len(matches)} potential matches")
        return matches


# --- EXPORT ---
matcher_instance = EnhancedSmartMatcher()


def calculate_matches(event_text: str, sponsors: list) -> list:
    try:
        return matcher_instance.match(event_text, sponsors)
    except Exception as e:
        logger.error(f"Matching failed: {e}")
        return []
