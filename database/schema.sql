-- ============================================================
-- AI-Powered Student Assistance Chatbot
-- Department of Technical Education, Government of Rajasthan
-- Database Schema with Safety Policies
-- ============================================================

SET sql_mode = '';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS dte_rajasthan;
USE dte_rajasthan;

-- ============================================================
-- DROP TABLES IF EXIST (clean re-run)
-- ============================================================
DROP TABLE IF EXISTS ChatMessage;
DROP TABLE IF EXISTS ChatSession;
DROP TABLE IF EXISTS Cutoff;
DROP TABLE IF EXISTS AdmissionSchedule;
DROP TABLE IF EXISTS Fees;
DROP TABLE IF EXISTS Hostel;
DROP TABLE IF EXISTS Course;
DROP TABLE IF EXISTS UserAccount;
DROP TABLE IF EXISTS College;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE College (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) UNIQUE,
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Rajasthan',
    college_type VARCHAR(20),
    website VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE UserAccount (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'ADMIN',
    college_id BIGINT NULL,
    is_active BOOLEAN DEFAULT true,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES College(id) ON DELETE SET NULL
);

CREATE TABLE Course (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    name VARCHAR(100),
    branch VARCHAR(255),
    duration_years INT,
    intake_capacity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES College(id) ON DELETE CASCADE
);

CREATE TABLE Hostel (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    college_id BIGINT NOT NULL,
    total_rooms INT,
    capacity INT,
    is_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES College(id) ON DELETE CASCADE
);

CREATE TABLE Fees (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    tuition_fee INT,
    hostel_fee INT,
    other_fee INT,
    currency VARCHAR(5) DEFAULT 'INR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Course(id) ON DELETE CASCADE
);

CREATE TABLE AdmissionSchedule (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    academic_year VARCHAR(9),
    start_date DATE,
    end_date DATE,
    admission_link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Course(id) ON DELETE CASCADE
);

CREATE TABLE Cutoff (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT NOT NULL,
    academic_year VARCHAR(9),
    category VARCHAR(20),
    opening_rank INT,
    closing_rank INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Course(id) ON DELETE CASCADE
);

