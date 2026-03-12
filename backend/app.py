from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
import bcrypt
import os
import uuid
import smtplib
import secrets
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from dotenv import load_dotenv

from database import execute_query, execute_one
from ai_service import get_ai_response

load_dotenv()

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600)))

CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_URL", "http://localhost:5173")}})
jwt = JWTManager(app)


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def send_reset_email(to_email: str, token: str):
    """Send password reset email."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    body = f"""Hello,

You requested a password reset for your DTE Rajasthan Admin account.

Your OTP for password reset is: {token}

This OTP is valid for 1 hour. If you did not request this, ignore this email.

DTE Rajasthan Team
"""
    msg = MIMEText(body)
    msg['Subject'] = 'DTE Rajasthan - Password Reset OTP'
    msg['From'] = os.getenv("SMTP_FROM")
    msg['To'] = to_email

    try:
        port = int(os.getenv("SMTP_PORT", 587))
        host = os.getenv("SMTP_HOST")
        user = os.getenv("SMTP_USER")
        pwd = os.getenv("SMTP_PASSWORD")
        
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=10) as s:
                s.login(user, pwd)
                s.sendmail(msg['From'], [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=10) as s:
                s.starttls()
                s.login(user, pwd)
                s.sendmail(msg['From'], [to_email], msg.as_string())
    except Exception as e:
        print(f"Email error: {e}")

def send_reset_email_async(to_email: str, token: str):
    """Run send_reset_email in a background thread."""
    import threading
    thread = threading.Thread(target=send_reset_email, args=(to_email, token))
    thread.daemon = True
    thread.start()


# ============================================================
# AUTH ROUTES
# ============================================================

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    """Admin signup - one admin per college."""
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    email = data.get("email", "").strip()
    college_code = data.get("college_code", "").strip().upper()

    if not username or not password or not college_code or not email:
        return jsonify({"error": "All fields are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Check college exists
    college = execute_one("SELECT id FROM College WHERE code = %s AND is_active = 1", (college_code,))
    if not college:
        return jsonify({"error": "College code not found or inactive"}), 404

    # Check if admin already exists for this college
    existing_admin = execute_one("SELECT id FROM UserAccount WHERE college_id = %s", (college['id'],))
    if existing_admin:
        return jsonify({"error": "An admin already exists for this college"}), 409

    # Check username uniqueness
    existing_user = execute_one("SELECT id FROM UserAccount WHERE username = %s", (username,))
    if existing_user:
        return jsonify({"error": "Username already taken"}), 409

    hashed = hash_password(password)
    execute_one(
        "INSERT INTO UserAccount (username, password, email, role, college_id) VALUES (%s, %s, %s, 'ADMIN', %s)",
        (username, hashed, email, college['id']),
        commit=True
    )

    return jsonify({"message": "Admin account created successfully"}), 201


@app.route("/api/auth/signin", methods=["POST"])
def signin():
    """Admin signin."""
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = execute_one(
        "SELECT u.*, c.name as college_name, c.code as college_code "
        "FROM UserAccount u LEFT JOIN College c ON u.college_id = c.id "
        "WHERE u.username = %s AND u.is_active = 1",
        (username,)
    )

    if not user or not check_password(password, user['password']):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user['id']))
    return jsonify({
        "access_token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "role": user['role'],
            "college_id": user['college_id'],
            "college_name": user['college_name'],
            "college_code": user['college_code'],
        }
    }), 200


@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    """Generate reset OTP and send email."""
    data = request.json
    email = data.get("email", "").strip()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = execute_one(
        "SELECT id, email FROM UserAccount WHERE email = %s AND is_active = 1",
        (email,)
    )
    # Always return success to prevent user enumeration
    if user:
        # Generate 6-digit OTP
        import random
        otp = str(random.randint(100000, 999999))
        expires = datetime.utcnow() + timedelta(hours=1)
        # Hash the OTP before storing it
        import hashlib
        hashed_otp = hashlib.sha256(otp.encode()).hexdigest()
        
        execute_one(
            "UPDATE UserAccount SET reset_token = %s, reset_token_expires = %s WHERE id = %s",
            (hashed_otp, expires, user['id']),
            commit=True
        )
        # Send OTP to the user's registered email synchronously so we catch the error
        try:
            send_reset_email(user['email'], otp)
        except Exception as e:
            return jsonify({"error": f"Failed to send email: {str(e)}"}), 500

    return jsonify({"message": "If the account exists, an OTP has been sent to the registered email address."}), 200


@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    """Reset password via OTP."""
    data = request.json
    email = data.get("email", "").strip()
    otp = data.get("token", "").strip()
    new_password = data.get("password", "").strip()

    if not email or not otp or not new_password:
        return jsonify({"error": "Email, OTP and new password are required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    import hashlib
    hashed_otp = hashlib.sha256(otp.encode()).hexdigest()

    user = execute_one(
        "SELECT id FROM UserAccount WHERE email = %s AND reset_token = %s AND reset_token_expires > %s",
        (email, hashed_otp, datetime.utcnow())
    )
    if not user:
        return jsonify({"error": "Invalid or expired OTP, or incorrect email"}), 400

    hashed = hash_password(new_password)
    execute_one(
        "UPDATE UserAccount SET password = %s, reset_token = NULL, reset_token_expires = NULL WHERE id = %s",
        (hashed, user['id']),
        commit=True
    )
    return jsonify({"message": "Password reset successfully"}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    """Get current user info."""
    user_id = get_jwt_identity()
    user = execute_one(
        "SELECT u.id, u.username, u.role, u.college_id, c.name as college_name, c.code as college_code "
        "FROM UserAccount u LEFT JOIN College c ON u.college_id = c.id WHERE u.id = %s",
        (user_id,)
    )
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user), 200


# ============================================================
# COLLEGE ROUTES (Admin)
# ============================================================

@app.route("/api/admin/college", methods=["GET"])
@jwt_required()
def get_college():
    """Get current admin's college details."""
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    if not user or not user['college_id']:
        return jsonify({"error": "No college assigned"}), 404

    college = execute_one("SELECT * FROM College WHERE id = %s", (user['college_id'],))
    return jsonify(college), 200


