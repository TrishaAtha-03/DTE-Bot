import os
import traceback
import google.generativeai as genai
from database import execute_query
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Allow overriding the model from environment while providing a safe default.
MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")


def fetch_college_knowledge_base(query: str = "") -> str:
    """
    Fetch relevant college data from the DB to build RAG context based on query.
    """
    import re
    knowledge = []
    query_lower = query.lower()
    
    # Extract keywords for better matching
    stop_words = {'what', 'is', 'are', 'the', 'tell', 'me', 'about', 'in', 'of', 'for', 'and', 'to', 'a', 'an', 'show', 'list', 'details', 'detail', 'information', 'know', 'want', 'any', 'all', 'can', 'you'}
    words = re.findall(r'\b[a-z0-9.]+\b', query_lower)
    keywords = [w for w in words if w not in stop_words and len(w) > 2]

    def get_score(text_values):
        if not keywords:
            return 1
        combined_text = " ".join([str(v).lower() for v in text_values if v])
        score = 0
        for kw in keywords:
            if kw in combined_text:
                score += 1
        return score

    # Colleges
    colleges = execute_query("SELECT * FROM vw_public_college_info")
    if colleges:
        scored_colleges = []
        for c in colleges:
            score = get_score([c['name'], c['city'], c['district'], c['college_type']])
            # Bonus: city name found in query
            if c['city'].lower() in query_lower:
                score += 2
            # Strong bonus: college name is a substring of the query (most specific signal)
            college_name_lower = c['name'].lower()
            if college_name_lower in query_lower:
                score += 10
            # Partial name bonus: check each significant word in the college name
            for word in college_name_lower.split():
                if len(word) > 3 and word in query_lower:
                    score += 1
            if score > 0 or not query:
                scored_colleges.append((score, c))

        if scored_colleges:
            scored_colleges.sort(key=lambda x: x[0], reverse=True)
            knowledge.append("=== COLLEGE INFO ===")
            # Only show the single best-matching college to avoid mixing data
            score, c = scored_colleges[0]
            knowledge.append(
                f"\nCollege: {c['name']} (Code: {c['code']})\n"
                f"  Location: {c['city']}, {c['district']}, {c['state']}\n"
                f"  Type: {c['college_type']}\n"
                f"  Website: {c['website']}\n"
                f"  Phone: {c['phone']}"
            )

    # Courses with fees
    if "fee" in query_lower or "course" in query_lower or "b.tech" in query_lower or "diploma" in query_lower or "branch" in query_lower or "intake" in query_lower:
        courses = execute_query("SELECT * FROM vw_public_course_fees")
        if courses:
            scored_courses = []
            for r in courses:
                score = get_score([r['college_name'], r['course_name'], r['branch']])
                if score > 0 or not query:
                    scored_courses.append((score, r))
            if scored_courses:
                scored_courses.sort(key=lambda x: x[0], reverse=True)
                knowledge.append("\n=== COURSES & FEES ===")
                for score, r in scored_courses[:10]:
                    total = (r.get('tuition_fee') or 0) + (r.get('hostel_fee') or 0) + (r.get('other_fee') or 0)
                    knowledge.append(
                        f"\nCollege: {r['college_name']} | Course: {r['course_name']} ({r['branch']})\n"
                        f"  Intake: {r['intake_capacity']} | Total Fee: ₹{total}"
                    )

    # Cutoffs
    if "cutoff" in query_lower or "rank" in query_lower or "admission" in query_lower or "score" in query_lower:
        cutoffs = execute_query("SELECT * FROM vw_public_cutoffs")
        if cutoffs:
            scored_cutoffs = []
            for cu in cutoffs:
                score = get_score([cu['college_name'], cu['branch'], cu['category'], str(cu['academic_year'])])
                if score > 0 or not query:
                    scored_cutoffs.append((score, cu))
            if scored_cutoffs:
                scored_cutoffs.sort(key=lambda x: x[0], reverse=True)
                knowledge.append("\n=== RECENT CUTOFF RANKS ===")
                for score, cu in scored_cutoffs[:10]:
                    knowledge.append(
                        f"\nCollege: {cu['college_name']} | {cu['branch']} ({cu['category']} - {cu['academic_year']})\n"
                        f"  Opening Rank: {cu['opening_rank']} | Closing Rank: {cu['closing_rank']}"
                    )

    # Admission schedules
    if "admission" in query_lower or "date" in query_lower or "schedule" in query_lower or "apply" in query_lower or "application" in query_lower:
        admissions = execute_query("SELECT * FROM vw_public_admission_schedule")
        if admissions:
            scored_admissions = []
            for a in admissions:
                score = get_score([a['college_name'], a['branch'], str(a['academic_year'])])
                if score > 0 or not query:
                    scored_admissions.append((score, a))
            if scored_admissions:
                scored_admissions.sort(key=lambda x: x[0], reverse=True)
                knowledge.append("\n=== ADMISSION SCHEDULES ===")
                for score, a in scored_admissions[:5]:
                    knowledge.append(
                        f"\nCollege: {a['college_name']} | {a['branch']} ({a['academic_year']})\n"
                        f"  Admission Period: {a['start_date']} to {a['end_date']}\n"
                        f"  Apply: {a['admission_link']}"
                    )

    # Hostel info
    if "hostel" in query_lower or "accommodation" in query_lower or "room" in query_lower:
        hostels = execute_query(
            "SELECT c.name AS college_name, c.city, h.total_rooms, h.capacity, h.is_available "
            "FROM Hostel h JOIN College c ON h.college_id = c.id WHERE c.is_active=1"
        )
        if hostels:
            scored_hostels = []
            for h in hostels:
                score = get_score([h['college_name'], h['city']])
                if score > 0 or not query:
                    scored_hostels.append((score, h))
            if scored_hostels:
                scored_hostels.sort(key=lambda x: x[0], reverse=True)
                knowledge.append("\n=== HOSTEL FACILITIES ===")
                for score, h in scored_hostels[:5]:
                    avail = "Yes" if h['is_available'] else "No"
                    knowledge.append(
                        f"\nCollege: {h['college_name']} ({h['city']}) | Hostel Available: {avail} | Capacity: {h['capacity']}"
                    )

    # Fallback if nothing specific matched but query was provided
    if not knowledge and query:
        knowledge.append("No specific data found for those keywords. Try asking about general college details, fees, cutoffs, or hostels.")

    return "\n".join(knowledge)