CREATE TABLE ChatSession (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ChatMessage (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES ChatSession(session_id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_college_code ON College(code);
CREATE INDEX idx_college_active ON College(is_active);
CREATE INDEX idx_course_college ON Course(college_id);
CREATE INDEX idx_useraccount_college ON UserAccount(college_id);
CREATE INDEX idx_fees_course ON Fees(course_id);
CREATE INDEX idx_cutoff_course ON Cutoff(course_id);
CREATE INDEX idx_admission_course ON AdmissionSchedule(course_id);
CREATE INDEX idx_chat_session ON ChatMessage(session_id);

-- ============================================================
-- VIEWS (Safety Policies - Public Read Only)
-- ============================================================

CREATE OR REPLACE VIEW vw_public_college_info AS
SELECT 
    c.id, c.name, c.code, c.city, c.district,
    c.state, c.college_type, c.website, c.email, c.phone
FROM College c
WHERE c.is_active = true;

CREATE OR REPLACE VIEW vw_public_course_fees AS
SELECT 
    c.id AS college_id,
    c.name AS college_name,
    c.code AS college_code,
    c.city,
    c.district,
    cr.id AS course_id,
    cr.name AS course_name,
    cr.branch,
    cr.duration_years,
    cr.intake_capacity,
    f.tuition_fee,
    f.hostel_fee,
    f.other_fee,
    f.currency
FROM College c
JOIN Course cr ON cr.college_id = c.id
LEFT JOIN Fees f ON f.course_id = cr.id
WHERE c.is_active = true;

CREATE OR REPLACE VIEW vw_public_cutoffs AS
SELECT 
    c.name AS college_name,
    c.code AS college_code,
    cr.name AS course_name,
    cr.branch,
    cu.academic_year,
    cu.category,
    cu.opening_rank,
    cu.closing_rank
FROM Cutoff cu
JOIN Course cr ON cu.course_id = cr.id
JOIN College c ON cr.college_id = c.id
WHERE c.is_active = true;

CREATE OR REPLACE VIEW vw_public_admission_schedule AS
SELECT 
    c.name AS college_name,
    c.code AS college_code,
    cr.name AS course_name,
    cr.branch,
    a.academic_year,
    a.start_date,
    a.end_date,
    a.admission_link
FROM AdmissionSchedule a
JOIN Course cr ON a.course_id = cr.id
JOIN College c ON cr.college_id = c.id
WHERE c.is_active = true;

-- ============================================================
-- DATABASE USER & PRIVILEGES (Safety Policies)
-- ============================================================

CREATE USER IF NOT EXISTS 'dte_app'@'localhost' IDENTIFIED BY 'dte_secure_app_pass_2024!';

GRANT SELECT ON dte_rajasthan.vw_public_college_info TO 'dte_app'@'localhost';
GRANT SELECT ON dte_rajasthan.vw_public_course_fees TO 'dte_app'@'localhost';
GRANT SELECT ON dte_rajasthan.vw_public_cutoffs TO 'dte_app'@'localhost';
GRANT SELECT ON dte_rajasthan.vw_public_admission_schedule TO 'dte_app'@'localhost';

GRANT SELECT, INSERT, UPDATE ON dte_rajasthan.College TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON dte_rajasthan.UserAccount TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON dte_rajasthan.Course TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON dte_rajasthan.Hostel TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON dte_rajasthan.Fees TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON dte_rajasthan.AdmissionSchedule TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON dte_rajasthan.Cutoff TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON dte_rajasthan.ChatSession TO 'dte_app'@'localhost';
GRANT SELECT, INSERT, DELETE ON dte_rajasthan.ChatMessage TO 'dte_app'@'localhost';

FLUSH PRIVILEGES;

-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS before_college_delete;
DROP TRIGGER IF EXISTS before_update_user;

DELIMITER //

CREATE TRIGGER before_college_delete
BEFORE DELETE ON College
FOR EACH ROW
BEGIN
    IF OLD.is_active = true THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete an active college. Deactivate it first.';
    END IF;
END//

CREATE TRIGGER before_update_user
BEFORE UPDATE ON UserAccount
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO College (name, code, city, district, state, college_type, website, email, phone)
VALUES 
('Government Engineering College, Ajmer', 'GEC-AJM', 'Ajmer', 'Ajmer', 'Rajasthan', 'Government', 'https://gecajmer.ac.in', 'principal@gecajmer.ac.in', '0145-2631234'),
('Government Polytechnic College, Jaipur', 'GPC-JPR', 'Jaipur', 'Jaipur', 'Rajasthan', 'Polytechnic', 'https://gpcjaipur.ac.in', 'info@gpcjaipur.ac.in', '0141-2741234');

INSERT INTO Course (college_id, name, branch, duration_years, intake_capacity)
VALUES 
(1, 'B.Tech', 'Computer Science & Engineering', 4, 60),
(1, 'B.Tech', 'Mechanical Engineering', 4, 60),
(2, 'Diploma', 'Electronics & Communication', 3, 60);

INSERT INTO Fees (course_id, tuition_fee, hostel_fee, other_fee)
VALUES 
(1, 65000, 30000, 5000),
(2, 60000, 30000, 5000),
(3, 35000, 25000, 3000);

INSERT INTO Cutoff (course_id, academic_year, category, opening_rank, closing_rank)
VALUES 
(1, '2023-2024', 'General', 100, 5000),
(1, '2023-2024', 'OBC', 200, 8000),
(1, '2023-2024', 'SC', 500, 12000),
(2, '2023-2024', 'General', 300, 7000);

INSERT INTO AdmissionSchedule (course_id, academic_year, start_date, end_date, admission_link)
VALUES 
(1, '2024-2025', '2024-06-01', '2024-07-31', 'https://techadmission.rajasthan.gov.in'),
(2, '2024-2025', '2024-06-01', '2024-07-31', 'https://techadmission.rajasthan.gov.in');

-- Verify
SELECT 'All tables created successfully!' AS Status;
SHOW TABLES;