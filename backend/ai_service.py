import os
import google.generativeai as genai
from database import execute_query
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def fetch_college_knowledge_base() -> str:
    """
    Fetch all college data from the DB to build RAG context.
    This is the knowledge base the AI will use.
    """
    knowledge = []

    # Colleges
    colleges = execute_query(
        "SELECT * FROM vw_public_college_info ORDER BY name"
    )
    if colleges:
        knowledge.append("=== COLLEGES UNDER DTE RAJASTHAN ===")
        for c in colleges:
            knowledge.append(
                f"\nCollege: {c['name']} (Code: {c['code']})\n"
                f"  Location: {c['city']}, {c['district']}, {c['state']}\n"
                f"  Type: {c['college_type']}\n"
                f"  Website: {c['website']}\n"
                f"  Email: {c['email']}\n"
                f"  Phone: {c['phone']}"
            )

    # Courses with fees
    courses = execute_query(
        "SELECT * FROM vw_public_course_fees ORDER BY college_name, course_name"
    )
    if courses:
        knowledge.append("\n=== COURSES & FEES ===")
        for r in courses:
            total = (r.get('tuition_fee') or 0) + (r.get('hostel_fee') or 0) + (r.get('other_fee') or 0)
            knowledge.append(
                f"\nCollege: {r['college_name']} | Course: {r['course_name']} ({r['branch']})\n"
                f"  Duration: {r['duration_years']} years | Intake: {r['intake_capacity']} seats\n"
                f"  Tuition Fee: ₹{r.get('tuition_fee','N/A')} | Hostel Fee: ₹{r.get('hostel_fee','N/A')} "
                f"| Other Fee: ₹{r.get('other_fee','N/A')} | Total: ₹{total}"
            )

    # Cutoffs
    cutoffs = execute_query(
        "SELECT * FROM vw_public_cutoffs ORDER BY college_name, course_name, academic_year DESC, category"
    )
    if cutoffs:
        knowledge.append("\n=== CUTOFF RANKS ===")
        for cu in cutoffs:
            knowledge.append(
                f"\nCollege: {cu['college_name']} | Course: {cu['course_name']} ({cu['branch']})\n"
                f"  Year: {cu['academic_year']} | Category: {cu['category']}\n"
                f"  Opening Rank: {cu['opening_rank']} | Closing Rank: {cu['closing_rank']}"
            )

    # Admission schedules
    admissions = execute_query(
        "SELECT * FROM vw_public_admission_schedule ORDER BY college_name, start_date DESC"
    )
    if admissions:
        knowledge.append("\n=== ADMISSION SCHEDULES ===")
        for a in admissions:
            knowledge.append(
                f"\nCollege: {a['college_name']} | Course: {a['course_name']} ({a['branch']})\n"
                f"  Academic Year: {a['academic_year']}\n"
                f"  Admission Period: {a['start_date']} to {a['end_date']}\n"
                f"  Apply at: {a['admission_link']}"
            )

    # Hostel info
    hostels = execute_query(
        """SELECT c.name AS college_name, h.total_rooms, h.capacity, h.is_available
           FROM Hostel h JOIN College c ON h.college_id = c.id WHERE c.is_active=1"""
    )
    if hostels:
        knowledge.append("\n=== HOSTEL FACILITIES ===")
        for h in hostels:
            avail = "Available" if h['is_available'] else "Not Available"
            knowledge.append(
                f"\nCollege: {h['college_name']}\n"
                f"  Hostel: {avail} | Total Rooms: {h['total_rooms']} | Capacity: {h['capacity']} students"
            )

    return "\n".join(knowledge)


SYSTEM_PROMPT = """You are Edubot, an intelligent AI assistant for the Department of Technical Education (DTE), Government of Rajasthan. You help students, parents, and stakeholders with information about engineering and polytechnic colleges.

Your knowledge base contains real data about colleges, courses, fees, cutoff ranks, hostel facilities, and admission schedules. Always answer based on this data.

Guidelines:
- Be helpful, friendly, and informative
- Provide accurate information from the knowledge base
- If asked about something not in the knowledge base, say so politely
- Support queries about admissions, fees, cutoffs, courses, hostel, eligibility
- You can also help with general DTE Rajasthan admission process queries
- Keep responses concise but complete
- Use ₹ symbol for fees

KNOWLEDGE BASE:
{knowledge_base}
"""


def get_ai_response(user_message: str, chat_history: list) -> str:
    """
    Get AI response using Gemini with RAG from college database.
    """
    try:
        knowledge_base = fetch_college_knowledge_base()
        system_with_kb = SYSTEM_PROMPT.format(knowledge_base=knowledge_base)

        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-lite",
            system_instruction=system_with_kb
        )

        # Build history for multi-turn conversation
        history = []
        for msg in chat_history:
            if msg['role'] == 'user':
                history.append({"role": "user", "parts": [msg['content']]})
            else:
                history.append({"role": "model", "parts": [msg['content']]})

        chat = model.start_chat(history=history)
        response = chat.send_message(user_message)
        return response.text

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "I'm sorry, I'm having trouble connecting right now. Please try again in a moment or contact DTE Rajasthan directly."