@app.route("/api/admin/college", methods=["PUT"])
@jwt_required()
def update_college():
    """Update college details."""
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    if not user or not user['college_id']:
        return jsonify({"error": "No college assigned"}), 404

    data = request.json
    execute_one(
        """UPDATE College SET name=%s, city=%s, district=%s, college_type=%s,
           website=%s, email=%s, phone=%s WHERE id=%s""",
        (data.get('name'), data.get('city'), data.get('district'),
         data.get('college_type'), data.get('website'), data.get('email'),
         data.get('phone'), user['college_id']),
        commit=True
    )
    return jsonify({"message": "College updated"}), 200


# ============================================================
# COURSES ROUTES
# ============================================================

@app.route("/api/admin/courses", methods=["GET"])
@jwt_required()
def get_courses():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    courses = execute_query(
        "SELECT cr.*, f.tuition_fee, f.hostel_fee, f.other_fee, f.id as fee_id "
        "FROM Course cr LEFT JOIN Fees f ON f.course_id = cr.id "
        "WHERE cr.college_id = %s",
        (user['college_id'],)
    )
    return jsonify(courses), 200


@app.route("/api/admin/courses", methods=["POST"])
@jwt_required()
def create_course():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    data = request.json
    # Use execute_query with fetch=False so we correctly return the new course ID.
    course_id = execute_query(
        "INSERT INTO Course (college_id, name, branch, duration_years, intake_capacity) "
        "VALUES (%s,%s,%s,%s,%s)",
        (user['college_id'], data.get('name'), data.get('branch'),
         data.get('duration_years'), data.get('intake_capacity')),
        fetch=False,
        commit=True
    )
    return jsonify({"id": course_id, "message": "Course created"}), 201