SYSTEM_PROMPT = """You are Edubot, an intelligent AI assistant for the Department of Technical Education (DTE), Government of Rajasthan.

You MUST follow this strict conversational flow:

STEP 1 - IDENTIFY COLLEGE:
  - If the user has NOT yet mentioned a specific college name, ask them politely:
    "Which college are you interested in? Please share the college name so I can find the right information."
  - Do NOT answer any college-specific question until a college is clearly identified.

STEP 2 - ASK WHAT THEY WANT TO KNOW:
  - Once a college is identified, acknowledge it and ask what topic they want help with. Example:
    "Great! I found information about [College Name]. What would you like to know?
    - 🎓 Admission process & schedule
    - 💰 Fee structure
    - 📊 Cutoff ranks
    - 🔬 Courses & branches
    - 🏠 Hostel facilities"

STEP 3 - ANSWER FROM KNOWLEDGE BASE:
  - Answer ONLY for the specific college the user identified.
  - Use ONLY the information in the KNOWLEDGE BASE below. Do NOT make up or guess any data.
  - If the requested information for that college is not in the KNOWLEDGE BASE, respond:
    "I don't have that specific information for [College Name] right now."
  - Use ₹ symbol for all fee amounts.
  - Keep your answer focused and concise.

STEP 4 - ASK FOR FOLLOW-UP:
  - After answering, always end with a follow-up question such as:
    "Would you like to know anything else about [College Name], or would you like to explore a different college?"

GENERAL RULES:
  - Be friendly and helpful.
  - Never mix information from different colleges in one answer.
  - If the user says they want to explore a different college, go back to STEP 1.

KNOWLEDGE BASE:
{knowledge_base}
"""


def get_ai_response(user_message: str, chat_history: list) -> str:
    """
    Get chatbot response.

    The bot first uses keyword/intent detection to pull structured
    information from the database and answer directly from that data.
    Only when the database does not have specific information do we
    fall back to the Gemini API, which saves API quota and avoids
    sending large chunks of database content to the model.
    """
    knowledge_base = ""
    try:
        user_message_clean = user_message.strip()
        if not user_message_clean:
            return "Please provide a valid message."

        # Aggregate previous user messages to build context
        # to ensure that if the user mentioned a college in a previous turn, we include it.
        context_query = ""
        for msg in chat_history:
            if msg.get("role") == "user":
                context_query += msg.get("content", "") + " "
        context_query += user_message_clean

        # Build a focused knowledge base from the database based on keywords.
        knowledge_base = fetch_college_knowledge_base(context_query).strip()

        # Always use Gemini to generate the response, using the knowledge_base as context.
        # This enables Gemini to follow the strict conversational flow (ask for college, ask topic,
        # answer, then follow up) rather than dumping raw DB data at the user.
        system_with_kb = SYSTEM_PROMPT.format(
            knowledge_base=knowledge_base or "No structured data was found for this question."
        )

        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=system_with_kb
        )

        # Build history for multi-turn conversation
        history = []
        for msg in chat_history:
            role = msg.get("role")
            content = msg.get("content")
            if not content:
                continue
            if role == "user":
                history.append({"role": "user", "parts": [content]})
            else:
                history.append({"role": "model", "parts": [content]})

        chat = model.start_chat(history=history)
        response = chat.send_message(user_message_clean)
        # `response.text` is available in current SDKs, but guard just in case.
        return getattr(response, "text", str(response))

    except Exception as e:
        error_msg = str(e)
        # Print full traceback so you can see EXACTLY why Gemini failed
        print(f"Gemini API Error: {error_msg}")
        print(traceback.format_exc())

        if "Quota" in error_msg or "429" in error_msg or "exhausted" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
            return (
                "I'm sorry, the AI service is temporarily unavailable due to quota limits. "
                "Please try again in a little while.\n\n"
                "In the meantime, here is what I found from the database:\n\n"
                + (knowledge_base or "No specific data found.")
            )
        elif "not found" in error_msg.lower() or "404" in error_msg:
            return (
                f"I'm sorry, the AI model '{MODEL_NAME}' was not found. "
                "Please check the GEMINI_MODEL_NAME setting in .env and restart the server."
            )
        elif "API_KEY" in error_msg or "invalid" in error_msg.lower() or "403" in error_msg:
            return (
                "I'm sorry, the AI service could not authenticate. "
                "Please check the GEMINI_API_KEY in .env and restart the server."
            )

        return f"I'm sorry, I'm having trouble connecting right now. (Error: {error_msg}) Please try again."