@app.route("/api/admin/courses/<int:course_id>", methods=["PUT"])
@jwt_required()
def update_course(course_id):
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    # Verify ownership
    course = execute_one("SELECT id FROM Course WHERE id = %s AND college_id = %s", (course_id, user['college_id']))
    if not course:
        return jsonify({"error": "Course not found"}), 404

    data = request.json
    execute_one(
        "UPDATE Course SET name=%s, branch=%s, duration_years=%s, intake_capacity=%s WHERE id=%s",
        (data.get('name'), data.get('branch'), data.get('duration_years'), data.get('intake_capacity'), course_id),
        commit=True
    )
    return jsonify({"message": "Course updated"}), 200


@app.route("/api/admin/courses/<int:course_id>", methods=["DELETE"])
@jwt_required()
def delete_course(course_id):
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    course = execute_one("SELECT id FROM Course WHERE id = %s AND college_id = %s", (course_id, user['college_id']))
    if not course:
        return jsonify({"error": "Course not found"}), 404
    execute_one("DELETE FROM Course WHERE id = %s", (course_id,), commit=True)
    return jsonify({"message": "Course deleted"}), 200


# ============================================================
# FEES ROUTES
# ============================================================

@app.route("/api/admin/fees", methods=["POST"])
@jwt_required()
def upsert_fees():
    """Create or update fees for a course."""
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    data = request.json
    course_id = data.get('course_id')

    # Verify course belongs to this admin's college
    course = execute_one("SELECT id FROM Course WHERE id = %s AND college_id = %s", (course_id, user['college_id']))
    if not course:
        return jsonify({"error": "Course not found"}), 404

    existing = execute_one("SELECT id FROM Fees WHERE course_id = %s", (course_id,))
    if existing:
        execute_one(
            "UPDATE Fees SET tuition_fee=%s, hostel_fee=%s, other_fee=%s WHERE course_id=%s",
            (data.get('tuition_fee'), data.get('hostel_fee'), data.get('other_fee'), course_id),
            commit=True
        )
    else:
        execute_one(
            "INSERT INTO Fees (course_id, tuition_fee, hostel_fee, other_fee) VALUES (%s,%s,%s,%s)",
            (course_id, data.get('tuition_fee'), data.get('hostel_fee'), data.get('other_fee')),
            commit=True
        )
    return jsonify({"message": "Fees saved"}), 200


# ============================================================
# HOSTEL ROUTES
# ============================================================

@app.route("/api/admin/hostel", methods=["GET"])
@jwt_required()
def get_hostel():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    hostel = execute_one("SELECT * FROM Hostel WHERE college_id = %s", (user['college_id'],))
    return jsonify(hostel or {}), 200


@app.route("/api/admin/hostel", methods=["POST"])
@jwt_required()
def upsert_hostel():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    data = request.json
    existing = execute_one("SELECT id FROM Hostel WHERE college_id = %s", (user['college_id'],))
    if existing:
        execute_one(
            "UPDATE Hostel SET total_rooms=%s, capacity=%s, is_available=%s WHERE college_id=%s",
            (data.get('total_rooms'), data.get('capacity'), data.get('is_available'), user['college_id']),
            commit=True
        )
    else:
        execute_one(
            "INSERT INTO Hostel (college_id, total_rooms, capacity, is_available) VALUES (%s,%s,%s,%s)",
            (user['college_id'], data.get('total_rooms'), data.get('capacity'), data.get('is_available')),
            commit=True
        )
    return jsonify({"message": "Hostel info saved"}), 200


# ============================================================
# ADMISSION SCHEDULE ROUTES
# ============================================================

@app.route("/api/admin/admissions", methods=["GET"])
@jwt_required()
def get_admissions():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    admissions = execute_query(
        "SELECT a.*, cr.name as course_name, cr.branch FROM AdmissionSchedule a "
        "JOIN Course cr ON a.course_id = cr.id WHERE cr.college_id = %s ORDER BY a.academic_year DESC",
        (user['college_id'],)
    )
    return jsonify(admissions), 200


@app.route("/api/admin/admissions", methods=["POST"])
@jwt_required()
def create_admission():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    data = request.json
    course_id = data.get('course_id')
    course = execute_one("SELECT id FROM Course WHERE id=%s AND college_id=%s", (course_id, user['college_id']))
    if not course:
        return jsonify({"error": "Course not found"}), 404

    execute_one(
        "INSERT INTO AdmissionSchedule (course_id, academic_year, start_date, end_date, admission_link) "
        "VALUES (%s,%s,%s,%s,%s)",
        (course_id, data.get('academic_year'), data.get('start_date'),
         data.get('end_date'), data.get('admission_link')),
        commit=True
    )
    return jsonify({"message": "Admission schedule created"}), 201


@app.route("/api/admin/admissions/<int:adm_id>", methods=["PUT"])
@jwt_required()
def update_admission(adm_id):
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    # Verify ownership via JOIN
    existing = execute_one(
        "SELECT a.id FROM AdmissionSchedule a JOIN Course cr ON a.course_id=cr.id "
        "WHERE a.id=%s AND cr.college_id=%s",
        (adm_id, user['college_id'])
    )
    if not existing:
        return jsonify({"error": "Not found"}), 404

    data = request.json
    execute_one(
        "UPDATE AdmissionSchedule SET academic_year=%s, start_date=%s, end_date=%s, admission_link=%s WHERE id=%s",
        (data.get('academic_year'), data.get('start_date'), data.get('end_date'), data.get('admission_link'), adm_id),
        commit=True
    )
    return jsonify({"message": "Updated"}), 200


@app.route("/api/admin/admissions/<int:adm_id>", methods=["DELETE"])
@jwt_required()
def delete_admission(adm_id):
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    existing = execute_one(
        "SELECT a.id FROM AdmissionSchedule a JOIN Course cr ON a.course_id=cr.id "
        "WHERE a.id=%s AND cr.college_id=%s",
        (adm_id, user['college_id'])
    )
    if not existing:
        return jsonify({"error": "Not found"}), 404
    execute_one("DELETE FROM AdmissionSchedule WHERE id=%s", (adm_id,), commit=True)
    return jsonify({"message": "Deleted"}), 200


# ============================================================
# CUTOFF ROUTES
# ============================================================

@app.route("/api/admin/cutoffs", methods=["GET"])
@jwt_required()
def get_cutoffs():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    cutoffs = execute_query(
        "SELECT cu.*, cr.name as course_name, cr.branch FROM Cutoff cu "
        "JOIN Course cr ON cu.course_id = cr.id WHERE cr.college_id = %s ORDER BY cu.academic_year DESC",
        (user['college_id'],)
    )
    return jsonify(cutoffs), 200


@app.route("/api/admin/cutoffs", methods=["POST"])
@jwt_required()
def create_cutoff():
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    data = request.json
    course = execute_one("SELECT id FROM Course WHERE id=%s AND college_id=%s", (data.get('course_id'), user['college_id']))
    if not course:
        return jsonify({"error": "Course not found"}), 404

    execute_one(
        "INSERT INTO Cutoff (course_id, academic_year, category, opening_rank, closing_rank) VALUES (%s,%s,%s,%s,%s)",
        (data.get('course_id'), data.get('academic_year'), data.get('category'),
         data.get('opening_rank'), data.get('closing_rank')),
        commit=True
    )
    return jsonify({"message": "Cutoff added"}), 201


@app.route("/api/admin/cutoffs/<int:cutoff_id>", methods=["PUT"])
@jwt_required()
def update_cutoff(cutoff_id):
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    existing = execute_one(
        "SELECT cu.id FROM Cutoff cu JOIN Course cr ON cu.course_id=cr.id WHERE cu.id=%s AND cr.college_id=%s",
        (cutoff_id, user['college_id'])
    )
    if not existing:
        return jsonify({"error": "Not found"}), 404
    data = request.json
    execute_one(
        "UPDATE Cutoff SET academic_year=%s, category=%s, opening_rank=%s, closing_rank=%s WHERE id=%s",
        (data.get('academic_year'), data.get('category'), data.get('opening_rank'), data.get('closing_rank'), cutoff_id),
        commit=True
    )
    return jsonify({"message": "Updated"}), 200


@app.route("/api/admin/cutoffs/<int:cutoff_id>", methods=["DELETE"])
@jwt_required()
def delete_cutoff(cutoff_id):
    user_id = get_jwt_identity()
    user = execute_one("SELECT college_id FROM UserAccount WHERE id = %s", (user_id,))
    existing = execute_one(
        "SELECT cu.id FROM Cutoff cu JOIN Course cr ON cu.course_id=cr.id WHERE cu.id=%s AND cr.college_id=%s",
        (cutoff_id, user['college_id'])
    )
    if not existing:
        return jsonify({"error": "Not found"}), 404
    execute_one("DELETE FROM Cutoff WHERE id=%s", (cutoff_id,), commit=True)
    return jsonify({"message": "Deleted"}), 200


# ============================================================
# PUBLIC - LIST COLLEGES (for signup dropdown)
# ============================================================

@app.route("/api/public/colleges", methods=["GET"])
def list_colleges():
    colleges = execute_query("SELECT id, name, code, city, district FROM College WHERE is_active=1 ORDER BY name")
    return jsonify(colleges), 200


# ============================================================
# CHAT ROUTES (Public - No Auth Required)
# ============================================================

@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat messages from students/public."""
    data = request.json
    user_message = data.get("message", "").strip()
    session_id = data.get("session_id")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400
        
    if len(user_message) > 500:
        return jsonify({"error": "Message is too long (max 500 characters)"}), 400

    if not session_id or len(session_id) != 36:
        # Generate generic new session if missing or not a UUID
        session_id = str(uuid.uuid4())

    # Ensure session exists
    existing_session = execute_one("SELECT session_id FROM ChatSession WHERE session_id = %s", (session_id,))
    if not existing_session:
        # If it's a new 36 char UUID from a client, insert it, otherwise generate a fresh one
        try:
            uuid.UUID(session_id)
            execute_one("INSERT INTO ChatSession (session_id) VALUES (%s)", (session_id,), commit=True)
        except ValueError:
            session_id = str(uuid.uuid4())
            execute_one("INSERT INTO ChatSession (session_id) VALUES (%s)", (session_id,), commit=True)

    # Fetch last 10 messages for context
    history = execute_query(
        "SELECT role, content FROM ChatMessage WHERE session_id = %s ORDER BY created_at ASC LIMIT 20",
        (session_id,)
    )

    # Get AI response
    ai_response = get_ai_response(user_message, history)

    # Save messages
    execute_one(
        "INSERT INTO ChatMessage (session_id, role, content) VALUES (%s, 'user', %s)",
        (session_id, user_message), commit=True
    )
    execute_one(
        "INSERT INTO ChatMessage (session_id, role, content) VALUES (%s, 'assistant', %s)",
        (session_id, ai_response), commit=True
    )

    return jsonify({
        "response": ai_response,
        "session_id": session_id
    }), 200


@app.route("/api/chat/history/<session_id>", methods=["GET"])
def get_chat_history(session_id):
    try:
        uuid.UUID(session_id)
    except ValueError:
        return jsonify({"error": "Invalid session ID format"}), 400
        
    history = execute_query(
        "SELECT role, content, created_at FROM ChatMessage WHERE session_id = %s ORDER BY created_at ASC",
        (session_id,)
    )
    return jsonify(history), 200


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "DTE Rajasthan Chatbot API"}), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)